#!/usr/bin/env node
/**
 * 零依赖构建：把样式表、壁纸、设置面板与挂载逻辑打包成 DSH 浏览器插件要求的
 * 单一 classic script 产物 `lib/client.js`。
 *
 * 为什么需要这一步：DSH 的客户端插件产物必须是一次
 * `window.__ModuleLoader__.load({ id, factory })` 调用的惰性工厂注册——
 * 模块系统拿到的是"工厂"，副作用（含 <style> 注入）推迟到 Cordis 首次
 * import 该 entry 时才发生。手写这份包装既容易漂移，也无处安放图片内联。
 *
 * 用法：
 *   node scripts/build.mjs              # 用 assets/wallpaper-2560.webp 构建
 *   node scripts/build.mjs --art=assets/wallpaper-1920.webp
 *
 * 内置壁纸只是"默认那一张"：用户可以在设置面板里换成任意本地图片或图片链接，
 * 换图不需要重新构建（见 src/client/panel.js）。
 */

import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { dirname, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const pluginId = packageJson.name

const artArgument = process.argv.find(argument => argument.startsWith('--art='))
const artPath = resolve(root, artArgument === undefined ? 'assets/wallpaper-2560.webp' : artArgument.slice(6))

const cssPath = resolve(root, 'src/client/skin.css')
const sources = [
  resolve(root, 'src/client/panel.js'),
  resolve(root, 'src/client/apply.js'),
]
const outPath = resolve(root, 'lib/client.js')

const art = readFileSync(artPath)
const mime = basename(artPath).endsWith('.png') ? 'image/png' : 'image/webp'
const artDataUri = `data:${mime};base64,${art.toString('base64')}`

const css = readFileSync(cssPath, 'utf8').replace('__BEACH_WALLPAPER__', artDataUri)
if (css.includes('__BEACH_WALLPAPER__')) throw new Error('skin.css 未包含 __BEACH_WALLPAPER__ 占位符')

// 源码是 ESM（便于阅读与单测）；产物是无 import/export 的 classic script。
const stripModules = (source) => source
  .replace(/^export\s+(?=(?:async\s+)?(?:function|const|let|var|class)\b)/gm, '')
  .replace(/^export \{[^}]*\}\s*$/gm, '')

const bundled = sources.map((path) => {
  const source = stripModules(readFileSync(path, 'utf8'))
  if (/^\s*(import|export)\s/m.test(source)) {
    throw new Error(`${basename(path)} 仍含顶层 import/export —— 浏览器插件产物必须是自包含的 classic script`)
  }
  return `//#region ${basename(path)}\n${source.trimEnd()}\n//#endregion`
}).join('\n\n')

const tagId = `${pluginId}/skin.css`
const banner = `/* ${pluginId} v${packageJson.version} — 海边 ChatGPT 娘皮肤（由 scripts/build.mjs 生成，勿手改） */`

const output = `${banner}
window.__ModuleLoader__.load({
  id: ${JSON.stringify(pluginId)},
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    var CSS = ${JSON.stringify(css)};

    // 样式以稳定 id 挂在 <head>：DSH 的热重载按 data-plugin 清理自己名下的
    // <style>，因此标签 id 必须与包名/资源名一致，重载后不会堆积副本。
    var TAG_ID = ${JSON.stringify(tagId)};
    if (typeof document !== "undefined"
      && document.querySelector("style[data-plugin-css=" + JSON.stringify(TAG_ID) + "]") === null) {
      var tag = document.createElement("style");
      tag.dataset.plugin = ${JSON.stringify(pluginId)};
      tag.dataset.pluginCss = TAG_ID;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

${bundled.split('\n').map(line => (line.length > 0 ? '    ' + line : line)).join('\n')}

    exports.apply = apply;
    return module.exports;
  },
});
`

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, output)

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`
process.stdout.write(
  `${pluginId}: 已生成 lib/client.js\n`
  + `  壁纸    ${basename(artPath)}  ${kb(art.length)} → 内联后 ${kb(artDataUri.length)}\n`
  + `  样式表  src/client/skin.css  ${kb(statSync(cssPath).size)}\n`
  + `  脚本    ${sources.map(path => basename(path)).join(' + ')}\n`
  + `  产物    lib/client.js  ${kb(statSync(outPath).size)}\n`,
)
