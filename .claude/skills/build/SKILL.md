---
name: build
description: Build and package Claude Inspector as a distributable Electron app (.dmg / .exe)
user-invocable: true
---

## Claude Inspector Build

```bash
npm run dist        # current platform (macOS → .dmg)
npm run dist:mac    # macOS arm64 + x64 .dmg
npm run dist:win    # Windows .exe (NSIS)
```

Output: `release/` directory

## Pre-build checklist
- Run `npm start` to verify the app works end-to-end
- Run `git status` to confirm no uncommitted changes

## Current state
- Version: !`node -e "const p=require('./package.json');console.log(p.version)"`
- Branch: !`git branch --show-current`
- Uncommitted: !`git diff --name-only HEAD 2>/dev/null | wc -l | tr -d ' '` files
