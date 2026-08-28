# Pages marketing site

The public site is static files in `docs/`, deployed to https://sdefendre.github.io/traces-app/. It describes Traces and how to clone it. It has no vault.

## Sub-features

- `pages-live` serves the live Pages URL.
- `pages-hero` shows the Traces hero and GitHub CTA.
- `pages-sections` exposes `#overview`, `#features`, and `#run`.
- `pages-clone` shows the clone and `pnpm dev` commands.
- `pages-copy` copies those commands from the `Copy` button.
- `pages-local-docs` can be checked from `docs/index.html` in this checkout when live Pages is enough or when you need the branch copy.

## How to get to it (user POV)

- Open https://sdefendre.github.io/traces-app/ in a browser.
- Choose `Clone and run` or scroll to `#run`.
- Choose `View on GitHub` or the footer GitHub link.
- Choose `Copy` next to the clone commands.

## Driving it with verify-traces

Preconditions:

- Network can reach `sdefendre.github.io`. This check does not launch Electron and does not need `run.env`.
- Do not send vault files anywhere.

- **Live fetch.** Run `.cursor/skills/verify-traces/helpers/pages-check.sh "$TRACES_VERIFY_EVIDENCE/pages"`. Exit code 0. The script writes `pages.html` and asserts the title `Traces. Local-first knowledge workspace`, section ids `overview`, `features`, `run`, `data-copy`, `id="clone"`, `git clone https://github.com/Sdefendre/traces-app.git`, and `pnpm dev`.
- **Hero.** Open the live URL in a browser if you have one. The H1 is `Traces`. Primary CTA text is `View on GitHub` and points at `https://github.com/Sdefendre/traces-app`. Ghost CTA is `Clone and run` and points at `#run`.
- **Sections.** `#features` cards include GRAPH, EDITOR, TRACESAI, and LOCAL-FIRST. `#run` heading is `Clone it. Run it.`
- **Copy button.** Choose `Copy` (`[data-copy]`). The label becomes `Copied`, then `Copy` again. If clipboard permission is denied, the label becomes `Copy failed`. That is an environment limit, not a product bug, as long as the button stays present.
- **Local docs.** If you need this branch rather than deployed Pages, read `docs/index.html` in the checkout or serve `docs/` with `python3 -m http.server` from that directory. Assert the same strings. Do not treat a local serve as proof that GitHub Pages deployed.
- **Proof.** Keep `pages.html` from `pages-check.sh` and, if a browser was used, a screenshot of `#run` under `$TRACES_VERIFY_EVIDENCE/pages/`. Record whether the proof used the live URL or `docs/`.

Module support, not a substitute: `pnpm verify:webmcp` registers marketing tools `get-product-info`, `get-install-instructions`, `get-github-url`, `get-contact`, and `jump-to-section` against a fake `document.modelContext`. Ordinary browsers have no WebMCP. The page must stay usable without it.

## Gotchas

- The desktop app and the Pages site are different surfaces. A green Pages check does not prove Electron.
- Live Pages deploys from `main` via `.github/workflows/pages.yml`. A branch change in `docs/` is not live until it lands.
- The only GitHub slugs this map uses are `Sdefendre/traces-app` and `sdefendre.github.io/traces-app`.
- `docs/webmcp.js` never reads a vault. If a tool returned note text, that would be a product bug. Current tools return public product facts only.
