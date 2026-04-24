---
name: deploy
description: Claude Inspector macOS deployment skill. Full flow: build (code signing + notarization) → GitHub Release → Homebrew cask update. Use this skill for any deployment-related requests.
---

# Claude Inspector Deployment

## Prerequisites
- `.env` file has `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` set
- `gh` CLI is authenticated (`gh auth status`)
- No uncommitted changes

---

## Step 1: Verify version

```bash
node -e "console.log(require('./package.json').version)"
```

If the user specified a version, update the `version` field in `package.json`, then commit and push:

```bash
git add package.json
git commit -m "chore: bump version to X.X.X"
git push
```

---

## Step 2: Build (with code signing + notarization)

⚠️ `npm run dist:mac` does NOT trigger the `predist` lifecycle hook.
Run `predist` manually first so the correct version is written to `public/build-info.json`.

```bash
source .env && npm run predist && npm run dist:mac
```

- `predist`: writes current package.json version + git hash to `public/build-info.json`
- `dist:mac`: builds arm64 + x64 DMGs with code signing
- `afterSign` hook (`scripts/notarize.js`): handles Apple notarization automatically

Takes 5–10 minutes. Includes waiting on Apple's servers.

After build, verify files and version:
```bash
ls release/Claude-Inspector-{VERSION}-*.dmg
cat public/build-info.json  # confirm version matches the release version
```

Expected: `Claude-Inspector-X.X.X-arm64.dmg` and `Claude-Inspector-X.X.X-x64.dmg`, with `build-info.json` version matching X.X.X

---

## Step 3: Compute SHA256

```bash
shasum -a 256 "release/Claude-Inspector-{VERSION}-arm64.dmg"
shasum -a 256 "release/Claude-Inspector-{VERSION}-x64.dmg"
```

Note both values.

---

## Step 4: Create GitHub Release + upload DMGs

```bash
gh release create v{VERSION} \
  "release/Claude-Inspector-{VERSION}-arm64.dmg" \
  "release/Claude-Inspector-{VERSION}-x64.dmg" \
  --title "v{VERSION}" \
  --notes "## Changes\n- update details here"
```

Fill in `--notes` with actual changes. Check commits since last tag:
```bash
git log $(git describe --tags --abbrev=0 2>/dev/null || echo "")..HEAD --oneline 2>/dev/null || git log --oneline -10
```

---

## Step 5: Update Homebrew cask

Update **both** the in-project cask file and the actual tap directory.

### 5-1. Update in-project cask
In `homebrew-tap/Casks/claude-inspector.rb`:
- `version "X.X.X"` → new version
- `sha256` in `on_arm` block → arm64 SHA256
- `sha256` in `on_intel` block → x64 SHA256

### 5-2. Copy to actual tap directory
```bash
HOMEBREW_TAP="$(brew --repository)/Library/Taps/kangraemin/homebrew-tap"
cp homebrew-tap/Casks/claude-inspector.rb "$HOMEBREW_TAP/Casks/claude-inspector.rb"
```

### 5-3. Commit and push from tap directory
```bash
cd "$(brew --repository)/Library/Taps/kangraemin/homebrew-tap"
git add Casks/claude-inspector.rb
git commit -m "chore: claude-inspector X.X.X"
git push
cd -
```

---

## Step 6: Verify

```bash
brew update && brew info --cask claude-inspector
```

Success when the new version is shown.

---

## Notes
- Filter by version name exactly — the `release/` directory may contain DMGs from previous versions
- Notarization can fail depending on Apple server status → retry: `source .env && npm run predist && npm run dist:mac`
- `dist:mac` does not auto-run the predist lifecycle — always run `predist` manually first
- `gh release create` auto-creates a tag if it doesn't exist; errors if tag already exists → `gh release delete v{VERSION}` then retry
