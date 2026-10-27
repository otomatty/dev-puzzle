import { useState } from "react";
import { type User, useAuth } from "../auth";
import { usePathname } from "../router";
import { GoogleLogo } from "./icons";

function Avatar({ user }: { user: User }) {
  const [broken, setBroken] = useState(false);
  if (user.image && !broken) {
    return (
      <img
        className="account-avatar"
        src={user.image}
        alt=""
        width={32}
        height={32}
        // Google のプロフィール画像は、Referer を送ると表示できないことがある
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span className="account-avatar" aria-hidden="true">
      {[...user.name][0]}
    </span>
  );
}

/** Google でログインするボタン。ログインが終わると今の画面に戻ってくる */
export function GoogleLoginButton() {
  const { signIn } = useAuth();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    // Google の画面に移るときは押せないままでよい。始められなかったときだけ戻す
    if (!(await signIn(pathname))) setPending(false);
  };

  return (
    <button type="button" className="button google-login" disabled={pending} onClick={handleClick}>
      <GoogleLogo />
      <span>Google でログイン</span>
    </button>
  );
}

/** ヘッダーの名前とログアウト。ログインしていなければログイン画面にボタンがあるので、ここには何も出さない */
export function AccountMenu() {
  const { state, signOut } = useAuth();
  if (state.status !== "signedIn") return null;
  return (
    <div className="account">
      <Avatar user={state.user} />
      <span className="account-name">{state.user.name}</span>
      <button type="button" className="button button--quiet" onClick={signOut}>
        ログアウト
      </button>
    </div>
  );
}

/** Google のログインから失敗して戻ってきたときの案内 */
export function LoginFailedNotice() {
  const { loginFailed, dismissLoginFailed } = useAuth();
  if (!loginFailed) return null;
  return (
    <div className="notice" role="alert">
      <p>Google でログインできませんでした。もう一度お試しください。</p>
      <button type="button" className="button button--quiet" onClick={dismissLoginFailed}>
        閉じる
      </button>
    </div>
  );
}
