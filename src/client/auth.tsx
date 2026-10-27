import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "../shared/api";
import { fetchMe, logout as requestLogout } from "./api";

/**
 * ログイン状態。ログインは任意で、していなくてもすべてのステージを遊べる。
 * セッションは HttpOnly の Cookie にあるので、状態は /api/me に問い合わせて知る。
 */

export type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; user: User };

interface Auth {
  state: AuthState;
  /** Google のログインから失敗して戻ってきた */
  loginFailed: boolean;
  dismissLoginFailed: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<Auth>({
  state: { status: "loading" },
  loginFailed: false,
  dismissLoginFailed: () => {},
  logout: async () => {},
});

/** Worker はログインに失敗すると、元の画面に ?login=failed を付けて戻す */
function isLoginFailedUrl(): boolean {
  return new URLSearchParams(window.location.search).get("login") === "failed";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const [loginFailed, setLoginFailed] = useState(isLoginFailedUrl);

  useEffect(() => {
    const controller = new AbortController();
    fetchMe(controller.signal).then(
      (user) => {
        if (!controller.signal.aborted) {
          setState(user ? { status: "signedIn", user } : { status: "signedOut" });
        }
      },
      () => {
        // 確かめられなかったときも、ログインし直せるよう未ログインとして扱う
        if (!controller.signal.aborted) setState({ status: "signedOut" });
      },
    );
    return () => controller.abort();
  }, []);

  // 再読み込みで同じ案内が出ないよう、URL からは消しておく
  useEffect(() => {
    if (!loginFailed) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("login");
    window.history.replaceState(null, "", url);
  }, [loginFailed]);

  const logout = useCallback(async () => {
    try {
      await requestLogout();
      setState({ status: "signedOut" });
    } catch {
      // 失敗したらログイン中のまま。もう一度押せばやり直せる
    }
  }, []);

  const dismissLoginFailed = useCallback(() => setLoginFailed(false), []);

  return (
    <AuthContext.Provider value={{ state, loginFailed, dismissLoginFailed, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): Auth {
  return useContext(AuthContext);
}
