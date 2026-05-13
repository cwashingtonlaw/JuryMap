#!/usr/bin/env bash
#
# install-mac.sh — One-shot installer for JuryMAP on Apple Silicon Macs.
#
# What it does, in order, idempotently:
#   1. Verifies you're on macOS arm64 (M1/M2/M3/M4/M5) and not running under Rosetta.
#   2. Installs Homebrew if missing.
#   3. Installs Xcode Command Line Tools if missing (will pause for the GUI prompt).
#   4. Installs Node.js (LTS) and git via Homebrew.
#   5. Installs the Rust toolchain via rustup.
#   6. Clones the JuryMAP repo into ~/Developer/jurymap (or reuses an existing checkout).
#   7. Runs `npm install` and `npm run tauri:build`.
#   8. Offers to copy the built JuryMAP.app into /Applications.
#
# Safe to re-run — each step is skipped if already done.
#
# Usage:
#   bash install-mac.sh
#
# Or one-liner (after the branch is merged to main):
#   curl -fsSL https://raw.githubusercontent.com/cwashingtonlaw/jurymap/main/scripts/install-mac.sh | bash

set -euo pipefail

# ----- pretty output ---------------------------------------------------------
BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'
YELLOW=$'\033[33m'; BLUE=$'\033[34m'; RESET=$'\033[0m'
step()   { printf "\n${BOLD}${BLUE}==>${RESET} ${BOLD}%s${RESET}\n" "$*"; }
info()   { printf "    %s\n" "$*"; }
warn()   { printf "${YELLOW}    warning:${RESET} %s\n" "$*"; }
ok()     { printf "${GREEN}    ok:${RESET} %s\n" "$*"; }
die()    { printf "\n${RED}${BOLD}error:${RESET} %s\n" "$*" >&2; exit 1; }

# ----- 1. environment checks -------------------------------------------------
step "Checking your Mac"

[[ "$(uname -s)" == "Darwin" ]] || die "This script only runs on macOS. Detected: $(uname -s)"

ARCH="$(uname -m)"
if [[ "$ARCH" != "arm64" ]]; then
  warn "Detected $ARCH — this Mac is not Apple Silicon, or Terminal is running under Rosetta."
  warn "If this is an M-series Mac, quit Terminal, right-click Terminal in Finder → Get Info,"
  warn "uncheck 'Open using Rosetta', reopen Terminal, and run this script again."
  read -r -p "    Continue anyway? [y/N] " yn
  [[ "$yn" =~ ^[Yy]$ ]] || exit 1
else
  ok "macOS arm64 detected"
fi

MACOS_VER="$(sw_vers -productVersion)"
ok "macOS $MACOS_VER"

# ----- 2. Homebrew -----------------------------------------------------------
step "Installing Homebrew"

if command -v brew >/dev/null 2>&1; then
  ok "Homebrew already installed: $(brew --version | head -n1)"
else
  info "Homebrew not found — installing (you'll be prompted for your password)…"
  NONINTERACTIVE=1 /bin/bash -c \
    "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Ensure brew is on PATH for the rest of this script and future shells.
if [[ -x /opt/homebrew/bin/brew ]]; then
  BREW_PREFIX=/opt/homebrew
elif [[ -x /usr/local/bin/brew ]]; then
  BREW_PREFIX=/usr/local
  warn "Homebrew is at /usr/local (Intel layout). On Apple Silicon it should be /opt/homebrew."
else
  die "brew installed but not found on disk"
fi

eval "$("$BREW_PREFIX/bin/brew" shellenv)"

ZPROFILE="$HOME/.zprofile"
SHELLENV_LINE="eval \"\$($BREW_PREFIX/bin/brew shellenv)\""
if ! grep -Fqs "$SHELLENV_LINE" "$ZPROFILE" 2>/dev/null; then
  echo "$SHELLENV_LINE" >> "$ZPROFILE"
  ok "Added brew shellenv to $ZPROFILE"
fi

# ----- 3. Xcode Command Line Tools -------------------------------------------
step "Installing Xcode Command Line Tools"

if xcode-select -p >/dev/null 2>&1; then
  ok "Already installed at $(xcode-select -p)"
else
  info "A GUI dialog will appear asking you to install the Command Line Tools."
  info "Click 'Install', wait for it to finish, then come back to this terminal."
  xcode-select --install || true
  read -r -p "    Press Return once the install completes… " _
  xcode-select -p >/dev/null 2>&1 || die "Command Line Tools still not found"
  ok "Command Line Tools installed"
fi

# ----- 4. Node + git ---------------------------------------------------------
step "Installing Node.js and git"

for pkg in node git; do
  if brew list --formula | grep -qx "$pkg"; then
    ok "$pkg already installed"
  else
    info "Installing $pkg…"
    brew install "$pkg"
  fi
done

NODE_VER="$(node -p 'process.versions.node')"
NODE_MAJOR="${NODE_VER%%.*}"
if (( NODE_MAJOR < 20 )); then
  die "Node $NODE_VER is too old. JuryMAP needs Node 20.19+. Run: brew upgrade node"
fi
ok "Node $NODE_VER, npm $(npm -v)"

# ----- 5. Rust toolchain -----------------------------------------------------
step "Installing Rust toolchain"

if command -v rustc >/dev/null 2>&1 && command -v cargo >/dev/null 2>&1; then
  ok "Rust already installed: $(rustc --version)"
else
  info "Installing rustup (default profile, stable channel)…"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
fi

# shellcheck source=/dev/null
[[ -f "$HOME/.cargo/env" ]] && source "$HOME/.cargo/env"

RUST_HOST="$(rustc -vV | awk -F': ' '/^host:/ {print $2}')"
if [[ "$ARCH" == "arm64" && "$RUST_HOST" != "aarch64-apple-darwin" ]]; then
  warn "Rust host is $RUST_HOST, not aarch64-apple-darwin."
  warn "Reinstall rustup from a native arm64 shell to get the right toolchain."
fi
ok "Rust $(rustc --version | awk '{print $2}') ($RUST_HOST)"

# ----- 6. Clone repo ---------------------------------------------------------
REPO_URL="https://github.com/cwashingtonlaw/jurymap.git"
REPO_BRANCH="claude/apple-silicon-compatibility-P7XK8"
REPO_DIR="$HOME/Developer/jurymap"

step "Cloning JuryMAP"

mkdir -p "$HOME/Developer"

if [[ -d "$REPO_DIR/.git" ]]; then
  ok "Existing checkout at $REPO_DIR"
  info "Fetching latest…"
  git -C "$REPO_DIR" fetch origin
  git -C "$REPO_DIR" checkout "$REPO_BRANCH"
  git -C "$REPO_DIR" pull --ff-only origin "$REPO_BRANCH"
else
  git clone --branch "$REPO_BRANCH" "$REPO_URL" "$REPO_DIR"
fi

cd "$REPO_DIR"

# Warn loudly if the checkout is inside iCloud Drive.
case "$REPO_DIR" in
  *"Mobile Documents"*|*"iCloud Drive"*|*"/iCloud"*)
    warn "This checkout is inside iCloud Drive. iCloud will try to sync node_modules"
    warn "and Rust build artifacts — your Mac will get very slow."
    warn "Strongly recommend moving the project to ~/Developer/jurymap."
    ;;
esac

# ----- 7. Build --------------------------------------------------------------
step "Installing npm dependencies"
npm install

step "Building JuryMAP.app (this takes 5–10 min the first time)"
npm run tauri:build

# ----- 8. Locate the build output --------------------------------------------
APP_PATH=""
for candidate in \
  "$REPO_DIR/src-tauri/target/release/bundle/macos/JuryMAP.app" \
  "${CARGO_TARGET_DIR:-}/release/bundle/macos/JuryMAP.app"
do
  [[ -n "$candidate" && -d "$candidate" ]] && { APP_PATH="$candidate"; break; }
done

if [[ -z "$APP_PATH" ]]; then
  warn "Build finished but JuryMAP.app wasn't found in the expected locations."
  warn "Check: $REPO_DIR/src-tauri/target/release/bundle/"
  exit 0
fi

DMG_PATH="$(dirname "$(dirname "$APP_PATH")")/dmg"
ok "Built: $APP_PATH"
[[ -d "$DMG_PATH" ]] && ok "DMG:   $(find "$DMG_PATH" -name '*.dmg' -maxdepth 1 | head -n1)"

# ----- 9. Optional install into /Applications --------------------------------
step "Install to /Applications?"
read -r -p "    Copy JuryMAP.app to /Applications now? [Y/n] " yn
if [[ -z "$yn" || "$yn" =~ ^[Yy]$ ]]; then
  if [[ -d "/Applications/JuryMAP.app" ]]; then
    info "Removing existing /Applications/JuryMAP.app…"
    rm -rf "/Applications/JuryMAP.app"
  fi
  cp -R "$APP_PATH" /Applications/
  ok "Installed to /Applications/JuryMAP.app"
  info ""
  info "First launch: the bundle is unsigned, so macOS will refuse to open it"
  info "with double-click. Instead, right-click JuryMAP.app in /Applications,"
  info "choose Open, then click Open in the dialog. macOS only asks once."
  info ""
  info "Or launch from terminal: open /Applications/JuryMAP.app"
else
  info "Skipped. You can install it later with:"
  info "  cp -R \"$APP_PATH\" /Applications/"
fi

step "Done"
ok "JuryMAP is installed. Repo lives at $REPO_DIR for future updates."
