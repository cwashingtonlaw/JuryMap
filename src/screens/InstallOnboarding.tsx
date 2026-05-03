import { Link } from 'react-router-dom';
import { detectPlatform } from '../lib/platform';
import ThemeToggle from '../components/ThemeToggle';

export default function InstallOnboarding() {
  const p = detectPlatform();

  return (
    <div className="min-h-full bg-[var(--bg-body)]">
      <header className="border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Install the Jury Selection app</h1>
        <div className="flex gap-3 items-center">
          <ThemeToggle />
          <Link
            to="/cases"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Skip for now
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-8">
        <p className="text-sm text-slate-700 mb-6">
          Install this web app to your home screen (iPad) or applications folder
          (laptop). Installation keeps your local data (cases, notes, strikes)
          safe from browser cache eviction and gives you a full-screen,
          distraction-free view in court.
        </p>

        {(p.family === 'ipados' || p.family === 'ios') &&
          p.browser === 'safari' && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-2">
                iPad / iPhone (Safari)
              </h2>
              <ol className="list-decimal ml-5 text-sm text-slate-700 space-y-1">
                <li>Tap the <strong>Share</strong> icon at the bottom (or top-right) of Safari.</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                <li>Confirm the name and tap <strong>Add</strong>.</li>
                <li>Open the app from your home screen for normal use.</li>
              </ol>
              <p className="text-xs text-slate-500 mt-2">
                <strong>Why it matters:</strong> Non-installed Safari can evict IndexedDB
                storage under pressure or after ~7 days of inactivity. An
                installed PWA has stable storage.
              </p>
            </section>
          )}

        {(p.family === 'macos' || p.family === 'windows' || p.family === 'linux') &&
          (p.browser === 'chrome' || p.browser === 'edge') && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-2">
                Chrome / Edge (desktop)
              </h2>
              <ol className="list-decimal ml-5 text-sm text-slate-700 space-y-1">
                <li>
                  Look for an <strong>Install</strong> icon in the URL bar (a
                  screen with a down-arrow) or open the three-dot menu.
                </li>
                <li>
                  Click <strong>Install Jury Selection…</strong>. Confirm the
                  install dialog.
                </li>
                <li>
                  The app now opens in its own window; pin it to the Dock or
                  taskbar for quick access.
                </li>
              </ol>
            </section>
          )}

        {!(p.family === 'ipados' || p.family === 'ios' || p.family === 'macos' || p.family === 'windows' || p.family === 'linux') && (
          <section className="mb-8">
            <p className="text-sm text-slate-700">
              Your browser may or may not support installing this app. Look for
              an install option in the address bar or the browser menu.
            </p>
          </section>
        )}

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">After installing</h2>
          <ol className="list-decimal ml-5 text-sm text-slate-700 space-y-1">
            <li>Open the app from the home screen / applications, not through the browser URL.</li>
            <li>Run the dry-run checklist on the Help screen before your first trial use.</li>
          </ol>
        </section>

        <div>
          <Link
            to="/cases"
            className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Continue to the app
          </Link>
        </div>
      </div>
    </div>
  );
}
