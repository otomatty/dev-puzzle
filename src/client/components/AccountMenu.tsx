import { useState } from "react";
import type { User } from "../../shared/api";
import { loginUrl } from "../api";
import { useAuth } from "../auth";
import { usePathname } from "../router";
import { GoogleLogo } from "./icons";

function Avatar({ user }: { user: User }) {
  const [broken, setBroken] = useState(false);
  if (user.picture && !broken) {
    return (
      <img
        className="account-avatar"
        src={user.picture}
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

/** ヘッダーのログイン・ログアウト */
export function AccountMenu() {
  const { state, logout } = useAuth();
  const pathname = usePathname();

  if (state.status === "loading") return null;
  if (state.status === "signedOut") {
    // Worker から Google の画面に移るので、アプリ内の Link ではなく普通のリンクにする。
    // 狭い画面では「Google で」を隠すので、読み上げ用の名前は aria-label で固定する
    return (
      <a className="button google-login" href={loginUrl(pathname)} aria-label="Google でログイン">
        <GoogleLogo />
        <span>
          <span className="google-login-prefix">Google で</span>ログイン
        </span>
      </a>
    );
  }
  return (
    <div className="account">
      <Avatar user={state.user} />
      <span className="account-name">{state.user.name}</span>
      <button type="button" className="button button--quiet" onClick={logout}>
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
