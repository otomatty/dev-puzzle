import { createAuthClient } from "better-auth/client";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

/**
 * ログイン状態。ログインは任意で、していなくてもすべてのステージを遊べる。
 * ログインやセッションの確認は Better Auth のクライアントで Worker の /api/auth/* に問い合わせる。
 */

export const authClient = createAuthClient({
  fetchOptions: {
    // テストで差し替えられるよう、呼ぶたびにその時点の fetch を使う
    customFetchImpl: (input, init) => fetch(input, init),
  },
});

export type User = typeof authClient.$Infer.Session.user;

export type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; user: User };

interface Auth {
  state: AuthState;
  /** ログインに失敗した(Google から失敗して戻ってきた、または始められなかった) */
  loginFailed: boolean;
  dismissLoginFailed: () => void;
  /** Google の画面に移る(移れたら true)。ログインが終わると returnTo の画面に戻る */
  signIn: (returnTo: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<Auth>({
  state: { status: "loading" },
  loginFailed: false,
  dismissLoginFailed: () => {},
  signIn: async () => false,
  signOut: async () => {},
});

/**
 * Better Auth はログインに失敗すると、元の画面に ?error=<理由> を付けて戻す。
 * Google の画面でキャンセルしただけ(access_denied)なら、失敗の案内は出さない。
 */
function loginErrorInUrl(): string | null {
  return new URLSearchParams(window.location.search).get("error");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const [loginError] = useState(loginErrorInUrl);
  const [loginFailed, setLoginFailed] = useState(
    () => loginError !== null && loginError !== "access_denied",
  );

  // 確かめられなかったときも、ログインし直せるよう未ログインとして扱う
  useEffect(() => {
    const controller = new AbortController();
    authClient.getSession({ fetchOptions: { signal: controller.signal } }).then(
      ({ data }) => {
        if (controller.signal.aborted) return;
        setState(data ? { status: "signedIn", user: data.user } : { status: "signedOut" });
      },
      () => {
        if (!controller.signal.aborted) setState({ status: "signedOut" });
      },
    );
    return () => controller.abort();
  }, []);

  // 再読み込みで同じ案内が出ないよう、URL からは消しておく
  useEffect(() => {
    if (loginError === null) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    url.searchParams.delete("error_description");
    window.history.replaceState(null, "", url);
  }, [loginError]);

  // Better Auth のクライアントは、エラーの応答なら error を返し、通信できなければ例外を投げる
  const signIn = useCallback(async (returnTo: string) => {
    const url = await authClient.signIn
      .social({
        provider: "google",
        callbackURL: returnTo,
        errorCallbackURL: returnTo,
        // Google の画面への移動はこちらで行う
        disableRedirect: true,
      })
      .then(
        ({ data }) => data?.url,
        () => undefined,
      );
    if (!url) {
      setLoginFailed(true);
      return false;
    }
    window.location.assign(url);
    return true;
  }, []);

  const signOut = useCallback(async () => {
    const ok = await authClient.signOut().then(
      ({ error }) => !error,
      () => false,
    );
    // 失敗したらログイン中のまま。もう一度押せばやり直せる
    if (ok) setState({ status: "signedOut" });
  }, []);

  const dismissLoginFailed = useCallback(() => setLoginFailed(false), []);

  return (
    <AuthContext.Provider value={{ state, loginFailed, dismissLoginFailed, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): Auth {
  return useContext(AuthContext);
}
