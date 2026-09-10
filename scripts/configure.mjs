#!/usr/bin/env node
/**
 * 零依赖安装配置器：把本插件接进 DSH profile，或把它完整摘出来。
 *
 * 一条命令里做三件事，全部幂等、全部先备份：
 *   1. profile 的 package.json：新增/移除 `dependencies` 条目与 `dsh.profile.bundles` 层；
 *   2. 皮肤互斥：在 `$DSH_HOME/cordis.patch.yml` 里维护一个带标记的区段，
 *      把其它 DSH 皮肤插件的行置为 disabled（标记区段之外的用户配置一字不动）；
 *   3. 皮肤中心让步：`$DSH_HOME/skin-center-active.json` 的 `active` 清空并备份，
 *      避免两套整页背景叠加。
 *
 * 用法：
 *   node scripts/configure.mjs install   --dsh-home ~/.dsh [--profiles web,desktop] [--skip-exclusive]
 *   node scripts/configure.mjs uninstall --dsh-home ~/.dsh [--profiles web,desktop]
 *
 * `--profiles` 省略时自动取 `$DSH_HOME/profiles` 下所有含 package.json 的 profile。
 * 本脚本不跑 pnpm —— 依赖安装由调用它的 install 脚本在 profile 目录内执行。
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, rmSync, copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const pluginRoot = resolve(here, '..')
const manifest = JSON.parse(readFileSync(join(pluginRoot, 'package.json'), 'utf8'))
const PLUGIN_NAME = manifest.name
const SKIN_ROW_ID = manifest.dsh?.id === undefined ? 'ui-skin-beach-chatgpt' : 'ui-skin-beach-chatgpt'
const SKIN_JSON = JSON.parse(readFileSync(join(pluginRoot, 'skin.json'), 'utf8'))
const OWN_WIRING_ID = SKIN_JSON.wiring?.id ?? SKIN_ROW_ID

const EXCLUSIVE_BEGIN = '# >>> dsh-skin-beach-chatgpt exclusive >>>'
const EXCLUSIVE_END = '# <<< dsh-skin-beach-chatgpt exclusive <<<'

const log = (message) => process.stdout.write(`  ${message}\n`)

/** 解析 `--key value` 与 `--flag`。 */
function parseArgs(argv) {
  const options = { action: argv[0], flags: new Set(), values: new Map() }
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) continue
    const [key, inline] = token.slice(2).split('=')
    if (inline !== undefined) options.values.set(key, inline)
    else if (argv[index + 1] !== undefined && !argv[index + 1].startsWith('--')) {
      options.values.set(key, argv[index + 1])
      index += 1
    } else options.flags.add(key)
  }
  return options
}

function timestamp() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

/** 备份一份文件（幂等调用会得到多份带时间戳的副本）。 */
function backup(path) {
  if (!existsSync(path)) return null
  const target = `${path}.bak-${timestamp()}`
  copyFileSync(path, target)
  return target
}

/** 该 profile 目录是否是一个可用的 DSH profile。 */
function isProfile(dir) {
  return existsSync(join(dir, 'package.json'))
}

function listProfiles(dshHome, requested) {
  if (requested !== undefined && requested.length > 0) {
    return requested.map(name => ({ name, dir: join(dshHome, 'profiles', name) }))
  }
  const root = join(dshHome, 'profiles')
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => ({ name: entry.name, dir: join(root, entry.name) }))
    .filter(profile => isProfile(profile.dir))
}

/** 收集 node_modules 中其它 DSH 皮肤插件暴露的行 id（有 skin.json 的包才算皮肤）。 */
function otherSkinRowIds(profileDir) {
  const ids = new Set()
  const scan = (scopeDir) => {
    if (!existsSync(scopeDir)) return
    for (const entry of readdirSync(scopeDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const skinPath = join(scopeDir, entry.name, 'skin.json')
      if (!existsSync(skinPath)) continue
      try {
        const skin = JSON.parse(readFileSync(skinPath, 'utf8'))
        const id = skin?.wiring?.id
        if (typeof id === 'string' && id.length > 0 && id !== OWN_WIRING_ID) ids.add(id)
      } catch {
        // 损坏的皮肤清单不影响安装，跳过。
      }
    }
  }
  const nodeModules = join(profileDir, 'node_modules')
  scan(nodeModules)
  const scopes = existsSync(nodeModules)
    ? readdirSync(nodeModules, { withFileTypes: true }).filter(entry => entry.isDirectory() && entry.name.startsWith('@'))
    : []
  for (const scope of scopes) scan(join(nodeModules, scope.name))
  return [...ids]
}

/** 把互斥区段写进（或从）home patch 里；区段之外的内容原样保留。 */
function writeExclusiveSection(patchPath, rowIds) {
  const existing = existsSync(patchPath) ? readFileSync(patchPath, 'utf8') : '[]\n'
  const begin = existing.indexOf(EXCLUSIVE_BEGIN)
  const end = existing.indexOf(EXCLUSIVE_END)
  let base = existing
  if (begin !== -1 && end !== -1) {
    base = existing.slice(0, begin) + existing.slice(end + EXCLUSIVE_END.length)
  }
  base = base.replace(/\s*$/, '\n')
  if (rowIds.length === 0) {
    // 没有要禁用的行：只保留去除区段后的内容。
    if (/^\s*\[\]\s*$/.test(base)) base = '[]\n'
    writeFileSync(patchPath, base)
    return false
  }
  const section = [
    EXCLUSIVE_BEGIN,
    ...rowIds.flatMap(id => [`- id: ${id}`, '  disabled: true']),
    EXCLUSIVE_END,
    '',
  ].join('\n')
  // 顶层是空数组时不能直接续写条目（`[]` 后面跟 `- id:` 不是合法 YAML）。
  const body = /^\s*\[\]\s*$/.test(base) ? '' : base
  writeFileSync(patchPath, `${body}${section}`)
  return true
}

function readActiveSkin(centerPath) {
  if (!existsSync(centerPath)) return undefined
  try {
    return JSON.parse(readFileSync(centerPath, 'utf8'))
  } catch {
    return undefined
  }
}

function install(options) {
  const dshHome = resolve(options.values.get('dsh-home') ?? join(homedir(), '.dsh'))
  if (!existsSync(dshHome)) throw new Error(`未找到 DSH_HOME：${dshHome}（用 --dsh-home 指定）`)
  const requested = (options.values.get('profiles') ?? '').split(',').map(value => value.trim()).filter(Boolean)
  const profiles = listProfiles(dshHome, requested)
  if (profiles.length === 0) throw new Error(`${dshHome}/profiles 下没有可用的 profile`)

  // 插件在 $DSH_HOME/plugins 下时用相对 spec，pnpm 的 file: 语义依赖 profile 位置。
  const pluginDir = join(dshHome, 'plugins', 'dsh-skin-beach-chatgpt')
  const spec = existsSync(pluginDir) && resolve(pluginDir) === pluginRoot
    ? 'file:../../plugins/dsh-skin-beach-chatgpt'
    : `file:${pluginRoot.replace(/\\/g, '/')}`
  log(`插件依赖 spec：${spec}`)

  for (const profile of profiles) {
    const packagePath = join(profile.dir, 'package.json')
    const backupPath = backup(packagePath)
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
    pkg.dependencies = { ...(pkg.dependencies ?? {}), [PLUGIN_NAME]: spec }
    pkg.dsh = pkg.dsh ?? {}
    pkg.dsh.profile = pkg.dsh.profile ?? {}
    const bundles = pkg.dsh.profile.bundles ?? []
    if (!bundles.includes(PLUGIN_NAME)) bundles.push(PLUGIN_NAME)
    pkg.dsh.profile.bundles = bundles
    writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`)
    log(`profile ${profile.name}：已写入依赖与 bundles${backupPath === null ? '' : `（备份 ${backupPath}）`}`)
    const stale = join(profile.dir, 'node_modules', PLUGIN_NAME)
    if (existsSync(stale)) {
      rmSync(stale, { recursive: true, force: true })
      log(`profile ${profile.name}：已清除 node_modules 旧拷贝`)
    }
  }

  if (options.flags.has('skip-exclusive')) {
    log('已跳过皮肤互斥（--skip-exclusive）')
  } else {
    const rowIds = [...new Set(profiles.flatMap(profile => otherSkinRowIds(profile.dir)))]
    const patchPath = join(dshHome, 'cordis.patch.yml')
    const patchBackup = backup(patchPath)
    const written = writeExclusiveSection(patchPath, rowIds)
    log(written
      ? `皮肤互斥：已禁用 ${rowIds.join(', ')}${patchBackup === null ? '' : `（备份 ${patchBackup}）`}`
      : `皮肤互斥：没有发现其它 DSH 皮肤行，未改动 ${patchPath}`)

    const centerPath = join(dshHome, 'skin-center-active.json')
    const center = readActiveSkin(centerPath)
    if (center !== undefined && typeof center.active === 'string' && center.active.length > 0) {
      const centerBackup = backup(centerPath)
      writeFileSync(centerPath, `${JSON.stringify({ ...center, active: '' }, null, 2)}\n`)
      log(`皮肤中心：原激活皮肤 "${center.active}" 已切回官方默认${centerBackup === null ? '' : `（备份 ${centerBackup}）`}`)
    }
  }

  const list = profiles.map(profile => profile.dir).join('\n  ')
  log('下一步：在每个 profile 目录里执行 pnpm install，然后重启 DSH')
  process.stdout.write(`  ${list}\n`)
}

function uninstall(options) {
  const dshHome = resolve(options.values.get('dsh-home') ?? join(homedir(), '.dsh'))
  const requested = (options.values.get('profiles') ?? '').split(',').map(value => value.trim()).filter(Boolean)
  const profiles = listProfiles(dshHome, requested)

  for (const profile of profiles) {
    const packagePath = join(profile.dir, 'package.json')
    if (!existsSync(packagePath)) continue
    const backupPath = backup(packagePath)
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
    if (pkg.dependencies !== undefined) delete pkg.dependencies[PLUGIN_NAME]
    const bundles = pkg.dsh?.profile?.bundles
    if (Array.isArray(bundles)) {
      pkg.dsh.profile.bundles = bundles.filter(name => name !== PLUGIN_NAME)
    }
    writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`)
    log(`profile ${profile.name}：已移除依赖与 bundles${backupPath === null ? '' : `（备份 ${backupPath}）`}`)
    const stale = join(profile.dir, 'node_modules', PLUGIN_NAME)
    if (existsSync(stale)) {
      rmSync(stale, { recursive: true, force: true })
      log(`profile ${profile.name}：已清除 node_modules 拷贝`)
    }
  }

  const patchPath = join(dshHome, 'cordis.patch.yml')
  if (existsSync(patchPath)) {
    const patchBackup = backup(patchPath)
    writeExclusiveSection(patchPath, [])
    log(`已移除 home patch 中的互斥区段${patchBackup === null ? '' : `（备份 ${patchBackup}）`}`)
  }

  const centerPath = join(dshHome, 'skin-center-active.json')
  if (existsSync(centerPath)) {
    const backups = readdirSync(dshHome)
      .filter(name => name.startsWith('skin-center-active.json.bak-'))
      .sort()
    const latest = backups.at(-1)
    if (latest !== undefined) {
      copyFileSync(join(dshHome, latest), centerPath)
      log(`皮肤中心：已从 ${latest} 还原激活状态`)
    }
  }

  log('下一步：在每个 profile 目录里执行 pnpm install，然后重启 DSH')
  mkdirSync(dshHome, { recursive: true })
}

const options = parseArgs(process.argv.slice(2))
try {
  if (options.action === 'install') install(options)
  else if (options.action === 'uninstall') uninstall(options)
  else {
    process.stderr.write('用法：node scripts/configure.mjs <install|uninstall> --dsh-home <path> [--profiles web,desktop] [--skip-exclusive]\n')
    process.exit(2)
  }
} catch (error) {
  process.stderr.write(`configure.mjs: ${error.message}\n`)
  process.exit(1)
}
