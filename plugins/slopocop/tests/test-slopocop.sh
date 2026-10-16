#!/usr/bin/env bash
# Запуск из любого CWD; ошибка Python или Node сохраняет ненулевой код.
set -euo pipefail

TEST_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
python3 -B -m unittest discover -s "$TEST_DIR" -p 'test_slopocop*.py' -v
exec node --test "$TEST_DIR/test-slopocop-omp.mjs"
