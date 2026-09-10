# Seaside ChatGPT-chan · dsh-skin-beach-chatgpt

> A full-page wallpaper **skin plugin** for the DeepSeek Harness Web GUI: a 4K beach
> backdrop with glassmorphic panels, plus separate light ("morning sea") and dark
> ("dusk sea") palettes that follow the official theme.

| Light theme | Dark theme |
| --- | --- |
| ![Installed UI · light theme](preview/light.webp) | ![Installed UI · dark theme](preview/dark.webp) |

[中文](README.md)

## Features

- **Full-page wallpaper** — the 4K original is downscaled to a 2560×1440 WebP and **inlined into the plugin bundle**; no temp files, remote URLs or asset server are involved.
- **Light / dark palettes** that track `body[data-ds-dark-theme]`, with the sea-blue × sunset-orange accent pair contrast-corrected for both.
- **Glassmorphism with continuous backdrop coverage** — the sidebar column (and every container nested inside it), title bar, composer card and user bubbles each carry one frosted layer, so the wallpaper runs unbroken from the sidebar across the conversation area.
- **Colors only, never layout** — no `display` / grid / size rules, so sidebar drag, workbench push and window resize behave exactly as before.
- **Clean uninstall** — every write goes through a Cordis effect disposer; disabling the plugin restores the body attribute and `theme-color`.
- **Built-in settings panel** — a floating entry (bottom-right, or <kbd>Alt</kbd>+<kbd>B</kbd>) for glass opacity, blur, wallpaper scrim, text palette and accent colour, plus a **replaceable wallpaper** (bundled image / local file / image URL) that applies instantly and persists in `localStorage`.
- **Light and dark themes** — "morning sea" and "dusk sea" (the same wallpaper dimmed into dusk, with dark glass on the UI layer). The panel's **appearance** row offers **follow system** (default: both themes) or **always light**, which removes the host's dark marker so DSH renders light too.
- **Presentation-only** — no host services, no Cordis events, no session data, no model requests.

## Requirements

| Item | Version |
| --- | --- |
| DeepSeek Harness | ≥ 0.1.2 (`web` profile, i.e. the `dsh web` GUI) |
| Node.js | ≥ 20 (install/build only) |
| pnpm | ≥ 9 (profile dependencies) |

## Install

All three paths require a **DSH restart** afterwards — profile bundle layers are composed at boot.

### A. One-liner scripts

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

```sh
# macOS / Linux
chmod +x install.sh && ./install.sh
```

The script locates `$DSH_HOME` (default `~/.dsh`), copies the plugin to
`$DSH_HOME/plugins/dsh-skin-beach-chatgpt`, wires it into every profile's
`package.json`, runs `pnpm install`, and (by default) disables other DSH skin
rows so this skin is the active one. Pass `-SkipExclusive` / `--skip-exclusive`
to keep the other skins enabled.

### B. `dsh plugin` from GitHub

```sh
dsh plugin --profile web add github:lingstudy-J/dsh-skin-beach-chatgpt
```

### C. Manual

1. Copy this directory to `$DSH_HOME/plugins/dsh-skin-beach-chatgpt`.
2. In `$DSH_HOME/profiles/web/package.json`, add
   `"dsh-client-ui-skin-beach-chatgpt": "file:../../plugins/dsh-skin-beach-chatgpt"`
   to `dependencies` and the same name to `dsh.profile.bundles`.
3. `cd $DSH_HOME/profiles/web && pnpm install`.
4. `dsh web --dump-config | grep ui-skin-beach-chatgpt` should print the row.

If `pnpm install` fails with `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` (an unrelated
package publishing inside pnpm's 24h supply-chain window), retry once with
`pnpm install --config.minimumReleaseAge=0` — the install scripts already do this.

## Verify

After restarting DSH, open the GUI and check in DevTools:

```js
document.body.hasAttribute('data-dsh-beach-chatgpt')  // true
!!document.querySelector('style[data-plugin-css="dsh-client-ui-skin-beach-chatgpt/skin.css"]')  // true
```

## Uninstall

```powershell
powershell -ExecutionPolicy Bypass -File .\uninstall.ps1
```

```sh
./uninstall.sh
```

## Settings panel

The skin ships its own panel — no extra plugin required. Open it from the 🌊 button
in the bottom-right corner or with <kbd>Alt</kbd>+<kbd>B</kbd>; on a fresh install the
panel opens itself once. Changes apply instantly
and persist in `localStorage` (key `dsh-skin-beach-chatgpt:settings:v1`).

| Setting | Range | Default | Notes |
| --- | --- | --- | --- |
| Wallpaper source | bundled / local file / image URL | bundled | See below |
| Fit | cover / contain | cover | cover crops but fills; contain shows everything |
| **Appearance** | follow system / always light | follow system | "always light" removes the host's dark marker so DSH renders light as well (restored on uninstall) |
| Wallpaper | on / off | on | off keeps palette + glass only |
| Sidebar glass | 0–100% | **0%** | fully transparent by default — the sidebar adds no colour of its own, so the wallpaper stays one continuous image; raise it for a frosted look |
| Panel glass | 30–100% | 88% | composer, bubbles, toolbars |
| Backdrop blur | 0–32 px | 20 px | user bubbles only — containers that host popovers never take `backdrop-filter`; 0 disables frosting |
| Wallpaper scrim | 0–180% | 100% | raise it when text is hard to read |
| Text palette | cool / warm / high-contrast | cool | separate values per light/dark theme |
| **Custom text colour · light** | any `#RRGGBB` | `#14303f` | picking a colour switches to the custom slot; secondary/tertiary ink is derived from the same hue |
| **Custom text colour · dark** | any `#RRGGBB` | `#eaf3f8` | stored **separately** from the light one: the dark theme dims the whole surface, so one colour cannot read well in both |
| **Text backing** | 0–80% | 0% | a glass plate behind the transcript — **raise this first when text collides with the wallpaper** |
| Text shadow | on / off | on | a very light outline shadow (white halo on light themes, dark on dark) |
| Accent | sea / sunset / mint / sakura | sea | links, focus rings, sliders, brand |

### Replace the wallpaper

Three sources, all instant — no rebuild, no restart:

1. **Bundled** — `assets/wallpaper-2560.webp`, inlined at build time. Replace that file and rebuild to change the default.
2. **Local file** — pick an image in the panel; it is downscaled to a 2560px longest edge and re-encoded to WebP (q0.82) in the browser before being stored, because a raw 4K image would blow the 5MB `localStorage` quota instantly.
3. **Image URL** — paste a direct link (`https://…`). Only `http(s)://` and `data:image/` are accepted; other schemes are rejected.

"Reset" restores every row above, wallpaper included.

## Customize the source

Replace `assets/wallpaper-2560.webp` (2560×1440, WebP q80, keep it under ~500 KiB)
and rebuild:

```sh
node scripts/build.mjs
node scripts/build.mjs --art=assets/wallpaper-1920.webp   # smaller inline payload
```

Palette variables live at the top of `src/client/skin.css` — one block per theme.

## Layout

```
package.json      dsh.bundle.patch + dsh.client declarations
cordis.patch.yml  roster layer: inserts { id: ui-skin-beach-chatgpt }
lib/index.js      host entry (empty apply — presentation-only plugin)
lib/client.js     browser bundle (generated, committed)
src/client/       skin.css + apply.js (sources)
scripts/          build.mjs (bundler) · configure.mjs (installer)
```

## Author

**shiwu** · GitHub [@lingstudy-J](https://github.com/lingstudy-J) · repository [lingstudy-J/dsh-skin-beach-chatgpt](https://github.com/lingstudy-J/dsh-skin-beach-chatgpt)

Issues and pull requests are welcome. When forking, replace `author`, `repository`, `homepage`, `bugs` and `dsh.repo` in `package.json` plus `author` in `skin.json` (keep `skin.json`'s `package` equal to `package.json`'s `name`).

## License

Code: MIT. Artwork in `assets/` and `preview/`: fan-made derivative work, original
rights belong to its author — personal and non-commercial use only, not for
resale. Replace it with your own image before publishing your fork.
