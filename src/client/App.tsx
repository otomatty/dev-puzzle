import { PlayPage } from "./pages/PlayPage";
import { PuzzleListPage } from "./pages/PuzzleListPage";
import { Link, matchRoute, usePathname } from "./router";
import { SettingsProvider, useSettings } from "./settings";

function ColorAssistToggle() {
  const { colorAssist, setColorAssist } = useSettings();
  return (
    <label className="toggle">
      <input
        type="checkbox"
        role="switch"
        aria-checked={colorAssist}
        checked={colorAssist}
        onChange={(event) => setColorAssist(event.target.checked)}
      />
      <span>色を形でも表示</span>
    </label>
  );
}

function Routes() {
  const route = matchRoute(usePathname());
  switch (route.name) {
    case "list":
      return <PuzzleListPage />;
    case "play":
      return <PlayPage id={route.id} />;
    default:
      return (
        <div className="page-message">
          <p>このページは見つかりません。</p>
          <Link href="/">ステージ一覧へ</Link>
        </div>
      );
  }
}

export function App() {
  return (
    <SettingsProvider>
      <div className="app">
        <header className="app-header">
          <Link className="wordmark" href="/">
            DevPuzzle
          </Link>
          <ColorAssistToggle />
        </header>
        <main className="app-main">
          <Routes />
        </main>
      </div>
    </SettingsProvider>
  );
}
