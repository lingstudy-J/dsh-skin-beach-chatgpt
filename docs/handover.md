# 交接文档 · 海边 ChatGPT 娘皮肤插件

> **读者**：接手这个仓库的下一个会话（人或 AI）。本文件**自包含**——不需要任何前序对话即可上手。
> **基线**：`55d3368`（2026-09-16）· 工作区 `tests/smoke.mjs` **134 条断言全绿**（含一轮视觉修订，见 §6 第 17–20 条）
> **状态**：功能与视觉均已定型，处于"只做微调、不重构"阶段

---

## 0. 30 秒摘要

DeepSeek Harness（DSH）Web GUI 的**整页壁纸皮肤插件**：一张 4K 海边壁纸铺满界面，UI 是浮在壁纸上的一层层**可调透明度的青灰玻璃**。纯展示层插件，不改任何功能、不碰模型与会话数据。仓库同时是一个**可一行安装的 DSH bundle 插件**。

---

## 1. 项目坐标

| 项 | 值 |
| --- | --- |
| 本仓库（工作区） | `C:\Users\SirLi\Desktop\deepseek-harness\deepseek-harness\dsh-skin-beach-chatgpt` |
| GitHub | `lingstudy-J/dsh-skin-beach-chatgpt`（署名：shiwu） |
| 包名 | `dsh-client-ui-skin-beach-chatgpt` |
| 本地安装副本 1 | `~/.dsh/plugins/dsh-skin-beach-chatgpt/`（由 install 脚本写入） |
| 本地安装副本 2 | `~/.dsh/profiles/web/node_modules/dsh-client-ui-skin-beach-chatgpt/`（运行中的 web profile） |
| 本地安装副本 3 | `~/.dsh/profiles/desktop/node_modules/dsh-client-ui-skin-beach-chatgpt/`（桌面端 profile） |
| 运行中的 GUI | `http://127.0.0.1:3080`（由 `pnpm dsh web` 启动，**改 bundle 后需刷新或重启**） |
| DSH 源码参考 | `C:\Users\SirLi\Desktop\deepseek-harness\deepseek-harness`（读组件源码时必须用，禁止猜 class） |

**同步四份**：改动源目录后，必须同步到上面三处副本，否则运行中的 GUI 看不到变化（见 §7）。

---

## 2. 当前状态

### 已定型（不要再动）

- 壁纸加载与切换：内置 / 本地图片 / 图片链接；铺满裁切 / 完整显示；壁纸显示开关
- 外观模式：跟随系统 / 始终浅色（"始终浅色"会摘掉宿主的暗色标记）
- 六档分层承托（顶栏 40% / 侧栏 57% / 正文 56% 横向渐变 / 用户气泡 78% / 输入框 82% / 面板 92%）
- 青灰配色体系（正文 `#26383A`、标题 `#17292C`、链接 `#2E716C`、强调 `#527C75`）
- 代码块 / Bash / Terminal 的**外壳**处理（内部一律官方）
- 皮肤自带设置面板（右下角 🌊 / Alt+B）
- 设置持久化（`localStorage` 键 `dsh-skin-beach-chatgpt:settings:v5`）
- 134 条防回归断言

### 未完成 / 可选项

| 项 | 说明 |
| --- | --- |
| `preview/*.webp` 截图 | 需要反映**最新**视觉的整窗截图（当前那份是较早版本） |
| 输入卡片 82% 的残留穿透 | 滚动到会话底部时，下层历史文字仍会从输入卡透出来（82% 透射 18%，挡不住深色正文）。所有者**知情保留**：通透感优先，需要的人自己在面板里推高"输入框实度"。若要改默认值，必须同时做一次设置迁移（从 v5 读旧记录、只把仍是旧默认 0.82 的值抬上去），否则老用户本地存着的 0.82 会盖掉新默认。 |
| Shiki 青灰主题 | DSH 有完整接口（12 个 `--shiki-*` 变量），已调研但**刻意未实施**，见 §11 |
| 英文交接文档 | 本文件仅中文；README 是中英双语 |

---

## 3. 硬约束（项目所有者的明确要求，务必遵守）

以下每一条都是**踩坑后立的规矩**，违反会导致已经修好的问题复发：

**绝不修改**

- Shiki 的 `--shiki-*` 配色、`pre` 内部前景/背景
- `[data-terminal]` / `xterm` 的前景/背景、ANSI palette
- `--dsw-alias-markdown-code-block`（官方是**跟随主题**的：亮色浅底、暗色深底）
- terminal output 的 `background` / `color`

**绝不允许**

- 用 `filter: blur` / `backdrop-filter` / `opacity` 或透明伪元素去"处理"文字与终端内容
- 宽泛选择器：`[class*="content"]`、`[class*="code"]`、`[class*="terminal"]` 这种泛词（用 `data-*` 属性、ARIA 角色、或 DSH 自己写的**明文类名**）
- 大面积白色遮罩、明显 blur、新增全局伪元素
- 为了"可读性"把 UI 做成普通白色后台
- 重新设计已定型的部分；新增设置项（非必要）；重构设置持久化（**除非确有必要，不要升 key 版本**）

**允许的例外**

- `backdrop-filter` 的**唯一**合法位置：侧栏列表容器 `[class*="listArea"]`（`blur(1.5px) saturate(0.96)`），且必须给列表内菜单/弹层留 `z-index` 兜底
- 修改前**必须**先读 DSH 组件源码确认真实 DOM 与稳定选择器，不许猜

---

## 4. 架构与加载链路

```
profile package.json
  └─ dsh.profile.bundles: [..., dsh-client-ui-skin-beach-chatgpt]
        └─ 本包 package.json 声明 dsh.bundle.patch → cordis.patch.yml
              └─ cordis.patch.yml 插入行 { id: ui-skin-beach-chatgpt, name: dsh-client-ui-skin-beach-chatgpt }
                    ├─ host 侧：lib/index.js 的空 apply()（占位，保证 entry 可挂载）
                    └─ client 侧：dsh.client 声明让 DSH 把 lib/client.js 作为浏览器 entry 送达
                       它调用 window.__ModuleLoader__.load({ id, factory }) 惰性注册工厂，
                       物化时注入 <style>，并由 Cordis 调用导出的 apply(ctx)
```

### 源码与产物

| 文件 | 行数 | 作用 |
| --- | --- | --- |
| `src/client/skin.css` | 631 | **唯一表现层真相**。所有颜色/尺寸变量 + 全部规则 |
| `src/client/panel.js` | 860 | 自带设置面板（Shadow DOM 内自持样式）+ 设置读写 + 图片导入 |
| `src/client/apply.js` | ~100 | 挂载逻辑：打 body 属性、落设置、挂面板、主题联动、卸载还原 |
| `scripts/build.mjs` | 101 | **零依赖**构建：CSS + 壁纸 + 两个脚本 → `lib/client.js`（已提交） |
| `scripts/configure.mjs` | 265 | 零依赖安装配置器（写 profile、皮肤互斥、皮肤中心让步） |
| `tests/smoke.mjs` | 325 | jsdom 行为冒烟测试，**测的是产物而非源码** |

### 两个内容源的分工

- **皮肤样式表**（`skin.css`）：注入到 `document.head`，全部规则以 `body[data-dsh-beach-chatgpt]` 为根
- **设置面板样式**（`panel.js` 的 `PANEL_CSS`）：注入到面板自己的 **Shadow DOM**，不依赖 body 属性、不受宿主全局 CSS 影响

---

## 5. 设计决策（为什么是这样）

1. **分层承托，而不是统一透明度**：越需要阅读/交互的地方越实（输入框 82% > 气泡 78% > 正文 56%），越属于 chrome 的越透（侧栏 57% > 顶栏 40%）。统一的是**颜色语言、圆角语言、边框语言、阴影语言**，不是透明度。
2. **一张连续的壁纸**：壁纸只在 body 上画一次（`fixed` + `cover`），布局列一律透明；正文区额外叠一条**横向渐变**（左 61% → 中 56% → 右 32%），顺着背景构图：左侧文字密、承托强，右侧把海面和夕阳让出来。
3. **代码/Bash 只做外壳**：内部配色必须由同一个来源成对给出（官方 token + shiki 主题），皮肤插手任何一边都会拆散配对。外壳用**组件自己声明的可重绑变量**（`--dsl-code-block-border-radius`、`--dsl-code-block-banner-background-color`、`--dsl-terminal-radius`），外框用 `box-shadow: 0 0 0 1px` 画而不是 `border`（后者会改变盒模型、挤动内容 1px）。
4. **面板自带且自持**：住在 Shadow DOM 里，不 require 任何 DSH 服务、不注册 slot，因此任何 DSH 版本都能用，也不会和皮肤中心争入口。
5. **自定义文字色按主题分开**：内联 CSS 变量会盖掉一切选择器（含暗色分支），所以自定义色改为**注入按主题分支的样式表**（`#dsh-client-ui-skin-beach-chatgpt-ink`）。
6. **设置键升版策略**：只有当**默认值变更需要立刻生效**时才升 key 版本（旧记录会覆盖新默认）。历史：v1 → v2 → v3 → v4 → **v5（当前）**。

---

## 6. 踩过的坑（现象 → 根因 → 修法 → 守护断言）

| # | 现象 | 根因 | 修法 | 断言 |
| --- | --- | --- | --- | --- |
| 1 | 设置弹框被压回侧栏那一层 | `backdrop-filter` 给侧栏列建立了层叠上下文 | 侧栏列/顶栏/输入卡一律不加 blur | 侧栏列本身不使用 backdrop-filter |
| 2 | 弹框变成半透明 | 皮肤覆盖了 `--dsw-alias-bg-layer-*` / `bg-overlay` | 浮层 token 移出白名单 | 不覆盖浮层 token ×5 |
| 3 | 亮色下代码块一片糊 | 把跟随主题的 `--dsw-alias-markdown-code-block` 钉成永远深青 → 深底深字 | 撤销覆盖（该 token 亮浅暗深） | 不覆盖代码块 token |
| 4 | 切深色后界面"消失" | 暗色文字近白 + 亮壁纸 + 遮罩太轻 | 暗色遮罩加重 0.52/0.70、玻璃 0.34 | 样式表含暗色分支 |
| 5 | 滚历史时输入框文字被穿透 | 输入卡半透明（88% 与气泡共用） | 独立 `--beach-input-alpha`，默认 82% | 输入卡片用独立底色变量 |
| 6 | 面板"一点就没了" | 挂在 body 上被 React 重渲染清掉 | 独立 `.dsh-beach-host` + MutationObserver 自愈重挂 | 浮层被移除后自动挂回 |
| 7 | 拖滑杆面板消失 | "隐藏入口"开关紧邻滑杆，松手误触；且 `setVisible(false)` 连带关面板 | 删掉该开关；拖动期间面板内按钮 `pointer-events: none` | 拖动后面板仍在 / 面板里不再有藏入口的开关 |
| 8 | 浅色挑的文字色污染深色 | 自定义色写**内联变量**，优先级高过暗色分支 | 改注入按主题分支的样式表 + 亮暗两个取色器 | 文字色不再写内联变量 |
| 9 | 项目名比会话名淡一档 | 分组规则误把 `.projectText`（**文字容器**）列进设色 | 容器不设色，颜色交回 `label-primary` | 分组规则不再命中 projectText |
| 10 | 列表底部行发糊 | `.fade`（官方 24px 底部渐隐）渐到 `--dsw-specific-sidebar-fill` = 不透明近白，叠在 57% 玻璃上成为偏白实带 | 在侧栏作用域把该 token 绑成侧栏自己的合成色 | 底部 fade 绑到侧栏自身玻璃色 |
| 11 | 时间文字和标题一样粗 | 整行 `[role="treeitem"]{font-weight:500}` 被无 font-weight 的子元素继承 | 按元素收回 `font-weight: 400` | 时间文字保持 400 字重 |
| 12 | 思考过程里的 bash 糊成一片 | 终端容器被设成象牙白底，而终端文字是浅色 | 撤销对终端的一切颜色干预（官方 token 跟随主题） | 不覆盖终端块自身底色 |
| 13 | 安装目录混入 `.git` | `cp -r` 同步时把版本库一起带过去 | 同步后 `rm -rf <副本>/.git` | — |
| 14 | Windows 上 install.ps1 中文乱码 | PowerShell 5.1 按 ANSI 读无 BOM 的 .ps1 | 给 .ps1 加 UTF-8 BOM | — |
| 15 | `install.sh` 在 macOS/Linux 报 `/bin/bash^M` | Windows 检出把 LF 变 CRLF | 加 `.gitattributes`（`*.sh text eol=lf`） | — |
| 16 | `pnpm install` 被发布年龄门槛拦下 | `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`（与本次安装无关的包） | 安装脚本自动降级重试 `--config.minimumReleaseAge=0` | — |
| 17 | 侧栏版本号徽标是一块**深色实心胶囊**，是整片浅玻璃上唯一的硬黑块 | 组件拿 `label-primary` 当底色（`SidebarRoot.module.css`），而皮肤把该 token 绑成了正文深青 `#26383a` | 在侧栏作用域把它换回侧栏玻璃与次级文字（`[class*="buildVersion"]`，全仓库唯一类名），几何不动 | 版本徽标不再拿 label-primary 当底 |
| 18 | 侧栏列表底部有一条横向亮带 | 官方 `.fade`（列表底部 24px 渐隐）渐到 `--dsw-specific-sidebar-fill`＝纯玻璃，而它上面的承托区还多一层 22% 白 | 承托末尾 24px 收尾到 0，与 `.fade` 的 24px 对齐——渐隐终点与该处合成色一致 | 列表承托在底部收尾到 0（2 条） |
| 19 | "会话 / 工作区"区域标题几乎看不见 | 该标题在 `[class*="listArea"]` **之外**，读的是被压到弱化档的全局 `label-tertiary`（实测该处背景亮度仅 0.19，对比 1.19:1） | 在侧栏作用域提到分组标题档。**`.searchButton` 是 `color: inherit`，但父级 `.search` 自带颜色，不会被连带改到**——改这类规则前必须连同子元素一起追一遍 | 区域标题提到分组标题档 |
| 20 | 会话统计行（"37 轮 · 306 步 …"）在照片上读不出来 | composer dock 卡片与正文一样落在照片上，却仍读全局弱化档 | 提到次级档：`[data-composer-card] ~ *`（渲染在输入卡之后的 dock 卡片）。实测 3.13:1 → 5.06:1 | 统计行提到次级档 |

---

## 7. 操作手册

### 改 → 构建 → 测试 → 同步（一趟完整命令）

```bash
cd /c/Users/SirLi/Desktop/deepseek-harness/deepseek-harness/dsh-skin-beach-chatgpt
node scripts/build.mjs && node --check lib/client.js
JSDOM_PATH=/c/Users/SirLi/Desktop/deepseek-harness/deepseek-harness/node_modules/.pnpm/jsdom@29.1.1_@noble+hashes@2.3.0/node_modules/jsdom/lib/api.js \
  node tests/smoke.mjs    # 期望 "全部通过"

# 同步三处安装副本（源目录 = 第 4 处）
cd /c/Users/SirLi/Desktop/deepseek-harness/deepseek-harness
cp -r dsh-skin-beach-chatgpt/. ~/.dsh/plugins/dsh-skin-beach-chatgpt/
rm -rf ~/.dsh/plugins/dsh-skin-beach-chatgpt/.git
for p in web desktop; do
  D=~/.dsh/profiles/$p/node_modules/dsh-client-ui-skin-beach-chatgpt
  cp -f dsh-skin-beach-chatgpt/lib/client.js dsh-skin-beach-chatgpt/src/client/skin.css \
        dsh-skin-beach-chatgpt/src/client/panel.js dsh-skin-beach-chatgpt/src/client/apply.js "$D/"
done
```

改完只需刷新页面（host 会 stat 到 bundle 变化并广播 HMR）；若没生效，重启 `pnpm dsh web`。

### 只改 CSS

`skin.css` 是构建输入，改完**必须**跑 `build.mjs` 重新内联进 `lib/client.js`，否则线上无变化。

### 本地验证（不动用户的 3080 实例）

```bash
cd /c/Users/SirLi/Desktop/deepseek-harness/deepseek-harness
(node --import tsx/esm apps/cli/src/bin.ts web --port 3099 --no-open > /tmp/dsh-verify.log 2>&1 &)
# 从日志里取 token 换 cookie，再请求
#   /                            → HTML，检查 __DSH_BOOT__ 里有没有本插件
#   /plugins/??<id>/client.js&rev=<rev>  → 200 且首行是 __ModuleLoader__.load
# 验证完 kill 掉进程
```

### 发布

```bash
git add -A && git commit -m "..." && git push origin main
# 别人一行安装：
#   dsh plugin --profile web add github:lingstudy-J/dsh-skin-beach-chatgpt
```

---

## 8. 测试体系

- 位置：`tests/smoke.mjs`，**134 条断言**，**测的是构建产物 `lib/client.js`**（DSH 装载的也是它，源码通过只是必要条件）
- 运行：需要 jsdom；本机可从 DSH 仓库的 pnpm store 借：
  `JSDOM_PATH=<repo>/node_modules/.pnpm/jsdom@29.1.1_@noble+hashes@2.3.0/node_modules/jsdom/lib/api.js node tests/smoke.mjs`
- 面板在 Shadow DOM 内，测试通过 `host.shadowRoot` 查询
- **断言的设计原则**：每条都对应一个曾经的 bug 或一条硬约束，而不是"覆盖率"。新增功能/修 bug 时**必须**同步加断言——这是这个仓库唯一的回归防线

覆盖范围：模块契约（id / factory / 导出）、皮肤作用域属性、样式注入、面板挂载与自愈、设置默认值与持久化、壁纸来源（含伪协议拒绝）、文字颜色按主题分支、外观模式与暗色标记摘除/还原、拖动锁定、浮层 token 不覆盖、代码/终端边界、侧栏清晰度与承托、卸载还原。

---

## 9. 视觉参数总表（亮色）

| 层 | 变量 | 值 |
| --- | --- | --- |
| 顶栏 | `--beach-header-alpha` | 0.40 |
| 侧栏 | `--beach-glass-alpha` + `--beach-sidebar-rgb: 239 243 240` | 0.57 |
| 正文承托 | `--beach-text-scrim` + `--beach-scrim-rgb: 235 241 239` | 0.56（渐变 +0.05 / −0.24） |
| 侧栏列表 | `[class*="listArea"]` | 承托 `.22 → .14` + `blur(1.5px) saturate(0.96)` |
| 用户气泡 | `--beach-bubble-user` | `rgba(218,234,229,.78)` |
| 输入框 | `--beach-input-alpha` + `--beach-input-rgb: 248 247 242` | 0.82 |
| 皮肤面板 | `--beach-surface-solid` | `rgb(250 249 246 / .92)` |
| 整页遮罩 | `--beach-scrim` | 0.16 / 0.30 |
| 壁纸薄雾 | `--beach-veil` | `rgba(26,52,54,.06)` |

文字：正文 `--beach-ink #26383a`、标题 `--beach-ink-strong #17292c`、小标题 `--beach-ink-h3 #243c3e`、次级 `--beach-ink-soft #52686a`、弱化 `--beach-ink-faint #78898a`、链接 `--beach-link #2e716c`（hover `#225b58`）、白晕 `rgba(255,255,255,.20)`（**标题不吃阴影**）。

侧栏：会话名 `#24383a`/500、项目名同值、时间 `#596d6f`/400、分组标题 `#596d6e`/500、图标 `#4f6667`（hover `#2e716c`）、Hover `.46`、Active `.62` + `#1f3435`/600。

---

## 10. 变更历史（29 个 commit，按主题归并）

| 阶段 | 提交 |
| --- | --- |
| 初版与作者信息 | `5d60eb5` → `834b8e4` → `b37e6d1` → `6c61bf0` |
| 双语 README + 预览图 | `c8c02ec` → `7cc5fef` → `9990a3a` → `cb4041e` |
| 输入框穿透 / 青灰配色 / 面层重建 | `3ac493a` → `7335e99` → `0ddd007` → `5c647b6` |
| 代码块与终端（三轮试错后定为"只做外壳"） | `ab89875` → `46a8ee9` → `0f30850` → `38f1121` → `8731022` → `289134a` |
| 背景图优先 + 去白膜 | `29b7aa3` → `78331a7` |
| 新会话按钮与面板配色统一 | `bbd6a17` |
| 侧栏清晰度（六轮收敛） | `ca8c979` → `a9dbe28` → `ec70481` → `f3fd59c` → `dc0a968` → **`55d3368`（当前基线）** |

---

## 11. 已调研但刻意未做的事

**Shiki 青灰主题**：DSH 的 shiki 走 **CSS 变量主题**，配色全在 12 个 `--shiki-*` 变量上（`packages/client/ui-theme/src/styles/shiki.css`，亮色在 `:root`、暗色在暗色属性下，成对给出）：

```
--shiki-foreground  --shiki-background  --shiki-token-constant
--shiki-token-string  --shiki-token-comment  --shiki-token-keyword
--shiki-token-parameter  --shiki-token-function
--shiki-token-string-expression  --shiki-token-punctuation  --shiki-token-link
```

覆盖这**一整组**才是"整套主题一起换"（`background: dark; color: white` 那种硬覆盖只会让亮色主题的高亮色失去对比——这个坑踩过，见 §6 第 3 条）。未经所有者明确要求**不要实施**；实施也必须亮暗两套同时给全。

**终端 ANSI 没有等价接口**：`ui-primitives/src/ansi.ts` 把基本 8/16 色映射到 `--dsw-alias-state-*` 与 label 色，256 色/truecolor 用字面 rgb —— 它复用全局状态语义，皮肤层不该动。

---

## 12. 给接手者的三条建议

1. **先读 §3 硬约束，再读 §6 坑表**——这个项目 90% 的返工都来自这两处没读。
2. **改任何东西之前先读 DSH 源码**确认稳定选择器：`.md-code-block`、`[data-terminal]`、`[role="treeitem"]`、`[aria-selected="true"]`、`.listArea` 这些都是从源码里确认过的。
3. **改动必须配断言**。这个仓库没有类型检查、没有 e2e，134 条断言就是全部安全网。
