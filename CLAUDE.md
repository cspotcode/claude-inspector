# Claude Inspector

## UI Bug Fix Principles

1. **Diagnose first, fix once**: Analyze the full parent→child CSS/style chain and identify the root cause before making any change. No trial-and-error ("add a property, see if it works, add another").
2. **Confirm before committing**: Restart app → user confirms fix → commit. A "fix" commit must not be pushed while the bug is still present.
3. **Simplest solution first**: If the user suggests a simple direction, follow it. `display:block + overflow-y:auto` may be better than a flex trick.

## proxyDetailView Structure

- `#proxyDetailView` has inline style: `flex:1;overflow:hidden;display:flex;flex-direction:column`
- **Messages tab**: switch the whole container with `container.style.cssText = 'display:block;overflow-y:auto'` (partial override won't work)
- **Switching to other tabs**: restore original flex styles via `cssText`
