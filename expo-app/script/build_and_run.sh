#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-start}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

show_usage() {
  cat <<'USAGE'
usage: ./script/build_and_run.sh [start|tunnel|web|doctor|help]
USAGE
}

case "$MODE" in
  start|run) exec npx expo start ;;
  tunnel|--tunnel) exec npx expo start --tunnel ;;
  web|--web) exec npx expo start --web ;;
  doctor|--doctor) exec npx expo-doctor ;;
  help|--help) show_usage ;;
  *) show_usage >&2; exit 2 ;;
esac
