# Module 3.1 — Scaffold + Design System: Progress

**Status:** done (awaiting review)
**Last updated:** 2026-11-15
**Blockers:** none

## Verification
- `npm run typecheck` (route types + `tsc --noEmit`) clean · `npm run lint` clean · `next build` clean (all routes static)
- Security headers present on every response (checked with `curl -I`); no `X-Powered-By`
- Visual check on the production build (`next start`) with a temporary `/kit` page:
  - desktop 1440px light + dark, emulated phone 390px (Chrome DevTools Protocol device emulation, touch on)
  - dialog (desktop + mobile bottom sheet), toasts, open Select listbox, date-range popover (desktop + phone)
  - phone layout: `scrollWidth === 390` (no horizontal scrolling)
- Scripted keyboard check: Select opens on the current value, arrows / type-ahead move the highlight, Enter chooses and keeps focus on the trigger; in a dialog the app root is `inert`, focus is inside, the first Escape closes only the listbox, the second closes the dialog and focus returns to the opener
- Found and fixed during the check: phone numbers / dates wrapping in table cells; the date-range trigger stretching full width on desktop; two quick Arrow-Down presses moving the highlight once (functional state updates); text inputs auto-focused in dialogs on touch screens (popped the keyboard over the sheet)
- `/kit` deleted afterwards (as planned)

## Environment notes
- Headless Chrome on Windows can't make a window narrower than ~500px, so `--window-size=390,…` screenshots are misleading: use DevTools-protocol device emulation for phone checks
- ESLint stays on 9.x: ESLint 10 works, but `eslint-plugin-react` / `jsx-a11y` / `import` (inside `eslint-config-next`) don't support it yet
