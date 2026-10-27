-- Google アカウントでログインしたユーザー
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  -- Google アカウントの ID(ID トークンの sub)。メールアドレスは変わりうるので、こちらで本人を見分ける
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  -- プロフィール画像の URL。Google 側で設定されていなければ NULL
  picture TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ログイン中のセッション。id は Cookie に入れたトークンそのものではなく、その SHA-256(16 進)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- 有効期限(UNIX 時間のミリ秒)
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);
