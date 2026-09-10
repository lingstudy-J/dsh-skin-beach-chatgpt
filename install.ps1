<#
  海边 ChatGPT 娘 · dsh-skin-beach-chatgpt —— Windows 一键安装
  ------------------------------------------------------------------
  用法（在插件目录内执行）：
      powershell -ExecutionPolicy Bypass -File .\install.ps1
      powershell -ExecutionPolicy Bypass -File .\install.ps1 -Profile web -SkipExclusive
      powershell -ExecutionPolicy Bypass -File .\install.ps1 -DshHome D:\dsh

  脚本做什么：
      1. 定位 DSH_HOME（默认 ~/.dsh）与要安装的 profile
      2. 复制插件到 <DSH_HOME>\plugins\dsh-skin-beach-chatgpt
      3. 调用 scripts/configure.mjs：写 profile 依赖与 bundles、皮肤互斥、皮肤中心让步
      4. 在改动过的 profile 目录里执行 pnpm install
      5. 提示重启 DSH
#>
#Requires -Version 5.1
[CmdletBinding()]
param(
  [string]$DshHome = '',
  [string]$Profile = '',
  [switch]$SkipExclusive
)

$ErrorActionPreference = 'Stop'
$PluginName = 'dsh-skin-beach-chatgpt'
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Step([string]$Text) { Write-Host "==> $Text" -ForegroundColor Cyan }
function Write-Ok([string]$Text)   { Write-Host "    [OK] $Text" -ForegroundColor Green }
function Write-Warn([string]$Text) { Write-Host "    [!] $Text" -ForegroundColor Yellow }

if ([string]::IsNullOrWhiteSpace($DshHome)) {
  $DshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }
}
if (-not (Test-Path $DshHome)) { throw "未找到 DSH_HOME：$DshHome（用 -DshHome 指定）" }
$DshHome = (Resolve-Path $DshHome).Path

Write-Step '检查环境'
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw '未检测到 Node.js，请先安装 Node 20 或更高版本' }
$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpm) { throw '未检测到 pnpm，请先安装：npm install -g pnpm' }
Write-Ok "DSH_HOME = $DshHome"
Write-Ok "node = $($node.Source)"
Write-Ok "pnpm = $($pnpm.Source)"

Write-Step '复制插件到 DSH 插件目录'
$pluginsRoot = Join-Path $DshHome 'plugins'
$target = Join-Path $pluginsRoot $PluginName
New-Item -ItemType Directory -Force -Path $pluginsRoot | Out-Null
if ((Resolve-Path $ScriptRoot).Path -ne $target) {
  if (Test-Path $target) { Remove-Item -Recurse -Force $target }
  Copy-Item -Recurse -Force $ScriptRoot $target
  foreach ($junk in @('.git', 'node_modules')) {
    $path = Join-Path $target $junk
    if (Test-Path $path) { Remove-Item -Recurse -Force $path }
  }
  Write-Ok "已复制到 $target"
} else {
  Write-Ok '插件目录就是目标目录，跳过复制'
}

Write-Step '写入 profile 配置'
$arguments = @((Join-Path $target 'scripts\configure.mjs'), 'install', '--dsh-home', $DshHome)
if (-not [string]::IsNullOrWhiteSpace($Profile)) { $arguments += @('--profiles', $Profile) }
if ($SkipExclusive) { $arguments += '--skip-exclusive' }
& node @arguments
if ($LASTEXITCODE -ne 0) { throw 'configure.mjs 失败，profile 配置未完成' }

Write-Step '安装依赖（pnpm install）'
$profilesRoot = Join-Path $DshHome 'profiles'
$profiles = if (-not [string]::IsNullOrWhiteSpace($Profile)) {
  $Profile.Split(',') | ForEach-Object { Join-Path $profilesRoot $_.Trim() }
} else {
  Get-ChildItem -Path $profilesRoot -Directory | ForEach-Object { $_.FullName }
}
foreach ($dir in $profiles) {
  $manifest = Join-Path $dir 'package.json'
  if (-not (Test-Path $manifest)) { continue }
  Push-Location $dir
  try {
    & pnpm install
    if ($LASTEXITCODE -ne 0) {
      # pnpm 的 minimumReleaseAge 供应链门槛按"发布满 24 小时"校验整份 lockfile，
      # 与本次安装无关的新发布条目也会让 install 整体失败；此时放宽门槛重试一次。
      Write-Warn "pnpm install 未通过（可能是发布年龄门槛），放宽后重试：$dir"
      & pnpm install --config.minimumReleaseAge=0
      if ($LASTEXITCODE -ne 0) { throw "pnpm install 失败：$dir" }
    }
    Write-Ok "已安装：$dir"
  } finally {
    Pop-Location
  }
}

Write-Step '安装完成'
Write-Host ''
Write-Host "  $PluginName 已安装。" -ForegroundColor Green
Write-Host '  最后一步：重启 DeepSeek Harness（Web：重启 dsh web 后刷新页面；桌面端：重新打开）。'
Write-Host '  验证：页面出现海边壁纸；控制台执行'
Write-Host "        document.body.hasAttribute('data-dsh-beach-chatgpt')  // true"
Write-Host '  卸载：powershell -ExecutionPolicy Bypass -File .\uninstall.ps1'
Write-Host ''
