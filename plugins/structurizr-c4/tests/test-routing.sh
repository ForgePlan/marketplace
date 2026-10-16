#!/usr/bin/env bash
set -euo pipefail
plugin_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
scripts_root="$plugin_root/skills/structurizr-c4/scripts"
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH="$scripts_root${PYTHONPATH:+:$PYTHONPATH}" \
  python3 -m unittest discover -s "$scripts_root/tests" -p 'test_*.py'
