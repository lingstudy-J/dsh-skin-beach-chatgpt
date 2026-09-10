#!/usr/bin/env bash
# ============================================================================
#  海边 ChatGPT 娘 · dsh-skin-beach-chatgpt —— Linux / macOS 卸载
#  用法：./uninstall.sh [--profile web] [--keep-files]
# ============================================================================
set -euo pipefail

PLUGIN_NAME="dsh-skin-beach-chatgpt"
DSH_HOME_DIR="${DSH_HOME:-$HOME/.dsh}"
PROFILE_ARG=""
KEEP_FILES=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dsh-home) DSH_HOME_DIR="$2"; shift 2 ;;
    --profile) PROFILE_ARG="$2"; shift 2 ;;
    --keep-files) KEEP_FILES=1; shift ;;
    *) echo "未知参数：$1" >&2; exit 2 ;;
  esac
done

step() { printf '\n==> %s\n' "$1"; }
ok()   { printf '    [OK] %s\n' "$1"; }

TARGET="$DSH_HOME_DIR/plugins/$PLUGIN_NAME"

step "还原 profile 配置"
ARGS=(uninstall --dsh-home "$DSH_HOME_DIR")
[[ -n "$PROFILE_ARG" ]] && ARGS+=(--profiles "$PROFILE_ARG")
node "$TARGET/scripts/configure.mjs" "${ARGS[@]}"

step "安装依赖（pnpm install）"
for dir in "$DSH_HOME_DIR"/profiles/*/; do
  [[ -f "$dir/package.json" ]] || continue
  ( cd "$dir" && pnpm install ) && ok "已同步：$dir" || warn "pnpm install 失败：$dir"
done

if [[ "$KEEP_FILES" == "0" && -d "$TARGET" ]]; then
  step "删除插件文件"
  rm -rf "$TARGET"
  ok "已删除 $TARGET"
fi

step "卸载完成"
echo "  重启 DeepSeek Harness 后界面回到官方外观。"
