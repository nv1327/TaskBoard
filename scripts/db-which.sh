#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

python3 - "$ENV_FILE" <<'PY'
import re
import sys
from urllib.parse import urlsplit

env_path = sys.argv[1]
vals = {}
with open(env_path, 'r', encoding='utf-8') as f:
    for line in f:
        m = re.match(r'^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$', line)
        if not m:
            continue
        k, raw = m.group(1), m.group(2)
        if raw.startswith('"') and raw.endswith('"'):
            raw = raw[1:-1]
        vals[k] = raw

cur = vals.get('DATABASE_URL')
main = vals.get('DATABASE_URL_MAIN')

if not cur:
    print('DATABASE_URL: (missing)')
    sys.exit(1)

def db_name(url):
    return urlsplit(url).path.lstrip('/') if url else None

cur_db = db_name(cur)
main_db = db_name(main) if main else None

print(f"DATABASE_URL DB:      {cur_db or '(unparseable)'}")
print(f"DATABASE_URL_MAIN DB: {main_db or '(not set)'}")

if main_db:
    if cur_db == main_db:
        print("STATUS: using MAIN database")
    else:
        print("STATUS: using BRANCH database")
else:
    print("STATUS: main DB baseline not set (run: npm run db:branch)")
PY

echo "Git branch: $(git rev-parse --abbrev-ref HEAD)"
