# Before / After proof for the Pages showcase polish in #23

Screenshot proof for
[Sdefendre/traces-app #23](https://github.com/Sdefendre/traces-app/pull/23)
(`showcase/traces-public-readiness`, commit `55223fa`). The PR diff is
docs-only: `docs/index.html` (+7) and `docs/styles.css` (+72). It adds a
product-principles strip under the hero (plus a blue eyebrow line above the
H1) and visible `:focus-visible` outlines on links and buttons.

Feature: `pages-hero`, `pages-local-docs` in `features/pages-site.md`.

## How these were captured

Captured 2026-09-08 with headless Google Chrome 148.0.7778.96 driven by
Playwright, on this Cloud Agent VM. No Electron; the Pages site is the surface
under test. Same browser, `deviceScaleFactor: 1`, `--hide-scrollbars`,
`document.fonts.ready` awaited, CSS animations frozen for every pair.

- **Before** = live production Pages, https://sdefendre.github.io/traces-app/,
  loaded at capture time. Production `index.html` and `styles.css` were fetched
  with `curl` and are byte-identical to `main` (`cfad153`) `docs/`, so the
  baseline is unambiguous.
- **After** = this branch's `docs/` at `55223fa`, served locally with
  `python3 -m http.server` from `docs/`. A local serve proves the branch copy,
  not that Pages deployed.

Viewports: desktop 1280 x 900 CSS px; mobile 390 x 844 CSS px. Both shots of
a pair are the top of the page at `scrollY = 0`.

`report.json` holds the per-shot geometry and computed styles the numbers
below come from (URL, viewport, `.eyebrow` / `.principles` rects, and the
`outline-*` computed style of `document.activeElement`).

## 1. Principles strip (`principles/`)

What changed: an eyebrow `A DESKTOP WORKSPACE, NOT A CLOUD VAULT` above the
H1, and a three-item `.principles` strip (`Plain markdown`,
`Visible connections`, `Bring your own AI`) between the hero CTAs and the app
mock-up. Below 720px the strip stacks to one column.

| | `.eyebrow` | `.principles` | items |
| --- | --- | --- | --- |
| Before, desktop | absent | absent | 0 |
| After, desktop | y 92–109 | y 360–457, 1240 wide, 3 columns | 3 |
| Before, mobile | absent | absent | 0 |
| After, mobile | y 82–99 | y 310–580, 362 wide, 1 column | 3 |

Files: `before-desktop.png`, `after-desktop.png`, `before-mobile.png`,
`after-mobile.png`.

## 2. Keyboard focus (`focus/`)

What changed: `a:focus-visible, button:focus-visible { outline: 2px solid
var(--blue); outline-offset: 3px; }`. Before, the page had no focus rule, so
the ring was Chrome's user-agent default.

Driver: click at (5,5) on the dark background to put focus in the document,
then `Tab`, `Tab` lands on `View on GitHub` (`.btn-primary`). Two more `Tab`
presses land on the `Copy` button (`[data-copy]`), the only `<button>` on
the page; it was scrolled to the centre before the shot. `:focus-visible`
matched the active element in every case.

| Control | Before computed outline | After computed outline |
| --- | --- | --- |
| `View on GitHub` (`a`) | `auto 1px rgb(16, 16, 16)`, offset 1px (UA default) | `solid 2px rgb(74, 144, 247)`, offset 3px |
| `Copy` (`button`) | `auto 1px rgb(16, 16, 16)`, offset 0px (UA default) | `solid 2px rgb(74, 144, 247)`, offset 3px |

Files: `before-cta.png`, `after-cta.png` (full 1280 x 900 desktop viewport,
`View on GitHub` focused), `before-cta-2x.png`, `after-cta-2x.png`,
`before-copy-2x.png`, `after-copy-2x.png` (crops of the focused control at
`deviceScaleFactor: 2`; identical CSS layout, only the pixel density differs).

## Notes

- The Before focus ring is not "no ring": it is Chrome's default `outline:
  auto`, a thin dark/white ring tight to the element, which varies by browser.
  The After ring is the brand blue at a fixed 2px / 3px offset on both links
  and buttons.
- No product code was changed for these captures. The local server and the
  Playwright install lived under `/tmp` and are not part of this commit.
