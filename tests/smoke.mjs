#!/usr/bin/env node
/**
 * 行为冒烟测试：在 jsdom 里加载**已构建的产物** lib/client.js，验证皮肤契约。
 *
 * 它测的是产物而不是源码 —— DSH 装载的是 lib/client.js，源码通过只是必要条件。
 *
 * 运行：
 *   node tests/smoke.mjs                       # 需要可解析的 jsdom
 *   JSDOM_PATH=/abs/path/to/jsdom/lib/api.js node tests/smoke.mjs
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const jsdomModule = process.env.JSDOM_PATH === undefined
  ? await import('jsdom')
  : await import(pathToFileURL(resolve(process.env.JSDOM_PATH)).href)
const { JSDOM } = jsdomModule

const failures = []
const check = (label, actual, expected) => {
  const pass = actual === expected
  if (!pass) failures.push(`${label}: 期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`)
  process.stdout.write(`${pass ? "  ok  " : "  FAIL"} ${label}${pass ? "" : ` → ${JSON.stringify(actual)}`}\n`)
}

const dom = new JSDOM(
  '<!doctype html><html><head><meta name="theme-color" content="#123456"></head><body></body></html>',
  { url: 'http://127.0.0.1:3080/' },
)
const { window } = dom
globalThis.window = window
globalThis.document = window.document
globalThis.MutationObserver = window.MutationObserver
globalThis.FileReader = window.FileReader
globalThis.Image = window.Image

let registration = null
window.__ModuleLoader__ = { load: (module) => { registration = module } }

// eslint-disable-next-line no-eval -- 产物就是一段 classic script，这里如实执行它。
eval(readFileSync(resolve(root, 'lib/client.js'), 'utf8'))

check('模块注册 id', registration?.id, 'dsh-client-ui-skin-beach-chatgpt')

const exportsObject = registration.factory((name) => { throw new Error(`意外的 require: ${name}`) })
check('导出面', Object.keys(exportsObject).join(','), 'apply')

const disposers = []
const ctx = { effect: (fn) => { disposers.push(fn()) } }
exportsObject.apply(ctx)

const body = window.document.body
/** 面板渲染在宿主容器的 Shadow DOM 里；容器不在时退化为空实现，卸载断言照常成立。 */
const shadowRoot = () => body.querySelector('.dsh-beach-host')?.shadowRoot ?? {
  querySelector: () => null,
  querySelectorAll: () => [],
}
check('皮肤作用域属性', body.hasAttribute('data-dsh-beach-chatgpt'), true)
check('样式标签数（主表 + 自定义色表）', window.document.querySelectorAll('style[data-plugin="dsh-client-ui-skin-beach-chatgpt"]').length, 2)

// ── 浮层契约：皮肤的透明化与模糊不得牵连 DSH 自己的弹框 ────────
const styleText = window.document.querySelector('style[data-plugin="dsh-client-ui-skin-beach-chatgpt"]').textContent
for (const token of [
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-alias-bg-layer-3',
  '--dsw-alias-bg-overlay',
]) {
  check(`不覆盖浮层 token ${token}`, styleText.includes(token), false)
}
// 按钮 token 是唯一被收编的：只允许在侧栏作用域内重绑（影响"新会话"等
// 侧栏内按钮），绝不允许出现在全局基础块里——那样连弹框按钮一起改了。
check('按钮 token 只在侧栏作用域重绑', /:is\([^{]*sidebarCol[^{]*\{[^}]*--dsw-alias-button-elevated-fill/.test(styleText), true)
check('按钮 token 未在全局覆盖', /body\[data-dsh-beach-chatgpt\]\s*\{[^}]*--dsw-alias-button-elevated-fill/.test(styleText), false)
// 代码块 / 终端 / 工具卡的颜色一律交还官方：它们的底色与文字色（含 shiki 高亮）
// 必须由同一个来源成对给出，皮肤插手任何一边都会拆散这对配色。
check('不覆盖代码块 token', /^\s*--dsw-alias-markdown-code-block:/m.test(styleText), false)
// 终端"外壳"允许动（顶栏底色），但终端块自身的底不允许被覆盖。
check('不覆盖终端块自身底色', /\[data-terminal\]\s*\{[^}]*background-color/.test(styleText), false)

// ── 代码 / Bash 的边界：只改外壳，内部配色一律不碰 ─────────────
check('外壳用明文类名 .md-code-block', styleText.includes('.md-code-block'), true)
check('外壳用 data-terminal', styleText.includes('[data-terminal]'), true)
check('代码块只重绑组件圆角变量', styleText.includes('--dsl-code-block-border-radius: 10px'), true)
check('代码块 banner 底色走组件变量', styleText.includes('--dsl-code-block-banner-background-color: rgba(242, 246, 243, 0.96)'), true)
check('终端只重绑组件圆角变量', styleText.includes('--dsl-terminal-radius: 10px'), true)
check('不覆盖 shiki 配色', /^\s*--shiki-/m.test(styleText), false)
check('样式表不含生效的 backdrop-filter', /^\s*backdrop-filter:/m.test(styleText), false)
check('样式表不含 filter: blur', /^\s*filter:\s*blur/m.test(styleText), false)

// ── 终端外壳：容器感来自外框/顶栏，而不是动 output ─────────────
check('纸卡外框 0.14', styleText.includes('0 0 0 1px rgba(82, 124, 117, 0.14)'), true)
check('终端顶栏比代码顶栏深一档', styleText.includes('rgba(235, 241, 238, 0.92)'), true)

// ── 分层承托：背景图优先，没有任何一层是白板 ───────────────────
check('顶栏最透（40%）', styleText.includes('--beach-header-alpha: 0.40'), true)
check('正文底衬 56%', styleText.includes('--beach-text-scrim: 0.56'), true)
check('正文承托改用灰青白', styleText.includes('--beach-scrim-rgb: 235 241 239'), true)
check('渐变右侧明显更通透', styleText.includes('- 0.24'), true)
check('正文区用横向渐变承托', /\[data-chat-flow\][^{]*\{[^}]*linear-gradient\(\s*90deg/s.test(styleText), true)
check('侧栏层次靠阴影而非加深底色', styleText.includes('inset -1px 0 rgba(82, 124, 117, 0.10)'), true)
check('侧栏按钮 token 就地换成青灰玻璃', styleText.includes('--dsw-alias-button-elevated-fill: var(--beach-input-surface)'), true)
check('整页遮罩已减薄', styleText.includes('0.16 * var(--beach-scrim-strength)'), true)
check('文字白晕收到 0.20', styleText.includes('rgba(255, 255, 255, 0.20)'), true)
check('标题不吃阴影', /:is\(h1, h2, h3, h4, h5, h6\)\s*\{[^}]*text-shadow: none/.test(styleText), true)
check('顶栏下边框 1px', styleText.includes('border-bottom: 1px solid rgba(82, 124, 117, 0.14)'), true)
check('命令用主文字色', /\[data-terminal\][^{]*\[class\*="command"\][^{]*\{[^}]*#26383a/.test(styleText), true)
check('路径用辅助色', /\[data-terminal\][^{]*\[class\*="cwd"\][^{]*\{[^}]*#6b7e7f/.test(styleText), true)
check('不改写运行状态文字颜色', styleText.includes('runStateLabel'), false)
check('不碰终端 output 的颜色', /\[class\*="output"\][^{]*\{[^}]*\b(color|background)/.test(styleText), false)
check('侧栏规则不使用 backdrop-filter', /sidebarCol[^{]*\{[^}]*backdrop-filter/.test(styleText), false)
check('输入卡片不使用 backdrop-filter', /\[data-composer-card\]\s*\{[^}]*backdrop-filter/.test(styleText), false)
check('侧栏透明规则放过弹框', /sidebarCol[\s\S]*?:not\(\[role="dialog"\]\)/.test(styleText), true)
check('悬浮入口已挂载', shadowRoot().querySelectorAll('.dsh-beach-launcher').length, 1)
check('设置面板已挂载', shadowRoot().querySelectorAll('.dsh-beach-panel').length, 1)
check('浮层容器已挂载', body.querySelectorAll('.dsh-beach-host').length, 1)
check('首次运行自动展开面板', shadowRoot().querySelector('.dsh-beach-panel').hidden, false)

// ── 默认设置落到 body ─────────────────────────────────────────
check('侧栏玻璃默认值（漂浮玻璃菜单）', body.style.getPropertyValue('--beach-glass-alpha'), '0.57')
check('面板实度默认值', body.style.getPropertyValue('--beach-panel-alpha'), '0.82')
check('输入框实度默认值', body.style.getPropertyValue('--beach-input-alpha'), '0.82')
check('模糊默认值', body.style.getPropertyValue('--beach-blur'), '20px')
check('遮罩默认值', body.style.getPropertyValue('--beach-scrim-strength'), '1')
check('正文底衬默认开启', body.style.getPropertyValue('--beach-text-scrim'), '0.56')
check('默认文字档位', body.getAttribute('data-beach-text'), 'custom')
check('默认强调色', body.getAttribute('data-beach-accent'), 'sea')
check('默认壁纸开关', body.getAttribute('data-beach-wallpaper'), 'on')
check('内置壁纸不外写 --beach-art', body.style.getPropertyValue('--beach-art'), '')

// ── 面板交互：滑杆与枚举控件 ─────────────────────────────────
const clickByText = (text) => {
  const button = [...shadowRoot().querySelectorAll('.dsh-beach-panel button')]
    .find(candidate => candidate.textContent === text)
  if (button === undefined) throw new Error(`面板里没有按钮：${text}`)
  button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
  return button
}

const sliders = [...shadowRoot().querySelectorAll('.dsh-beach-panel input[type="range"]')]
check('滑杆数量（侧栏/面板/输入框/模糊/遮罩/正文底衬）', sliders.length, 6)
sliders[0].value = '80'
sliders[0].dispatchEvent(new window.Event('input', { bubbles: true }))
check('拖动侧栏玻璃滑杆即时生效', body.style.getPropertyValue('--beach-glass-alpha'), '0.8')

clickByText('暖褐')
check('切换文字颜色预设', body.getAttribute('data-beach-text'), 'warm')

// ── 自定义文字色：亮/暗各一个取色器，走按主题分支的样式表 ──────
const inkTag = () => window.document.getElementById('dsh-client-ui-skin-beach-chatgpt-ink')
const colorInputs = [...shadowRoot().querySelectorAll('.dsh-beach-panel input[type="color"]')]
check('取色器数量（浅色 / 深色各一）', colorInputs.length, 2)
const colorInput = colorInputs[0]
const darkColorInput = colorInputs[1]
const hexInput = shadowRoot().querySelector('.dsh-beach-panel .dsh-beach-hex')
check('取色器初值（浅色·青灰）', colorInput.value, '#26383a')
check('取色器初值（深色）', darkColorInput.value, '#e8edec')

colorInput.value = '#102a44'
colorInput.dispatchEvent(new window.Event('input', { bubbles: true }))
check('取色切到自定义档', body.getAttribute('data-beach-text'), 'custom')
check('浅色主题的自定义色生效', inkTag().textContent.includes('#102a44'), true)
check('深色主题走独立规则', inkTag().textContent.includes('[data-ds-dark-theme]'), true)
check('次级/三级色已派生', (inkTag().textContent.match(/rgb\(\d+, \d+, \d+\)/g) ?? []).length >= 4, true)
check('文字色不再写内联变量', body.style.getPropertyValue('--beach-ink'), '')

hexInput.value = '不是颜色'
hexInput.dispatchEvent(new window.Event('change', { bubbles: true }))
check('非法十六进制被拒绝', inkTag().textContent.includes('#102a44'), true)
hexInput.value = '#336699'
hexInput.dispatchEvent(new window.Event('change', { bubbles: true }))
check('十六进制输入生效', inkTag().textContent.includes('#336699'), true)

darkColorInput.value = '#f0e0c0'
darkColorInput.dispatchEvent(new window.Event('input', { bubbles: true }))
check('深色主题自定义色独立生效', inkTag().textContent.includes('#f0e0c0'), true)
check('浅色主题不受深色取色影响', inkTag().textContent.includes('#336699'), true)

// ── 正文底衬与文字阴影 ───────────────────────────────────────
check('文字阴影默认开启', body.getAttribute('data-beach-text-shadow'), 'on')
sliders[5].value = '40'
sliders[5].dispatchEvent(new window.Event('input', { bubbles: true }))
check('正文底衬滑杆生效', body.style.getPropertyValue('--beach-text-scrim'), '0.4')

// 输入框实度：滚动时历史文字透上来 → 用户推高它
sliders[2].value = '100'
sliders[2].dispatchEvent(new window.Event('input', { bubbles: true }))
check('输入框实度可调到完全不透明', body.style.getPropertyValue('--beach-input-alpha'), '1')
check('输入卡片用独立底色变量', /\[data-composer-card\][^{]*\{[^}]*var\(--beach-input-surface\)/.test(styleText), true)
clickByText('关')
check('文字阴影可关闭', body.getAttribute('data-beach-text-shadow'), 'off')
check('样式表含正文颜色基线', /\[data-chat-flow\][^{]*\{[^}]*color: var\(--beach-ink\)/.test(styleText), true)

const sakura = shadowRoot().querySelector('.dsh-beach-swatches button[aria-label="樱粉"]')
sakura.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
check('切换强调色', body.getAttribute('data-beach-accent'), 'sakura')

clickByText('关闭')
check('关闭壁纸', body.getAttribute('data-beach-wallpaper'), 'off')

// ── 壁纸来源：链接分支 ───────────────────────────────────────
clickByText('图片链接')
const urlInput = shadowRoot().querySelector('.dsh-beach-panel input[type="url"]')
check('链接输入行展开', urlInput.closest('.dsh-beach-row').hidden, false)
urlInput.value = 'https://example.com/beach.jpg'
clickByText('应用链接')
check('自定义壁纸写入 --beach-art', body.style.getPropertyValue('--beach-art'), 'url("https://example.com/beach.jpg")')

// 伪协议必须被拒
urlInput.value = 'javascript:alert(1)'
clickByText('应用链接')
check('拒绝伪协议链接', body.style.getPropertyValue('--beach-art'), 'url("https://example.com/beach.jpg")')

clickByText('完整显示')
check('铺满方式', body.style.getPropertyValue('--beach-art-size'), 'contain')

// ── 持久化与还原 ─────────────────────────────────────────────
const stored = JSON.parse(window.localStorage.getItem('dsh-skin-beach-chatgpt:settings:v5'))
check('设置已持久化', stored?.text, 'custom')
check('自定义色已持久化', stored?.customInk, '#336699')
check('正文底衬已持久化', stored?.textScrim, 40)
check('壁纸来源已持久化', stored?.wallpaperSource?.kind, 'url')

clickByText('恢复默认')
check('恢复默认：文字档位', body.getAttribute('data-beach-text'), 'custom')
check('恢复默认：浅色自定义色复位', inkTag().textContent.includes('#26383a'), true)
check('恢复默认：深色自定义色复位', inkTag().textContent.includes('#e8edec'), true)
check('恢复默认：文字阴影', body.getAttribute('data-beach-text-shadow'), 'on')
check('恢复默认：壁纸来源', body.style.getPropertyValue('--beach-art'), '')

// ── 滑杆拖动不会让面板消失（回归：一点就没） ─────────────────
const glassSlider = shadowRoot().querySelector('.dsh-beach-panel input[type="range"]')
for (const value of ['30', '45', '60', '72']) {
  glassSlider.value = value
  glassSlider.dispatchEvent(new window.Event('input', { bubbles: true }))
}
check('拖动后仍应用最新值', body.style.getPropertyValue('--beach-glass-alpha'), '0.72')
check('拖动后面板仍在', shadowRoot().querySelector('.dsh-beach-panel').hidden, false)
check('拖动后入口仍在', shadowRoot().querySelector('.dsh-beach-launcher').hidden, false)

// ── 回归：拖动滑杆期间按钮全部让位，面板不会被"顺手"关掉 ────
// （曾经的成因：入口按钮有"隐藏"选项，且拖动松手容易误触到它。）
glassSlider.dispatchEvent(new window.Event('pointerdown', { bubbles: true }))
check('按住滑杆进入拖动锁定', shadowRoot().querySelector('.dsh-beach-panel').hasAttribute('data-beach-dragging'), true)
check('面板样式含拖动锁定规则', shadowRoot().querySelector('style').textContent.includes('[data-beach-dragging]'), true)
for (const value of ['24', '38', '52']) {
  glassSlider.value = value
  glassSlider.dispatchEvent(new window.Event('input', { bubbles: true }))
}
check('拖动后面板仍开着', shadowRoot().querySelector('.dsh-beach-panel').hidden, false)
document.dispatchEvent(new window.Event('pointerup', { bubbles: true }))
check('松手后解除拖动锁定', shadowRoot().querySelector('.dsh-beach-panel').hasAttribute('data-beach-dragging'), false)
await new Promise(resolve => setTimeout(resolve, 240))
check('落盘之后面板仍开着', shadowRoot().querySelector('.dsh-beach-panel').hidden, false)
check('面板里不再有会藏起入口的开关', [...shadowRoot().querySelectorAll('.dsh-beach-panel button')].some(button => button.textContent === '隐藏'), false)

// ── 自愈：宿主把浮层清掉后应自动挂回 ─────────────────────────
const host = body.querySelector('.dsh-beach-host')
host.remove()
await new Promise(resolve => setTimeout(resolve, 5))
check('浮层被移除后自动挂回', body.querySelectorAll('.dsh-beach-host').length, 1)

// ── 外观：默认跟随宿主，只有"始终浅色"档才摘除暗色标记 ────────
const settle = () => new Promise(resolve => setTimeout(resolve, 5))
check('样式表含暗色分支', styleText.includes('[data-ds-dark-theme]'), true)

document.body.setAttribute('data-ds-dark-theme', '')
await settle()
check('跟随档位下保留宿主的暗色标记', document.body.hasAttribute('data-ds-dark-theme'), true)

clickByText('始终浅色')
await settle()
check('始终浅色档摘除 body 上的暗色标记', document.body.hasAttribute('data-ds-dark-theme'), false)
document.documentElement.setAttribute('data-ds-dark-theme', '')
await settle()
check('始终浅色档摘除 html 上的暗色标记', document.documentElement.hasAttribute('data-ds-dark-theme'), false)

clickByText('跟随系统')
await settle()
check('切回跟随后暗色标记放回', document.body.hasAttribute('data-ds-dark-theme'), true)

// ── 卸载还原 ─────────────────────────────────────────────────
for (const dispose of disposers) dispose()
check('卸载后作用域属性移除', body.hasAttribute('data-dsh-beach-chatgpt'), false)
check('卸载后面板移除', shadowRoot().querySelectorAll('.dsh-beach-panel').length, 0)
check('卸载后入口移除', shadowRoot().querySelectorAll('.dsh-beach-launcher').length, 0)
check('卸载后内联变量清理', body.style.getPropertyValue('--beach-glass-alpha'), '')
check('卸载后自定义色样式表移除', inkTag(), null)
check('卸载后 theme-color 还原', window.document.querySelector('meta[name="theme-color"]').content, '#123456')
check('卸载后暗色标记未被吞掉（body）', document.body.hasAttribute('data-ds-dark-theme'), true)

process.stdout.write(failures.length === 0
  ? '\n全部通过\n'
  : `\n${failures.length} 项失败:\n${failures.map(line => `  - ${line}`).join("\n")}\n`)
process.exit(failures.length === 0 ? 0 : 1)
