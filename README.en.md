# Seaside ChatGPT-chan · dsh-skin-beach-chatgpt

> A **full-page wallpaper skin plugin** for the DeepSeek Harness Web GUI: a 4K beach
> backdrop fills the window, the sidebar / title bar / composer / user bubbles become
> glassmorphic panels, and light and dark themes each get their own palette
> ("morning sea" and "dusk sea").

| Light theme | Dark theme |
| --- | --- |
| ![Installed UI · light theme](preview/light.webp) | ![Installed UI · dark theme](preview/dark.webp) |

**English** | [中文](README.md)

---

## Features

- **Full-page wallpaper** — the 4K original is downscaled to a 2560×1440 WebP and **inlined into the plugin bundle**: no temp files, remote URLs or asset server involved.
- **One continuous backdrop** — the wallpaper is painted once on `body` (`fixed` + `cover`) and every layout column is transparent, so the sidebar and the conversation area share a single unbroken image instead of being cut into separate panels.
- **Light and dark themes** — "morning sea" and "dusk sea" (the same wallpaper dimmed into dusk, with dark glass on the UI layer). The panel's **appearance** row offers **follow system** (default: both themes) or **always light**, which removes the host's dark marker so DSH renders light as well.
- **Never touches DSH's own popovers** — the semantic tokens and stacking contexts behind the settings dialog, menus, toasts and code blocks stay official. The skin neither recolours their backgrounds nor puts `backdrop-filter` on a container that hosts a popover (that would pin the popover to the container's layer).
- **Colours only, never layout** — no `display` / grid / size rules, so sidebar dragging, workbench push and window resizing behave exactly as before.
- **Clean uninstall** — every write goes through a Cordis effect disposer; disabling the plugin restores the body attribute and `theme-color`.
- **Built-in settings panel** — a floating entry (bottom-right, or <kbd>Alt</kbd>+<kbd>B</kbd>) for glass opacity, blur, wallpaper scrim, text colour and accent colour, plus a **replaceable wallpaper** (bundled image / local file / image URL) that applies instantly and persists in `localStorage`.
- **Presentation-only** — no host services, no Cordis events, no session data, no model requests.

## Repository layout

```
dsh-skin-beach-chatgpt/
├── package.json              # manifest: dsh.bundle.patch + dsh.client declarations
├── cordis.patch.yml          # roster layer: inserts the browser plugin row into the profile tree
├── skin.json                 # skin metadata (read by skin managers / skin centers)
├── lib/
│   ├── index.js              # host entry (empty apply — presentation-only plugin)
│   └── client.js             # browser bundle (generated, committed to the repo)
├── src/client/
│   ├── skin.css              # the stylesheet — single source of truth for presentation
│   ├── panel.js              # built-in settings panel + settings read/write (ESM source)
│   └── apply.js              # browser-side mount logic (ESM source)
├── tests/smoke.mjs           # jsdom behaviour smoke test (tests the artifact, not the source)
├── scripts/
│   ├── build.mjs             # zero-dependency build: CSS + wallpaper + scripts → lib/client.js
│   └── configure.mjs         # zero-dependency install configurator (called by the install scripts)
├── assets/
│   ├── wallpaper-2560.webp   # the bundled wallpaper (inlined at build time)
│   └── wallpaper-1920.webp   # lower-resolution alternative
├── preview/                  # README preview images
├── install.sh / install.ps1  # one-line install (Linux/macOS · Windows)
└── uninstall.sh / uninstall.ps1
```

## Requirements

| Item | Version |
| --- | --- |
| DeepSeek Harness | ≥ 0.1.2 (the `web` profile, i.e. the GUI started by `dsh web`) |
| Node.js | ≥ 20 (install / build only) |
| pnpm | ≥ 9 (profile dependencies are managed by pnpm) |

## Installation

Any one of the three paths below. All of them need a **DSH restart** afterwards — profile bundle layers are composed at boot, so a newly added plugin cannot be hot-plugged into a running process.

### A. One-line scripts (recommended)

**Windows (PowerShell)**

```powershell
# run inside the plugin directory
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

**macOS / Linux**

```sh
chmod +x install.sh && ./install.sh
```

The script then:

1. locates `$DSH_HOME` (default `~/.dsh`) and the target profile (default `web`; override with `-Profile` / `DSH_PROFILE`);
2. copies the plugin to `$DSH_HOME/plugins/dsh-skin-beach-chatgpt`;
3. backs up and updates the profile's `package.json` (`dependencies` + `dsh.profile.bundles`);
4. clears the stale `node_modules` copy and runs `pnpm install`;
5. applies **skin exclusivity** (see below) unless you pass `-SkipExclusive` / `--skip-exclusive`;
6. prints the restart reminder.

### B. `dsh plugin` (straight from GitHub)

`dsh` ships a plugin-management command that forwards its arguments to pnpm inside the profile directory and then adds every installed dependency that declares `dsh.bundle` to `dsh.profile.bundles`:

```sh
# author's repository: lingstudy-J/dsh-skin-beach-chatgpt
dsh plugin --profile web add github:lingstudy-J/dsh-skin-beach-chatgpt
```

```powershell
# Windows PowerShell: quote git-style specs
dsh plugin --profile web add 'github:lingstudy-J/dsh-skin-beach-chatgpt'
```

> For the desktop app (`dsh --profile desktop`) replace `web` with `desktop`.
> This plugin does not build at install time (`lib/` is committed), so pnpm's dependency build-script gate is not involved.

### C. Manual wiring (local checkout / development)

```sh
# 1. copy the plugin
cp -r dsh-skin-beach-chatgpt "$DSH_HOME/plugins/"     # Windows: %USERPROFILE%\.dsh\plugins\
```

```sh
# 2. edit ~/.dsh/profiles/web/package.json
```

```jsonc
{
  "dependencies": {
    "dsh-client-ui-skin-beach-chatgpt": "file:../../plugins/dsh-skin-beach-chatgpt"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-client-ui-skin-beach-chatgpt"
      ]
    }
  }
}
```

```sh
# 3. install dependencies (cwd must be the profile directory)
cd "$DSH_HOME/profiles/web" && pnpm install
```

```sh
# 4. verify the composed tree — the row should be present
dsh web --dump-config | grep -A2 ui-skin-beach-chatgpt
```

## Default activation and skin exclusivity

Once the package is in `dsh.profile.bundles`, its row is **enabled** — that is what "applied by default" means here.

But a skin overrides the whole page: enabling a second DSH skin plugin (for example `ui-skin-maid-atelier`) would stack two stylesheets. The install scripts therefore run an exclusivity pass by default: they maintain a marked section at the end of `$DSH_HOME/cordis.patch.yml` that disables **other** DSH skin rows, leaving everything outside that section untouched:

```yaml
# >>> dsh-skin-beach-chatgpt exclusive >>>
- id: ui-skin-maid-atelier
  disabled: true
# <<< dsh-skin-beach-chatgpt exclusive <<<
```

Manual control:

- Want only this skin? That is the default behaviour. Deleting the rows inside the section restores the other skins.
- Using a skin center as well (`@linxin666/dsh-client-ui-skin-center`)? Switch it back to the **official default**, otherwise two full-page backgrounds overlap. The install script clears `active` in `$DSH_HOME/skin-center-active.json` and backs the file up as `.bak-<timestamp>` (`-SkipExclusive` skips this).
- Want to keep it installed but off? Add this to `$DSH_HOME/cordis.patch.yml`:

  ```yaml
  - id: ui-skin-beach-chatgpt
    disabled: true
  ```

## Verifying the install

After restarting DSH, open the GUI (default <http://127.0.0.1:3080>) and check:

1. the beach wallpaper should be visible, with the sidebar and composer rendered as translucent glass;
2. in the DevTools console:

   ```js
   document.body.hasAttribute('data-dsh-beach-chatgpt')            // → true
   !!document.querySelector('style[data-plugin-css="dsh-client-ui-skin-beach-chatgpt/skin.css"]')  // → true
   ```

3. switch the official light/dark theme (Settings → General → Appearance) — the palette should follow, sea blue for light and dusk for dark.

## Uninstall

```powershell
powershell -ExecutionPolicy Bypass -File .\uninstall.ps1
```

```sh
chmod +x uninstall.sh && ./uninstall.sh
```

The uninstaller removes the plugin from the profile's `dependencies` and `dsh.profile.bundles`, deletes the exclusivity section from the home patch (restoring the `skin-center-active.json` backup when present), cleans the `node_modules` copy and runs `pnpm install` once. After a restart the UI is back to the official look.

## Settings panel

The skin ships its own panel — no extra plugin required.

![skinpanel](preview/skinpanel.webp)

**Entry**: the 🌊 button in the bottom-right corner, or <kbd>Alt</kbd>+<kbd>B</kbd>. **On a fresh install (no stored settings yet) the panel opens itself once** and then stays out of the way. The entry button is always visible — there used to be a "hide entry" switch, but it was a self-locking trap: hiding the entry leaves only the shortcut, and it sat right next to a slider, so dragging could hit it by accident. Changes apply instantly and persist in `localStorage` (key `dsh-skin-beach-chatgpt:settings:v2`).

| Setting | Range | Default | Notes |
| --- | --- | --- | --- |
| Wallpaper source | bundled / local file / image URL | bundled | see below |
| Fit | cover / contain | cover | cover crops but fills; contain shows everything |
| **Appearance** | follow system / always light | follow system | "always light" removes the host's dark marker so DSH renders light as well (restored on uninstall) |
| Wallpaper | on / off | on | off keeps palette + glass only |
| Sidebar glass | 0–100% | **0%** | fully transparent by default — the sidebar adds no colour of its own; raise it for a frosted look |
| Panel glass | 30–100% | 88% | composer, user bubbles, toolbars |
| Backdrop blur | 0–32 px | 20 px | user bubbles only — containers that host official popovers never take `backdrop-filter`; 0 disables frosting |
| Wallpaper scrim | 0–100% | 100% | the haze over the wallpaper; **raise it when text is hard to read** |
| Text palette | cool / warm / high-contrast | cool | preset slot, separate values per theme; touching either colour picker below switches to "custom" |
| **Custom text colour · light** | any `#RRGGBB` | `#14303f` | picking a colour switches to the custom slot; secondary/tertiary ink is derived from the same hue |
| **Custom text colour · dark** | any `#RRGGBB` | `#eaf3f8` | stored **separately** from the light one: the dark theme dims the whole surface, so one colour cannot read well in both |
| **Text backing** | 0–80% | 0% | a glass plate behind the transcript — **raise this first when text collides with the wallpaper** |
| Text shadow | on / off | on | a very light outline shadow (white halo on light themes, dark on dark) |
| Accent | sea / sunset / mint / sakura | sea | links, focus rings, sliders, brand colour |

### When text is hard to read

The wallpaper is a photograph, so local brightness is out of our control and collisions are inevitable. Try, in order:

1. raise **text backing** (20–40% is usually enough) — it only pads the transcript with a glass plate and keeps the "one continuous backdrop" look;
2. switch the **text palette** preset, or pick a colour with a clearly different luminance in the **colour picker** — light and dark each have their **own picker**, stored separately, because the dark theme dims the whole surface;
3. turn on **text shadow** (on by default);
4. only then raise the **wallpaper scrim** — it is global and affects the whole picture.

The transcript also has an explicit colour baseline: `[data-chat-flow]`, markdown containers and user bubbles all resolve to `var(--beach-ink)` instead of relying on an indirect token mapping.

### Replace the wallpaper

Three sources, all instant — **no rebuild, no restart**:

1. **Bundled** — `assets/wallpaper-2560.webp`, inlined at build time. Replace that file and rebuild to change the default.
2. **Local file** — pick an image in the panel; it is downscaled to a 2560px longest edge and re-encoded to WebP (q0.82) in the browser before being stored, because a raw 4K image would blow the 5MB `localStorage` quota instantly. The panel says "applied but not persisted" when the quota is exceeded.
3. **Image URL** — paste a direct link (`https://…`). Only `http(s)://` and `data:image/` are accepted; other schemes are rejected. Cross-origin images load as plain CSS backgrounds, so the canvas same-origin policy does not apply.

"Reset" restores every row above at once, wallpaper included.

## Customizing the source

**Replace the bundled wallpaper**: swap `assets/wallpaper-2560.webp` (2560×1440, WebP q≈80, keep it under ~500 KiB) and rebuild:

```sh
node scripts/build.mjs                                   # uses the 2560 version by default
node scripts/build.mjs --art=assets/wallpaper-1920.webp  # smaller inline payload for weaker machines
```

One way to produce that WebP (needs Python + Pillow):

```sh
python -c "from PIL import Image; im=Image.open('source.png').convert('RGB'); im.thumbnail((2560,1440)); im.save('assets/wallpaper-2560.webp','WEBP',quality=80,method=6)"
```

**Change the palette**: edit the `--beach-*` variables at the top of `src/client/skin.css` (one block per theme) and rebuild. Every colour lives at the top of that file; the rest of the stylesheet only references variables.

**Reduce rendering cost**: set the panel's **backdrop blur** to 0 (that knob only affects user bubbles — containers that host official popovers never take `backdrop-filter`); the wallpaper and palette stay.

## How it works

```
profile package.json
  └─ dsh.profile.bundles: [..., dsh-client-ui-skin-beach-chatgpt]
        └─ this package declares dsh.bundle.patch → cordis.patch.yml
              └─ cordis.patch.yml inserts the row { id: ui-skin-beach-chatgpt, name: dsh-client-ui-skin-beach-chatgpt }
                    ├─ host side: the empty apply() in lib/index.js (a placeholder so the entry can mount)
                    └─ browser side: the package's dsh.client makes DSH deliver lib/client.js
                       as a browser entry; it calls window.__ModuleLoader__.load({ id, factory })
                       to register a lazy factory, injects a <style> when materialised,
                       and Cordis then calls the exported apply(ctx).
```

The skin itself does three things: inject one stylesheet scoped to `body[data-dsh-beach-chatgpt]`, set that attribute on `body`, and keep `theme-color` in sync. All of it is reverted on uninstall.

## FAQ

**Q: The UI looks unchanged after a restart.**
Check in order: does `dsh web --dump-config | grep ui-skin-beach-chatgpt` show the row; does `~/.dsh/profiles/web/node_modules/dsh-client-ui-skin-beach-chatgpt` exist (did `pnpm install` actually run in that profile directory); did you hard-refresh the browser (Ctrl/Cmd+Shift+R)?

**Q: The wallpaper is cropped / not fully visible.**
The wallpaper fills the viewport with `cover`, so a different aspect ratio always crops. Use a centred composition, or change `background-size: cover, cover` in `src/client/skin.css` to `contain, contain` and give `background-color` a colour close to the image edges.

**Q: Why is the host-side `index.js` empty?**
That is the normal shape of a presentation-only plugin: it needs no host service, but the DSH profile loader requires a mountable entry, and the browser half is delivered through the same package's `dsh.client` declaration.

**Q: After switching to dark, some text seems to vanish.**
The dark palette draws near-white text while this wallpaper is a **daylight beach**: with a light scrim and thin glass, light text drowns in the bright picture and the UI looks empty. The dark theme therefore uses a heavier scrim (0.52–0.70) and thicker dark glass on the sidebar and title bar (0.34). If you pull the **wallpaper scrim** very low, the effect comes back — pick **always light** in the appearance row to avoid it entirely.

**Q: Does it affect the model, tools or session data?**
No. There is no host behaviour, no service registration and no RPC. Everything it does to the page lives in `src/client/skin.css`.

## Author

**shiwu** · GitHub [@lingstudy-J](https://github.com/lingstudy-J) · repository [lingstudy-J/dsh-skin-beach-chatgpt](https://github.com/lingstudy-J/dsh-skin-beach-chatgpt)

Issues and pull requests are welcome. When forking, replace `author`, `repository`, `homepage`, `bugs` and `dsh.repo` in `package.json` plus `author` in `skin.json` (keep `skin.json`'s `package` equal to `package.json`'s `name`).

## License and artwork

- **Code**: MIT, see [LICENSE](LICENSE).
- **Artwork** (`assets/`, `preview/`, `skinpanel.webp`): the bundled wallpaper is fan-made derivative work whose rights belong to its original author — **personal and non-commercial use only, not for resale**; keep this notice when redistributing. If you replace it with your own image, update this section and the artwork note in `LICENSE`.
