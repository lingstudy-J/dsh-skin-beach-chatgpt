/**
 * 海边 ChatGPT 娘 —— 浏览器侧挂载逻辑。
 *
 * 职责有三：给 body 打上皮肤作用域属性、把用户设置（localStorage）落到 CSS 变量、
 * 挂载自带的设置面板。全部写入都通过 Cordis 的 `ctx.effect` 注册还原器：
 * 卸载（或热重载）时，body 属性、内联变量、面板 DOM 与 theme-color 元数据都会
 * 回到挂载前的状态，不留残余。
 *
 * @param ctx - 拥有本插件的 Cordis 上下文。
 */
export function apply(ctx) {
  if (typeof document === "undefined" || document.body === null) return;

  const SKIN_ATTRIBUTE = "data-dsh-beach-chatgpt";
  const DARK_ATTRIBUTE = "data-ds-dark-theme";
  const SYSTEM_CHROME_LIGHT = "#2f86ad";
  const SYSTEM_CHROME_DARK = "#08192a";

  const body = document.body;
  const previousAttribute = body.getAttribute(SKIN_ATTRIBUTE);
  const themeColorMeta = document.head?.querySelector('meta[name="theme-color"]') ?? null;
  const previousThemeColor = themeColorMeta?.getAttribute("content") ?? null;
  const storage = safeStorage();

  let settings = loadSettings(storage);
  let panel = null;

  /* 外观默认跟随宿主（亮/暗都提供）。"始终浅色"档才去摘掉宿主的暗色标记：
     摘了它，DSH 自己也走亮色分支，整套界面不会出现"浅色壁纸 + 深色弹框"。 */
  const wantsForcedLight = () => settings.appearance === "light";
  const suppressedDark = [];
  const suppressDarkTheme = () => {
    if (!wantsForcedLight()) return;
    for (const element of [document.documentElement, body]) {
      if (element === null || element === undefined || !element.hasAttribute(DARK_ATTRIBUTE)) continue;
      if (!suppressedDark.some(entry => entry.element === element)) {
        suppressedDark.push({ element, value: element.getAttribute(DARK_ATTRIBUTE) });
      }
      element.removeAttribute(DARK_ATTRIBUTE);
    }
  };
  const restoreDarkTheme = () => {
    for (const entry of suppressedDark) {
      if (entry.value === null) entry.element.removeAttribute(DARK_ATTRIBUTE);
      else entry.element.setAttribute(DARK_ATTRIBUTE, entry.value);
    }
    suppressedDark.length = 0;
  };

  /** 系统界面（窗口控件区/移动端状态栏）跟随当前实际外观。 */
  const syncSystemChrome = () => {
    if (themeColorMeta === null) return;
    const next = body.hasAttribute(DARK_ATTRIBUTE) ? SYSTEM_CHROME_DARK : SYSTEM_CHROME_LIGHT;
    if (themeColorMeta.getAttribute("content") !== next) themeColorMeta.setAttribute("content", next);
  };

  const syncAppearance = () => {
    if (wantsForcedLight()) suppressDarkTheme();
    else restoreDarkTheme();
    syncSystemChrome();
  };

  const commit = (next, meta) => {
    const launcherVisibilityChanged = next.showLauncher !== settings.showLauncher;
    const appearanceChanged = next.appearance !== settings.appearance;
    settings = next;
    applySettings(body, next);
    if (appearanceChanged) syncAppearance();
    if (panel === null) return;
    if (launcherVisibilityChanged) panel.setVisible(next.showLauncher);
    // 拖动滑杆时只改样式：每个像素写一次 localStorage 既卡手也没必要。
    if (meta !== undefined && meta.transient === true) return;
    if (!saveSettings(storage, next) && next.wallpaperSource.kind === "file") {
      panel.setStatus("图片已应用，但超出浏览器本地存储配额，刷新后不会保留");
    }
  };

  body.setAttribute(SKIN_ATTRIBUTE, "");
  applySettings(body, settings);

  panel = createSettingsPanel({
    settings,
    onChange: commit,
    onReset: (reset) => commit(reset),
  });
  body.append(panel.host);

  // 首次运行（本地还没有任何设置记录）时自动展开一次：否则新装的人根本
  // 不知道右下角多了一个入口，也不知道皮肤可以调。
  if (storage.getItem(SETTINGS_STORAGE_KEY) === null) panel.setOpen(true);

  /* 自愈：DSH 的界面由 React 渲染，宿主重渲染时可能连我们挂在 body 上的
     浮层一起清掉（表现就是"点一下就消失"）。发现它掉线就立刻挂回去。 */
  const hostKeeper = new MutationObserver(() => {
    if (panel.host.isConnected) return;
    setTimeout(() => {
      if (!panel.host.isConnected) body.append(panel.host);
    }, 0);
  });
  hostKeeper.observe(body, { childList: true });

  // Alt+B 开合面板：隐藏了悬浮按钮的人仍然有入口。
  const onKeyDown = (event) => {
    if (!event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== "b" && event.key !== "B") return;
    event.preventDefault();
    panel.setOpen(panel.panel.hidden);
  };
  window.addEventListener("keydown", onKeyDown);

  // 先按外观档位处理标记，再定 theme-color：顺序反了会让系统界面闪一下深色。
  syncAppearance();
  // 宿主每次切换亮/暗都会重写这个标记：跟随档位是同步 theme-color，
  // "始终浅色"档则把它再摘掉。
  const themeObserver = new MutationObserver(() => {
    if (wantsForcedLight()) suppressDarkTheme();
    syncSystemChrome();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: [DARK_ATTRIBUTE] });
  themeObserver.observe(body, { attributes: true, attributeFilter: [DARK_ATTRIBUTE] });

  ctx.effect(() => () => {
    themeObserver.disconnect();
    restoreDarkTheme();
    hostKeeper.disconnect();
    window.removeEventListener("keydown", onKeyDown);
    panel.destroy();
    clearSettings(body);
    if (previousAttribute === null) body.removeAttribute(SKIN_ATTRIBUTE);
    else body.setAttribute(SKIN_ATTRIBUTE, previousAttribute);
    if (themeColorMeta !== null && previousThemeColor !== null) {
      themeColorMeta.setAttribute("content", previousThemeColor);
    }
  }, "ui-skin-beach-chatgpt: backdrop, palette and settings panel");
}

/** localStorage 在隐私模式/被策略禁用时会抛错；退化成一个内存实现。 */
function safeStorage() {
  try {
    const storage = window.localStorage;
    const probeKey = "dsh-skin-beach-chatgpt:probe";
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    return storage;
  } catch {
    const memory = new Map();
    return {
      getItem: (key) => (memory.has(key) ? memory.get(key) : null),
      setItem: (key, value) => memory.set(key, String(value)),
      removeItem: (key) => memory.delete(key),
    };
  }
}
