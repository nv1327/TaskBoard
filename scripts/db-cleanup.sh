#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env}"
BRANCH_NAME=""
YES=false

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
    --yes)
      YES=true
      shift
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: $0 [--branch <merged-branch>] [--yes]"
      exit 1
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

CURRENT_GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_GIT_BRANCH" != "main" && "$CURRENT_GIT_BRANCH" != "master" ]]; then
  echo "Safety check failed: you are on '$CURRENT_GIT_BRANCH'."
  echo "Run cleanup after merge from main/master only."
  exit 1
fi

INFO="$(python3 - "$ENV_FILE" "$BRANCH_NAME" <<'PY'
import re
import sys
from urllib.parse import urlsplit, parse_qsl, urlencode, urlunsplit

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
cur = vals.get('DATABASE_URL')
main = vals.get('DATABASE_URL_MAIN')

if not cur:
    print('ERR|DATABASE_URL missing in .env')
    sys.exit(0)
if not main:
    print('ERR|DATABASE_URL_MAIN missing in .env. Run db:branch first.')
    sys.exit(0)

main_parts = urlsplit(main)
main_db = main_parts.path.lstrip('/')
if not main_db:
    print('ERR|Could not parse main DB name from DATABASE_URL_MAIN')
    sys.exit(0)

qs = [(k, v) for (k, v) in parse_qsl(main_parts.query, keep_blank_values=True) if k != 'schema']
psql_main_url = urlunsplit(main_parts._replace(query=urlencode(qs)))

if branch_name:
    branch_db = f"{main_db}_{sanitize_branch(branch_name)}"[:63]
else:
    cur_parts = urlsplit(cur)
    branch_db = cur_parts.path.lstrip('/')

if not branch_db:
    print('ERR|Could not determine branch DB name')
    sys.exit(0)
if branch_db == main_db:
    print('ERR|Current DB points to main. Provide --branch <name> to cleanup a specific branch DB.')
    sys.exit(0)

print(f"OK|{cur}|{main}|{psql_main_url}|{main_db}|{branch_db}")
PY
)"

if [[ -z "$INFO" ]]; then
  echo "Error: failed to parse .env"
  exit 1
fi

IFS='|' read -r status current_url main_url psql_main_url main_db branch_db <<< "$INFO"
if [[ "$status" != "OK" ]]; then
  echo "Error: $current_url"
  exit 1
fi

echo "Main branch confirmed: $CURRENT_GIT_BRANCH"
echo "Main DB:   $main_db"
echo "Current DB: $(python3 - <<PY
from urllib.parse import urlsplit
print(urlsplit('$current_url').path.lstrip('/'))
PY
)"
echo "Drop DB:   $branch_db"

action_summary="Will switch DATABASE_URL to main, run prisma migrate deploy, then drop database '$branch_db'."

echo "$action_summary"
if [[ "$YES" != true ]]; then
  read -r -p "Proceed? [y/N] " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

python3 - "$ENV_FILE" "$main_url" <<'PY'
import re
import sys

env_path, main_url = sys.argv[1], sys.argv[2]
with open(env_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

out = []
seen = False
for line in lines:
    if re.match(r'^\s*DATABASE_URL\s*=', line):
        out.append(f'DATABASE_URL="{main_url}"\n')
        seen = True
    else:
        out.append(line)

if not seen:
    out.append(f'DATABASE_URL="{main_url}"\n')

with open(env_path, 'w', encoding='utf-8') as f:
    f.writelines(out)
PY

echo "Restored DATABASE_URL to main DB in $ENV_FILE"
echo "Applying merged migrations to main DB..."
npx prisma migrate deploy

exists=$($PSQL_BIN "$psql_main_url" -Atqc "SELECT 1 FROM pg_database WHERE datname = '$branch_db'" || true)
if [[ "$exists" == "1" ]]; then
  echo "Dropping branch DB: $branch_db"
  $PSQL_BIN "$psql_main_url" -v ON_ERROR_STOP=1 -qc "DROP DATABASE \"$branch_db\";"
else
  echo "Branch DB not found (already deleted): $branch_db"
fi

echo "Cleanup complete."
