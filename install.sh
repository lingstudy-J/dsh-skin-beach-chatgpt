#!/usr/bin/env bash
# ============================================================================
#  海边 ChatGPT 娘 · dsh-skin-beach-chatgpt —— Linux / macOS 一键安装
#  用法：chmod +x install.sh && ./install.sh [--profile web] [--skip-exclusive]
# ============================================================================
set -euo pipefail

PLUGIN_NAME="dsh-skin-beach-chatgpt"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DSH_HOME_DIR="${DSH_HOME:-$HOME/.dsh}"
PROFILE_ARG=""
SKIP_EXCLUSIVE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dsh-home) DSH_HOME_DIR="$2"; shift 2 ;;
    --profile) PROFILE_ARG="$2"; shift 2 ;;
    --skip-exclusive) SKIP_EXCLUSIVE=1; shift ;;
    -h|--help) sed -n '2,5p' "$0"; exit 0 ;;
    *) echo "未知参数：$1" >&2; exit 2 ;;
  esac
done

step() { printf '\n==> %s\n' "$1"; }
ok()   { printf '    [OK] %s\n' "$1"; }
warn() { printf '    [!] %s\n' "$1"; }

step "检查环境"
[[ -d "$DSH_HOME_DIR" ]] || { echo "未找到 DSH_HOME：$DSH_HOME_DIR（用 --dsh-home 指定）" >&2; exit 1; }
command -v node >/dev/null || { echo "未检测到 Node.js（需要 20+）" >&2; exit 1; }
command -v pnpm >/dev/null || { echo "未检测到 pnpm，请先执行：npm install -g pnpm" >&2; exit 1; }
ok "DSH_HOME = $DSH_HOME_DIR"
ok "node = $(command -v node)"
ok "pnpm = $(command -v pnpm)"

step "复制插件到 DSH 插件目录"
TARGET="$DSH_HOME_DIR/plugins/$PLUGIN_NAME"
mkdir -p "$DSH_HOME_DIR/plugins"
if [[ "$SRC_DIR" != "$TARGET" ]]; then
  rm -rf "$TARGET"
  mkdir -p "$TARGET"
  cp -R "$SRC_DIR"/. "$TARGET"/
  rm -rf "$TARGET/.git" "$TARGET/node_modules"
  ok "已复制到 $TARGET"
else
  ok "插件目录就是目标目录，跳过复制"
fi

step "写入 profile 配置"
ARGS=(install --dsh-home "$DSH_HOME_DIR")
[[ -n "$PROFILE_ARG" ]] && ARGS+=(--profiles "$PROFILE_ARG")
[[ "$SKIP_EXCLUSIVE" == "1" ]] && ARGS+=(--skip-exclusive)
node "$TARGET/scripts/configure.mjs" "${ARGS[@]}"

step "安装依赖（pnpm install）"
if [[ -n "$PROFILE_ARG" ]]; then
  PROFILES=()
  IFS=',' read -r -a names <<< "$PROFILE_ARG"
  for name in "${names[@]}"; do PROFILES+=("$DSH_HOME_DIR/profiles/$(echo "$name" | xargs)"); done
else
  PROFILES=("$DSH_HOME_DIR"/profiles/*/)
fi
for dir in "${PROFILES[@]}"; do
  [[ -f "$dir/package.json" ]] || continue
  # pnpm 的 minimumReleaseAge 供应链门槛按"发布满 24 小时"校验整份 lockfile，
  # 与本次安装无关的新发布条目也会让 install 整体失败；此时放宽门槛重试一次。
  if ! ( cd "$dir" && pnpm install ); then
    warn "pnpm install 未通过（可能是发布年龄门槛），放宽后重试：$dir"
    ( cd "$dir" && pnpm install --config.minimumReleaseAge=0 )
  fi
  ok "已安装：$dir"
done

step "安装完成"
cat <<EOF

  $PLUGIN_NAME 已安装。
  最后一步：重启 DeepSeek Harness（重启 dsh web 后刷新页面；桌面端重新打开）。
  验证：页面出现海边壁纸；控制台执行
        document.body.hasAttribute('data-dsh-beach-chatgpt')  // true
  卸载：./uninstall.sh
EOF
