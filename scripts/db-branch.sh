#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env}"
BRANCH_NAME=""

if command -v psql >/dev/null 2>&1; then
  PSQL_BIN="$(command -v psql)"
elif [[ -x "/opt/homebrew/opt/postgresql@16/bin/psql" ]]; then
  PSQL_BIN="/opt/homebrew/opt/postgresql@16/bin/psql"
else
  echo "Error: psql not found in PATH."
  echo "Install PostgreSQL or export PATH to include your psql binary."
  exit 1
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch)
      BRANCH_NAME="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: $0 [--branch <git-branch>]"
      exit 1
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found"
  echo "Create it from .env.example first"
  exit 1
fi

if [[ -z "$BRANCH_NAME" ]]; then
  BRANCH_NAME="$(git rev-parse --abbrev-ref HEAD)"
fi

if [[ "$BRANCH_NAME" == "main" || "$BRANCH_NAME" == "master" ]]; then
  echo "Current branch is '$BRANCH_NAME'."
  echo "Use this script on feature branches to create isolated DBs."
  exit 1
fi

URL_INFO="$(python3 - "$ENV_FILE" "$BRANCH_NAME" <<'PY'
import re
import sys
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

env_path, branch_name = sys.argv[1], sys.argv[2]

def parse_env(path):
    vals = {}
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            m = re.match(r'^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$', line)
            if not m:
                continue
            key, raw = m.group(1), m.group(2)
            if raw.startswith('"') and raw.endswith('"'):
                raw = raw[1:-1]
            vals[key] = raw
    return vals

def sanitize_branch(name):
    s = re.sub(r'[^a-zA-Z0-9]+', '_', name.strip().lower()).strip('_')
    return s or 'branch'

vals = parse_env(env_path)
current = vals.get('DATABASE_URL')
main = vals.get('DATABASE_URL_MAIN') or current
if not current:
    print('ERR|DATABASE_URL missing in .env')
    sys.exit(0)

parts = urlsplit(main)
main_db = parts.path.lstrip('/')
if not main_db:
    print('ERR|Could not parse database name from DATABASE_URL_MAIN')
    sys.exit(0)

branch_db = f"{main_db}_{sanitize_branch(branch_name)}"
branch_db = branch_db[:63]

branch_parts = parts._replace(path='/' + branch_db)
branch_url = urlunsplit(branch_parts)

qs = [(k, v) for (k, v) in parse_qsl(parts.query, keep_blank_values=True) if k != 'schema']
psql_main_url = urlunsplit(parts._replace(query=urlencode(qs)))

print(f"OK|{current}|{main}|{psql_main_url}|{main_db}|{branch_db}|{branch_url}")
PY
)"

if [[ -z "$URL_INFO" ]]; then
  echo "Error: failed to parse .env"
  exit 1
fi

IFS='|' read -r status current_url main_url psql_main_url main_db branch_db branch_url <<< "$URL_INFO"
if [[ "$status" != "OK" ]]; then
  echo "Error: $current_url"
  exit 1
fi

if [[ "$branch_db" == "$main_db" ]]; then
  echo "Error: branch DB name resolved to main DB name ($main_db)."
  exit 1
fi

echo "Branch:      $BRANCH_NAME"
echo "Main DB:     $main_db"
echo "Branch DB:   $branch_db"
echo "Environment: $ENV_FILE"

exists=$($PSQL_BIN "$psql_main_url" -Atqc "SELECT 1 FROM pg_database WHERE datname = '$branch_db'" || true)
if [[ "$exists" != "1" ]]; then
  echo "Creating database: $branch_db"
  $PSQL_BIN "$psql_main_url" -v ON_ERROR_STOP=1 -qc "CREATE DATABASE \"$branch_db\";"
else
  echo "Database already exists: $branch_db"
fi

python3 - "$ENV_FILE" "$main_url" "$branch_url" <<'PY'
import re
import sys

env_path, main_url, branch_url = sys.argv[1], sys.argv[2], sys.argv[3]

with open(env_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

seen_main = False
seen_db = False
out = []

for line in lines:
    if re.match(r'^\s*DATABASE_URL_MAIN\s*=', line):
        out.append(f'DATABASE_URL_MAIN="{main_url}"\n')
        seen_main = True
    elif re.match(r'^\s*DATABASE_URL\s*=', line):
        out.append(f'DATABASE_URL="{branch_url}"\n')
        seen_db = True
    else:
        out.append(line)

if not seen_db:
    out.append(f'DATABASE_URL="{branch_url}"\n')
if not seen_main:
    out.append(f'DATABASE_URL_MAIN="{main_url}"\n')

with open(env_path, 'w', encoding='utf-8') as f:
    f.writelines(out)
PY

echo "Updated $ENV_FILE: DATABASE_URL -> $branch_db"
echo "Applying migrations to branch DB..."

npx prisma migrate deploy

echo "Done. Branch DB is active."
echo "When merged to main, run: npm run db:cleanup -- --branch $BRANCH_NAME --yes"
