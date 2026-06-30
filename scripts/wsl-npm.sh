#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd "$script_dir/.." && pwd)"
windows_project_dir="$(wslpath -w "$project_dir")"
script_name="${1:-verify:prod}"
shift || true

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \
  "Set-Location -LiteralPath '${windows_project_dir}'; npm.cmd run '${script_name}' -- ${*}"
