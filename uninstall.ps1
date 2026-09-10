<#
  海边 ChatGPT 娘 · dsh-skin-beach-chatgpt —— Windows 卸载
  用法：powershell -ExecutionPolicy Bypass -File .\uninstall.ps1
        powershell -ExecutionPolicy Bypass -File .\uninstall.ps1 -Profile web -KeepFiles
#>
#Requires -Version 5.1
[CmdletBinding()]
param(
  [string]$DshHome = '',
  [string]$Profile = '',
  [switch]$KeepFiles
)

$ErrorActionPreference = 'Stop'
$PluginName = 'dsh-skin-beach-chatgpt'

function Write-Step([string]$Text) { Write-Host "==> $Text" -ForegroundColor Cyan }
function Write-Ok([string]$Text)   { Write-Host "    [OK] $Text" -ForegroundColor Green }

if ([string]::IsNullOrWhiteSpace($DshHome)) {
  $DshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }
}
$DshHome = (Resolve-Path $DshHome).Path
$target = Join-Path (Join-Path $DshHome 'plugins') $PluginName

Write-Step '还原 profile 配置'
$arguments = @((Join-Path $target 'scripts\configure.mjs'), 'uninstall', '--dsh-home', $DshHome)
if (-not [string]::IsNullOrWhiteSpace($Profile)) { $arguments += @('--profiles', $Profile) }
& node @arguments
if ($LASTEXITCODE -ne 0) { throw 'configure.mjs 失败' }

Write-Step '安装依赖（pnpm install）'
$profilesRoot = Join-Path $DshHome 'profiles'
Get-ChildItem -Path $profilesRoot -Directory | ForEach-Object {
  $dir = $_.FullName
  if (-not (Test-Path (Join-Path $dir 'package.json'))) { return }
  Push-Location $dir
  try {
    & pnpm install
    if ($LASTEXITCODE -ne 0) { Write-Host "    [!] pnpm install 失败：$dir" -ForegroundColor Yellow }
    else { Write-Ok "已同步：$dir" }
  } finally { Pop-Location }
}

if (-not $KeepFiles -and (Test-Path $target)) {
  Write-Step '删除插件文件'
  Remove-Item -Recurse -Force $target
  Write-Ok "已删除 $target"
}

Write-Step '卸载完成'
Write-Host '  重启 DeepSeek Harness 后界面回到官方外观。'
