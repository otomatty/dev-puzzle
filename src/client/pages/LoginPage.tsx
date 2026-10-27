import { useEffect } from "react";
import { GoogleLoginButton } from "../components/AccountMenu";

/** ログインしていないときは、どの画面を開いてもこれを出す */
export function LoginPage() {
  useEffect(() => {
    document.title = "ログイン | DevPuzzle";
  }, []);

  return (
    <div className="login">
      <h1 className="login-title">ログインして遊ぶ</h1>
      <p>
        ロボットに命令を並べて、盤面の星をすべて集めるプログラミングパズルです。遊ぶには Google
        アカウントでログインしてください。
      </p>
      <GoogleLoginButton />
    </div>
  );
}
