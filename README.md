# JuryMAP

A solo-use, offline-first Louisiana criminal voir dire companion: juror notes,
strike tracking with Batson analysis, and PDF record-of-voir-dire generation.

The app ships in three runtimes from the same React + TypeScript codebase:

- **Web / PWA** — `npm run dev` and `npm run build`
- **Desktop (macOS, Windows, Linux)** — via Tauri 2 (`npm run tauri:dev`)
- **iOS / iPadOS** — via Capacitor 8 (`npx cap run ios`)

## Apple Silicon (M1 / M2 / M3 / M4 / M5) install guide

Everything in this repo builds natively on arm64 — no Rosetta required.

### Easy path: one-shot install script

```bash
git clone --branch claude/apple-silicon-compatibility-P7XK8 \
  https://github.com/cwashingtonlaw/jurymap.git ~/Developer/jurymap
bash ~/Developer/jurymap/scripts/install-mac.sh
```

`scripts/install-mac.sh` installs Homebrew, Xcode CLT, Node, Rust, then
builds `JuryMAP.app` and offers to copy it into `/Applications`. It's
idempotent — safe to re-run if anything fails partway. See the manual
steps below if you'd rather drive each command yourself.

### 1. Prerequisites

Install via [Homebrew](https://brew.sh) (the native arm64 build):

```bash
# Node 20.19+ (LTS). Tauri 2 and Vite 6 both require >= 20.19.
brew install node

# Rust toolchain — needed for the desktop (Tauri) build only.
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup default stable
rustup target add aarch64-apple-darwin   # Apple Silicon native target

# Xcode + command-line tools — needed for the iOS build only.
xcode-select --install
# Then install Xcode from the App Store and open it once to accept the license.

# CocoaPods — Capacitor iOS uses Swift Package Manager, but CocoaPods is
# still useful if you add legacy plugins.
brew install cocoapods
```

Verify the toolchain reports `arm64` / `aarch64`:

```bash
node -p "process.arch"        # -> arm64
rustc -vV | grep host         # -> host: aarch64-apple-darwin
uname -m                      # -> arm64
```

### 2. Clone and install

```bash
git clone https://github.com/cwashingtonlaw/jurymap.git
cd jurymap
npm install
```

> Tip: keep the project **outside** iCloud Drive. iCloud will try to sync
> `node_modules/` and Rust `target/` directories and that will slow your
> Mac to a crawl. `~/Developer/jurymap` is a good location.

If you must keep the project inside iCloud Drive, redirect Rust build
artifacts elsewhere by exporting `CARGO_TARGET_DIR` in your shell profile:

```bash
export CARGO_TARGET_DIR="$HOME/.cache/jury-selection/target"
```

### 3. Run it

```bash
# Web / PWA in your browser
npm run dev                  # -> http://localhost:5173

# Native macOS desktop app (Tauri)
npm run tauri:dev

# iOS / iPadOS in the Xcode simulator or on a tethered device
npm run build                # build web assets into dist/
npx cap sync ios             # copy dist/ into the Xcode project
npx cap open ios             # opens Xcode — pick a simulator and Run
```

### 4. Production builds

```bash
npm run build                # web bundle into dist/
npm run tauri:build          # signed/unsigned .app + .dmg in src-tauri/target
```

Tauri's macOS bundle is built for the current host architecture by default,
so an Apple Silicon Mac produces an arm64 `.app`. To produce a universal
binary, build twice and lipo-merge, or pass `--target universal-apple-darwin`
after running `rustup target add x86_64-apple-darwin aarch64-apple-darwin`.

## Scripts

| Script             | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `npm run dev`      | Vite dev server (web)                                |
| `npm run build`    | Type-check + production web bundle                   |
| `npm run preview`  | Serve the production bundle locally                  |
| `npm run lint`     | ESLint                                               |
| `npm run typecheck`| `tsc -b --noEmit`                                    |
| `npm test`         | Vitest (unit + component)                            |
| `npm run test:e2e` | Playwright (Chromium)                                |
| `npm run tauri:dev`| Run the desktop app against the Vite dev server      |
| `npm run tauri:build` | Build the desktop `.app` / `.dmg`                 |

## Troubleshooting on Apple Silicon

- **`error: linker 'cc' not found` from Tauri**: run `xcode-select --install`.
- **`rustc` is x86_64 under Rosetta**: reinstall rustup in a native arm64
  terminal (`arch` should print `arm64`), then `rustup default stable`.
- **Xcode build fails with "device not supported"**: make sure your iPad/iPhone
  is on iOS 15 or newer. The Info.plist sets `arm64` as the required device
  capability; legacy 32-bit (armv7) devices are not supported.
- **iCloud Drive eats your battery**: see the `CARGO_TARGET_DIR` tip above, or
  move the project to `~/Developer`.

## Tech stack

- React 19 + TypeScript 5.7
- Vite 6, Tailwind v4, Vitest 4, Playwright
- Dexie (IndexedDB) for offline storage
- Zustand for state, Immer for immutable updates
- `@react-pdf/renderer` for PDF generation
- Tauri 2 (desktop) and Capacitor 8 (iOS)
