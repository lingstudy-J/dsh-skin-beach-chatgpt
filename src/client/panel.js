/**
 * 海边 ChatGPT 娘 —— 皮肤自带的设置面板。
 *
 * 面板是皮肤的一部分，而不是另一块要独立安装的 UI：不 require 任何 DSH 服务、
 * 不注册 slot，因此它在任何 DSH 版本上都能用，也不会和"皮肤中心/皮肤管理器"
 * 之类的外壳争入口。配置存在 localStorage，改动即时写进 body 的自定义属性与
 * CSS 变量，无需重载、无需重构建。
 *
 * @module dsh-skin-beach-chatgpt/panel
 */

/** localStorage 键；带版本号，便于日后无损迁移。 */
export const SETTINGS_STORAGE_KEY = "dsh-skin-beach-chatgpt:settings:v2";

/** 本地图片最长边上限：再大也只是徒增 localStorage 体积与解码开销。 */
const IMPORTED_IMAGE_MAX_EDGE = 2560;

/** 默认值：与 skin.css 里写死的默认外观一致。 */
export const DEFAULT_SETTINGS = {
  // 默认完全透明：壁纸从左侧栏到对话区是一整张图，不额外糊一层颜色。
  // 想要玻璃质感就在面板里把"侧栏玻璃实度"往上推。
  sidebarGlass: 0,
  panelGlass: 0.88,
  inputGlass: 0.97,
  blur: 20,
  scrim: 100,
  text: "custom",
  customInk: "#14303f",
  customInkDark: "#eaf3f8",
  textScrim: 0,
  textShadow: true,
  accent: "sea",
  appearance: "auto",
  wallpaper: true,
  wallpaperFit: "cover",
  wallpaperSource: { kind: "builtin", value: "", name: "" },
  showLauncher: true,
};

const PANEL_CSS = `
/* 设置面板自带完整样式，并挂在 Shadow DOM 里 —— 面板外观不依赖宿主的全局
   CSS，也不依赖 body 上的皮肤属性：即使皮肤作用域属性被移除，或者宿主某条
   * 规则 / !important 规则命中同名字符串，面板也不会因此变形、缩窄或变透明。
   皮肤变量（--beach-*）从 host 继承进来，取不到时用 fallback 兜底。 */
:host {
  position: fixed;
  right: 14px;
  bottom: 14px;
  z-index: 2147482000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  pointer-events: none;
  color: var(--beach-ink, #14303f);
  font-family: var(--dsw-font-family, system-ui, -apple-system, "Segoe UI", sans-serif);
  font-size: 12px;
  line-height: 18px;
}

:host > * {
  pointer-events: auto;
}

.dsh-beach-launcher {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  border-radius: 50%;
  color: var(--beach-ink, #14303f);
  background-color: var(--beach-surface-solid, rgba(255, 253, 248, 0.95));
  border: 0.5px solid var(--beach-line, rgba(47, 134, 173, 0.26));
  box-shadow: var(--beach-shadow, 0 18px 44px rgba(14, 45, 64, 0.16));
}

.dsh-beach-launcher:hover {
  color: var(--beach-sea, #2f86ad);
}

.dsh-beach-panel {
  box-sizing: border-box;
  width: 268px;
  max-height: min(70vh, 560px);
  overflow-y: auto;
  padding: 12px 14px 14px;
  border-radius: 14px;
  color: var(--beach-ink, #14303f);
  background-color: var(--beach-surface-solid, rgba(255, 253, 248, 0.95));
  border: 0.5px solid var(--beach-line, rgba(47, 134, 173, 0.26));
  box-shadow: var(--beach-shadow, 0 18px 44px rgba(14, 45, 64, 0.16));
  scrollbar-color: var(--beach-scroll-thumb, rgba(47, 134, 173, 0.36)) transparent;
}

.dsh-beach-panel[hidden] {
  display: none;
}

.dsh-beach-panel h4 {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
}

.dsh-beach-row {
  margin-bottom: 11px;
}

.dsh-beach-row-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 5px;
  color: var(--beach-ink-soft, #40606f);
}

.dsh-beach-row-head b {
  color: var(--beach-sea, #2f86ad);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

input[type="range"] {
  width: 100%;
  height: 24px;
  margin: 0;
  cursor: pointer;
  accent-color: var(--beach-sea, #2f86ad);
  touch-action: none;
}

/* 按住滑杆期间，面板里的按钮全部让位：松手不会"顺带"点中旁边的按钮。 */
.dsh-beach-panel[data-beach-dragging] button {
  pointer-events: none;
}

input[type="file"],
input[type="url"] {
  box-sizing: border-box;
  width: 100%;
  padding: 5px 7px;
  font: inherit;
  color: inherit;
  background-color: rgba(127, 127, 127, 0.08);
  border: 0.5px solid var(--beach-line, rgba(47, 134, 173, 0.26));
  border-radius: 8px;
}

.dsh-beach-color-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dsh-beach-color-row input[type="color"] {
  width: 42px;
  height: 26px;
  padding: 0;
  cursor: pointer;
  background: none;
  border: 0.5px solid var(--beach-line, rgba(47, 134, 173, 0.26));
  border-radius: 8px;
}

.dsh-beach-hex {
  flex: 1;
  min-width: 0;
  font-family: var(--ds-font-family-code, ui-monospace, Menlo, Consolas, monospace);
  text-transform: lowercase;
}

.dsh-beach-url-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 5px;
}

button {
  padding: 5px 9px;
  cursor: pointer;
  font: inherit;
  color: var(--beach-ink-soft, #40606f);
  background-color: rgba(127, 127, 127, 0.08);
  border: 0.5px solid var(--beach-line, rgba(47, 134, 173, 0.26));
  border-radius: 8px;
}

button:hover {
  color: var(--beach-sea, #2f86ad);
  border-color: var(--beach-sea, #2f86ad);
}

.dsh-beach-seg {
  display: flex;
  gap: 4px;
}

.dsh-beach-seg button {
  flex: 1;
  min-width: 0;
  padding: 5px 4px;
}

.dsh-beach-seg button[aria-pressed="true"] {
  color: var(--beach-ink, #14303f);
  border-color: var(--beach-sea, #2f86ad);
  background-color: rgba(47, 134, 173, 0.18);
}

.dsh-beach-swatches {
  display: flex;
  gap: 6px;
}

.dsh-beach-swatches button {
  width: 26px;
  height: 26px;
  padding: 0;
  border-radius: 50%;
  border: 1.5px solid transparent;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
}

.dsh-beach-swatches button[aria-pressed="true"] {
  border-color: var(--beach-ink, #14303f);
}

.dsh-beach-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 0.5px solid var(--beach-line, rgba(47, 134, 173, 0.26));
}

.dsh-beach-hint {
  color: var(--beach-ink-faint, #5d7d8c);
  font-size: 11px;
}
`

const TEXT_PRESETS = [
  { value: "cool", label: "冷墨" },
  { value: "warm", label: "暖褐" },
  { value: "contrast", label: "高对比" },
];

const ACCENT_PRESETS = [
  { value: "sea", label: "海蓝", swatch: "#2f86ad" },
  { value: "sunset", label: "落日", swatch: "#e08a4e" },
  { value: "mint", label: "薄荷", swatch: "#2f9d8f" },
  { value: "sakura", label: "樱粉", swatch: "#c2618b" },
];

/** 把 `#abc` / `#aabbcc` / 不带 # 的写法统一成小写六位十六进制；非法返回 null。 */
function normalizeHex(value) {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(value).trim());
  if (match === null) return null;
  const digits = match[1];
  const full = digits.length === 3 ? digits.split("").map(digit => digit + digit).join("") : digits;
  return `#${full.toLowerCase()}`;
}

/** 把主文字色朝给定灰度混合，派生次级/三级文字色，保持同一色相。 */
function deriveInk(hex, ratio) {
  const channels = [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16));
  const mixed = channels.map(channel => Math.round(channel + (128 - channel) * ratio));
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

/** 只接受 http/https/data 图片地址，杜绝 `javascript:` 之类的伪协议。 */
function sanitizeImageUrl(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (/^data:image\//i.test(trimmed)) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return "";
}

function sanitizeSource(raw) {
  if (raw === null || typeof raw !== "object") return { ...DEFAULT_SETTINGS.wallpaperSource };
  const kind = raw.kind === "file" || raw.kind === "url" ? raw.kind : "builtin";
  if (kind === "builtin") return { ...DEFAULT_SETTINGS.wallpaperSource };
  const value = sanitizeImageUrl(raw.value);
  if (value === "") return { ...DEFAULT_SETTINGS.wallpaperSource };
  return { kind, value, name: typeof raw.name === "string" ? raw.name.slice(0, 120) : "" };
}

/** 读取设置；任何字段损坏都回落到默认值，绝不因为一条坏记录让皮肤挂不上。 */
export function loadSettings(storage) {
  const settings = { ...DEFAULT_SETTINGS, wallpaperSource: { ...DEFAULT_SETTINGS.wallpaperSource } };
  let raw = null;
  try {
    raw = storage.getItem(SETTINGS_STORAGE_KEY);
  } catch {
    return settings;
  }
  if (raw === null || raw === "") return settings;
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return settings;
  }
  if (parsed === null || typeof parsed !== "object") return settings;
  settings.sidebarGlass = clamp(parsed.sidebarGlass, 0.15, 1, DEFAULT_SETTINGS.sidebarGlass);
  settings.panelGlass = clamp(parsed.panelGlass, 0.3, 1, DEFAULT_SETTINGS.panelGlass);
  settings.inputGlass = clamp(parsed.inputGlass, 0.8, 1, DEFAULT_SETTINGS.inputGlass);
  settings.blur = clamp(parsed.blur, 0, 32, DEFAULT_SETTINGS.blur);
  settings.scrim = clamp(parsed.scrim, 0, 100, DEFAULT_SETTINGS.scrim);
  const knownText = parsed.text === "custom" || TEXT_PRESETS.some(preset => preset.value === parsed.text);
  settings.text = knownText ? parsed.text : DEFAULT_SETTINGS.text;
  settings.customInk = normalizeHex(parsed.customInk) ?? DEFAULT_SETTINGS.customInk;
  settings.customInkDark = normalizeHex(parsed.customInkDark) ?? DEFAULT_SETTINGS.customInkDark;
  settings.textScrim = clamp(parsed.textScrim, 0, 80, DEFAULT_SETTINGS.textScrim);
  settings.textShadow = typeof parsed.textShadow === "boolean" ? parsed.textShadow : DEFAULT_SETTINGS.textShadow;
  settings.accent = ACCENT_PRESETS.some(preset => preset.value === parsed.accent) ? parsed.accent : DEFAULT_SETTINGS.accent;
  settings.appearance = parsed.appearance === "light" ? "light" : DEFAULT_SETTINGS.appearance;
  settings.wallpaper = typeof parsed.wallpaper === "boolean" ? parsed.wallpaper : DEFAULT_SETTINGS.wallpaper;
  settings.wallpaperFit = parsed.wallpaperFit === "contain" ? "contain" : "cover";
  settings.wallpaperSource = sanitizeSource(parsed.wallpaperSource);
  settings.showLauncher = true;
  return settings;
}

/**
 * 保存设置。
 * @returns `true` 表示已落盘；`false` 表示存储拒绝（多为配额不足，例如导入的原图过大）。
 */
export function saveSettings(storage, settings) {
  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

/**
 * 把设置写进文档根：连续量走内联自定义属性（覆盖 CSS 默认值），枚举量走
 * `data-beach-*` 属性，让亮/暗两套主题在 CSS 里各取所需；壁纸来源直接覆盖
 * `--beach-art`，因此换图不需要重新构建或重载。
 * @param root - 一般为 document.body。
 * @param settings - 已归一化的设置对象。
 */
export function applySettings(root, settings) {
  const style = root.style;
  style.setProperty("--beach-glass-alpha", String(settings.sidebarGlass));
  style.setProperty("--beach-panel-alpha", String(settings.panelGlass));
  style.setProperty("--beach-input-alpha", String(settings.inputGlass));
  style.setProperty("--beach-blur", `${settings.blur}px`);
  style.setProperty("--beach-scrim-strength", String(settings.scrim / 100));
  style.setProperty("--beach-art-size", settings.wallpaperFit === "contain" ? "contain" : "cover");

  const source = settings.wallpaperSource;
  if (source.kind === "builtin" || source.value === "") style.removeProperty("--beach-art");
  else style.setProperty("--beach-art", `url("${source.value}")`);

  applyInkOverride(root, settings);
  style.setProperty("--beach-text-scrim", String(settings.textScrim / 100));
  root.setAttribute("data-beach-text", settings.text);
  root.setAttribute("data-beach-text-shadow", settings.textShadow ? "on" : "off");
  root.setAttribute("data-beach-accent", settings.accent);
  root.setAttribute("data-beach-wallpaper", settings.wallpaper ? "on" : "off");
}

/** 自定义文字色使用的那张动态样式表的 id。 */
const INK_STYLE_ID = "dsh-client-ui-skin-beach-chatgpt-ink";

/**
 * 落自定义文字色。
 *
 * 这里刻意**不用内联 CSS 变量**：内联声明会盖掉一切选择器，包括暗色分支，
 * 于是"在浅色下挑的颜色"会一路带到深色里——这正是"切深色后字体全看不清"
 * 的成因。改为注入一条按主题分支的规则，亮/暗各取各的颜色。
 */
function applyInkOverride(root, settings) {
  const document_ = root.ownerDocument;
  const existing = document_.getElementById(INK_STYLE_ID);
  if (settings.text !== "custom") {
    if (existing !== null) existing.remove();
    return;
  }
  const light = normalizeHex(settings.customInk) ?? DEFAULT_SETTINGS.customInk;
  const dark = normalizeHex(settings.customInkDark) ?? DEFAULT_SETTINGS.customInkDark;
  const rule = (selector, ink) => `${selector} {
  --beach-ink: ${ink};
  --beach-ink-soft: ${deriveInk(ink, 0.35)};
  --beach-ink-faint: ${deriveInk(ink, 0.55)};
}`;
  const tag = existing ?? document_.createElement("style");
  if (existing === null) {
    tag.id = INK_STYLE_ID;
    tag.dataset.plugin = "dsh-client-ui-skin-beach-chatgpt";
    document_.head.append(tag);
  }
  tag.textContent = [
    rule('body[data-dsh-beach-chatgpt][data-beach-text="custom"]', light),
    rule('body[data-dsh-beach-chatgpt][data-beach-text="custom"][data-ds-dark-theme]', dark),
  ].join("\n\n");
}

/** 撤销 applySettings 写下的全部内容。 */
export function clearSettings(root) {
  const style = root.style;
  const properties = [
    "--beach-glass-alpha",
    "--beach-panel-alpha",
    "--beach-input-alpha",
    "--beach-blur",
    "--beach-scrim-strength",
    "--beach-art-size",
    "--beach-art",
    "--beach-text-scrim",
  ];
  for (const property of properties) style.removeProperty(property);
  root.ownerDocument.getElementById(INK_STYLE_ID)?.remove();
  for (const attribute of ["data-beach-text", "data-beach-text-shadow", "data-beach-accent", "data-beach-wallpaper"]) {
    root.removeAttribute(attribute);
  }
}

/**
 * 把用户选的图片文件读成可以直接当背景用的 data URI。
 *
 * 先按最长边 ${IMPORTED_IMAGE_MAX_EDGE}px 缩放再编码为 WebP，是为了让结果能塞进
 * localStorage（原样读 4K PNG 会立刻撞上 5MB 配额）。解码走 createImageBitmap，
 * 环境不支持时回退到 <img> + FileReader 路径。
 * @param file - 用户在文件选择器里挑的图片。
 * @returns data URI；无法解码时抛错，由调用方提示。
 */
export async function importImageFile(file) {
  const bitmap = await decodeImage(file);
  const scale = Math.min(1, IMPORTED_IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("无法创建画布上下文");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (typeof bitmap.close === "function") bitmap.close();
  const encoded = canvas.toDataURL("image/webp", 0.82);
  return encoded.startsWith("data:image/") ? encoded : canvas.toDataURL("image/jpeg", 0.85);
}

function decodeImage(file) {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file).catch(() => decodeViaElement(file));
  }
  return decodeViaElement(file);
}

function decodeViaElement(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("不是可识别的图片格式"));
      image.onload = () => resolve(image);
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function element(tag, attributes, children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes ?? {})) {
    if (key === "style") Object.assign(node.style, value);
    else if (key === "text") node.textContent = value;
    else if (value !== undefined && value !== null) node.setAttribute(key, String(value));
  }
  for (const child of children ?? []) node.append(child);
  return node;
}

function rangeRow(label, value, min, max, step, format, onInput) {
  const readout = element("b", { text: format(value) });
  const input = element("input", { type: "range", min, max, step, value });
  input.addEventListener("input", () => {
    const next = Number(input.value);
    readout.textContent = format(next);
    onInput(next);
  });
  return {
    node: element("div", { class: "dsh-beach-row" }, [
      element("div", { class: "dsh-beach-row-head" }, [element("span", { text: label }), readout]),
      input,
    ]),
    sync: (next) => {
      input.value = String(next);
      readout.textContent = format(next);
    },
  };
}

function segmentRow(label, options, value, onSelect) {
  const buttons = options.map(option => element("button", {
    type: "button",
    "aria-pressed": String(option.value === value),
    text: option.label,
  }));
  const sync = (next) => {
    buttons.forEach((button, index) => {
      button.setAttribute("aria-pressed", String(options[index].value === next));
    });
  };
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      const next = options[index].value;
      sync(next);
      onSelect(next);
    });
  });
  return {
    node: element("div", { class: "dsh-beach-row" }, [
      element("div", { class: "dsh-beach-row-head" }, [element("span", { text: label })]),
      element("div", { class: "dsh-beach-seg" }, buttons),
    ]),
    sync,
  };
}

function swatchRow(label, options, value, onSelect) {
  const buttons = options.map(option => element("button", {
    type: "button",
    title: option.label,
    "aria-label": option.label,
    "aria-pressed": String(option.value === value),
    style: { backgroundColor: option.swatch },
  }));
  const sync = (next) => {
    buttons.forEach((button, index) => {
      button.setAttribute("aria-pressed", String(options[index].value === next));
    });
  };
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      const next = options[index].value;
      sync(next);
      onSelect(next);
    });
  });
  return {
    node: element("div", { class: "dsh-beach-row" }, [
      element("div", { class: "dsh-beach-row-head" }, [element("span", { text: label })]),
      element("div", { class: "dsh-beach-swatches" }, buttons),
    ]),
    sync,
  };
}

/**
 * 创建悬浮入口与设置面板。
 * @param options - `{ settings, onChange, onReset }`；onChange 收到的是完整设置对象。
 * @returns `{ launcher, panel, setVisible, setStatus, destroy }`。
 */
export function createSettingsPanel(options) {
  let settings = { ...options.settings };
  const emit = (patch) => {
    settings = { ...settings, ...patch };
    options.onChange(settings, { transient: false });
  };

  /** 拖动滑杆时先只改样式，停手后再落盘，避免每像素一次同步写。 */
  let transientTimer = null;
  const emitTransient = (patch) => {
    settings = { ...settings, ...patch };
    options.onChange(settings, { transient: true });
    if (transientTimer !== null) clearTimeout(transientTimer);
    transientTimer = setTimeout(() => {
      transientTimer = null;
      options.onChange(settings, { transient: false });
    }, 180);
  };

  const sidebarRow = rangeRow("侧栏玻璃实度", settings.sidebarGlass, 0, 100, 1,
    value => `${Math.round(value)}%`, value => emitTransient({ sidebarGlass: value / 100 }));
  const panelRow = rangeRow("面板实度（输入框/气泡）", settings.panelGlass, 30, 100, 1,
    value => `${Math.round(value)}%`, value => emitTransient({ panelGlass: value / 100 }));
  const inputRow = rangeRow("输入框实度（历史文字透上来时往上调）", settings.inputGlass * 100, 80, 100, 1,
    value => `${Math.round(value)}%`, value => emitTransient({ inputGlass: value / 100 }));
  const blurRow = rangeRow("背景模糊", settings.blur, 0, 32, 1,
    value => `${Math.round(value)}px`, value => emitTransient({ blur: value }));
  const scrimRow = rangeRow("壁纸遮罩（越大字越清楚）", settings.scrim, 0, 100, 5,
    value => `${Math.round(value)}%`, value => emitTransient({ scrim: value }));
  const textRow = segmentRow("文字颜色", TEXT_PRESETS, settings.text, value => emit({ text: value }));

  /* 亮/暗各一个取色器：壁纸是白天的海面而暗色下界面会压暗，同一个颜色
     不可能在两边都清楚，所以自定义色也按主题分开存。 */
  const makeColorRow = (label, field) => {
    const colorInput = element("input", { type: "color", value: settings[field], "aria-label": label });
    const hexInput = element("input", {
      type: "text",
      class: "dsh-beach-hex",
      value: settings[field],
      spellcheck: "false",
      "aria-label": `${label}十六进制值`,
    });
    const row = element("div", { class: "dsh-beach-row" }, [
      element("div", { class: "dsh-beach-row-head" }, [
        element("span", { text: label }),
        element("span", { class: "dsh-beach-hint", text: "点色块或填 #RRGGBB" }),
      ]),
      element("div", { class: "dsh-beach-color-row" }, [colorInput, hexInput]),
    ]);

    // 取色即切到"自定义"档：用户不必先选档位再取色。
    colorInput.addEventListener("input", () => {
      const ink = normalizeHex(colorInput.value) ?? settings[field];
      hexInput.value = ink;
      textRow.sync("custom");
      emitTransient({ text: "custom", [field]: ink });
    });
    hexInput.addEventListener("change", () => {
      const ink = normalizeHex(hexInput.value);
      if (ink === null) {
        hexInput.value = settings[field];
        return;
      }
      colorInput.value = ink;
      hexInput.value = ink;
      textRow.sync("custom");
      emit({ text: "custom", [field]: ink });
    });
    return {
      row,
      sync: (value) => {
        colorInput.value = value;
        hexInput.value = value;
      },
    };
  };

  const colorRowLight = makeColorRow("自定义文字颜色 · 浅色主题", "customInk");
  const colorRowDark = makeColorRow("自定义文字颜色 · 深色主题", "customInkDark");

  const textScrimRow = rangeRow("正文底衬（字看不清时往上调）", settings.textScrim, 0, 80, 1,
    value => `${Math.round(value)}%`, value => emitTransient({ textScrim: value }));
  const textShadowRow = segmentRow("文字阴影", [
    { value: true, label: "开" },
    { value: false, label: "关" },
  ], settings.textShadow, value => emit({ textShadow: value }));
  const accentRow = swatchRow("强调色", ACCENT_PRESETS, settings.accent, value => emit({ accent: value }));
  const appearanceRow = segmentRow("外观模式", [
    { value: "auto", label: "跟随系统" },
    { value: "light", label: "始终浅色" },
  ], settings.appearance, value => emit({ appearance: value }));
  const wallpaperRow = segmentRow("壁纸显示", [
    { value: true, label: "显示" },
    { value: false, label: "关闭" },
  ], settings.wallpaper, value => emit({ wallpaper: value }));
  /* 入口按钮没有"隐藏"选项：那是个自锁开关 —— 藏起入口之后就只剩 Alt+B，
     而它又挨着滑杆，拖动时很容易被误触。入口恒定显示，位置固定在右下角。 */

  // ── 壁纸来源：内置 / 本地图片 / 图片链接 ────────────────────
  const fileInput = element("input", { type: "file", accept: "image/*" });
  const urlInput = element("input", {
    type: "url",
    placeholder: "https://example.com/wallpaper.jpg",
    value: settings.wallpaperSource.kind === "url" ? settings.wallpaperSource.value : "",
  });
  const applyUrlButton = element("button", { type: "button", text: "应用链接" });
  const sourceStatus = element("span", { class: "dsh-beach-hint" });

  const fileRow = element("div", { class: "dsh-beach-row", hidden: "" }, [fileInput]);
  const urlRow = element("div", { class: "dsh-beach-row", hidden: "" }, [
    urlInput,
    element("div", { class: "dsh-beach-url-row" }, [applyUrlButton]),
  ]);

  const describeSource = (source) => {
    if (source.kind === "file") return `已用本地图片：${source.name || "未命名图片"}`;
    if (source.kind === "url") return "已用图片链接";
    return "当前使用皮肤内置壁纸";
  };
  const setStatus = (text) => {
    sourceStatus.textContent = text;
  };

  const fileRow$ = fileRow;
  const urlRow$ = urlRow;
  const syncSourceRows = (kind) => {
    fileRow$.hidden = kind !== "file";
    urlRow$.hidden = kind !== "url";
    if (kind === "file") setStatus(describeSource(settings.wallpaperSource));
    if (kind === "url") setStatus(describeSource(settings.wallpaperSource));
  };

  const sourceRow = segmentRow("壁纸来源", [
    { value: "builtin", label: "内置" },
    { value: "file", label: "本地图片" },
    { value: "url", label: "图片链接" },
  ], settings.wallpaperSource.kind, (kind) => {
    syncSourceRows(kind);
    if (kind === "builtin") {
      emit({ wallpaperSource: { kind: "builtin", value: "", name: "" } });
      setStatus(describeSource(settings.wallpaperSource));
      return;
    }
    if (kind === "file") {
      setStatus("选择一张图片（自动缩放到 2560px 内并转 WebP）");
      return;
    }
    setStatus("填入图片直链后点“应用链接”");
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files === null ? null : fileInput.files[0];
    if (file === null || file === undefined) return;
    setStatus("正在处理图片…");
    try {
      const dataUrl = await importImageFile(file);
      emit({ wallpaperSource: { kind: "file", value: dataUrl, name: file.name } });
      setStatus(`已应用本地图片：${file.name}（${Math.round(dataUrl.length / 1024)} KB）`);
    } catch (error) {
      setStatus(`图片处理失败：${error.message}`);
    } finally {
      fileInput.value = "";
    }
  });

  applyUrlButton.addEventListener("click", () => {
    const value = sanitizeImageUrl(urlInput.value);
    if (value === "") {
      setStatus("链接需以 http(s):// 或 data:image/ 开头");
      return;
    }
    emit({ wallpaperSource: { kind: "url", value, name: "" } });
    setStatus("已应用图片链接");
  });

  const fitRow = segmentRow("铺满方式", [
    { value: "cover", label: "铺满裁切" },
    { value: "contain", label: "完整显示" },
  ], settings.wallpaperFit, value => emit({ wallpaperFit: value }));

  const panel = element("div", { class: "dsh-beach-panel", hidden: "" }, [
    element("h4", { text: "海边 ChatGPT 娘 · 皮肤设置" }),
    element("div", { class: "dsh-beach-row" }, [sourceRow.node, fileRow$, urlRow$, sourceStatus]),
    fitRow.node,
    appearanceRow.node,
    wallpaperRow.node,
    sidebarRow.node,
    panelRow.node,
    inputRow.node,
    blurRow.node,
    scrimRow.node,
    textRow.node,
    colorRowLight.row,
    colorRowDark.row,
    textScrimRow.node,
    textShadowRow.node,
    accentRow.node,
    element("div", { class: "dsh-beach-foot" }, [
      element("span", { class: "dsh-beach-hint", text: "Alt+B 开合面板" }),
      element("button", { type: "button", text: "恢复默认" }),
    ]),
  ]);
  syncSourceRows(settings.wallpaperSource.kind);
  setStatus(describeSource(settings.wallpaperSource));

  const launcher = element("button", {
    class: "dsh-beach-launcher",
    type: "button",
    title: "皮肤设置（Alt+B）",
    "aria-label": "皮肤设置",
    "aria-expanded": "false",
    text: "🌊",
  });

  /* 入口与面板一起放进一个专用容器，且渲染在它的 Shadow DOM 里：
     1) DSH 的界面由 React 渲染，React 会 reconcile 自己管理的容器，把浮层直接
        挂在 body 上，只要宿主重渲染一次就可能被顺手清掉（"点一下就没了"）；
     2) 面板样式因此完全自持 —— 宿主的全局 CSS（含 * 与 !important）碰不到它，
        面板不会因为某条规则命中而突然变形、缩窄或变透明。
     顺序是「面板在上、按钮在下」，位置由 :host 的 flex 排版决定。 */
  const host = document.createElement("div");
  host.className = "dsh-beach-host";
  const shadow = host.attachShadow({ mode: "open" });
  const styleTag = document.createElement("style");
  styleTag.textContent = PANEL_CSS;
  shadow.append(styleTag, panel, launcher);

  /* 面板内的交互不冒泡到 document：DSH 的全局处理器（点击外部关闭侧栏/弹框、
     快捷键等）不该因为有人在拖皮肤滑杆而被触发。 */
  for (const type of ["pointerdown", "mousedown", "mouseup", "click", "dblclick", "wheel", "contextmenu"]) {
    host.addEventListener(type, (event) => event.stopPropagation());
  }

  const reset = panel.querySelector(".dsh-beach-foot button");
  reset.addEventListener("click", () => {
    settings = { ...DEFAULT_SETTINGS, wallpaperSource: { ...DEFAULT_SETTINGS.wallpaperSource } };
    sidebarRow.sync(settings.sidebarGlass * 100);
    panelRow.sync(settings.panelGlass * 100);
    inputRow.sync(settings.inputGlass * 100);
    blurRow.sync(settings.blur);
    scrimRow.sync(settings.scrim);
    textRow.sync(settings.text);
    colorRowLight.sync(settings.customInk);
    colorRowDark.sync(settings.customInkDark);
    textScrimRow.sync(settings.textScrim);
    textShadowRow.sync(settings.textShadow);
    accentRow.sync(settings.accent);
    appearanceRow.sync(settings.appearance);
    wallpaperRow.sync(settings.wallpaper);
    fitRow.sync(settings.wallpaperFit);
    sourceRow.sync("builtin");
    syncSourceRows("builtin");
    urlInput.value = "";
    setStatus(describeSource(settings.wallpaperSource));
    options.onReset(settings);
  });

  const endSliderDrag = () => { delete panel.dataset.beachDragging; };
  for (const slider of panel.querySelectorAll('input[type="range"]')) {
    slider.addEventListener("pointerdown", () => {
      panel.dataset.beachDragging = "";
      document.addEventListener("pointerup", endSliderDrag, { once: true });
    });
  }

  const setOpen = (open) => {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
  };
  launcher.addEventListener("click", () => setOpen(panel.hidden));

  /* 只控制入口按钮的显隐，绝不动面板的开合：隐藏按钮是"我认得路了"，
     不是"别再让我看见面板"。面板关掉之后仍可用 Alt+B 唤回。 */
  const setVisible = (visible) => {
    launcher.hidden = !visible;
  };
  setVisible(settings.showLauncher);

  return {
    host,
    launcher,
    panel,
    setOpen,
    setVisible,
    setStatus,
    destroy() {
      host.remove();
    },
  };
}
