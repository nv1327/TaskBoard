#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${PM_BOARD_URL:-http://localhost:3000}"
PROJECT_ID="${TEST_PROJECT_ID:-}"

python3 - "$BASE_URL" "$PROJECT_ID" <<'PY'
import json
import sys
import uuid
import urllib.request
import urllib.error

base_url = sys.argv[1].rstrip('/')
project_id = sys.argv[2] or None


def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"} if body is not None else {}
    request = urllib.request.Request(f"{base_url}{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(request) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else None


def fail(msg):
    print(f"❌ {msg}")
    sys.exit(1)

# Ensure API reachable
try:
    projects_resp = req("GET", "/api/agent/projects")
except Exception as e:
    fail(f"Could not reach PM Board API at {base_url}: {e}")

projects = projects_resp.get("data", []) if isinstance(projects_resp, dict) else []
if not projects:
    fail("No projects found. Create a project first.")

if not project_id:
    project_id = projects[0]["id"]

run_id = uuid.uuid4().hex[:8]
initial_title = f"API smoke {run_id}"
updated_title = f"API smoke updated {run_id}"
feature_id = None

try:
    created = req("POST", "/api/agent/features", {
        "projectId": project_id,
        "title": initial_title,
        "priority": "medium",
        "status": "backlog"
    })
    if not created.get("ok"):
        fail(f"Feature create failed: {created}")
    feature_id = created["data"]["id"]

    patched = req("PATCH", f"/api/agent/features/{feature_id}", {"title": updated_title})
    if not patched.get("ok"):
        fail(f"Feature patch failed: {patched}")
    if patched["data"]["title"] != updated_title:
        fail("Feature title did not update via API")

    changelog = req("GET", f"/api/agent/projects/{project_id}/changelog?page=1&pageSize=50&dedupe=0")
    rows = changelog.get("data", []) if isinstance(changelog, dict) else []

    found = False
    for row in rows:
        if row.get("action") == "FEATURE_UPDATED" and row.get("featureId") == feature_id:
            summary = row.get("summary", "")
            meta = row.get("meta") or {}
            if updated_title in summary and meta.get("field") == "title":
                found = True
                break
    if not found:
        fail("Did not find FEATURE_UPDATED changelog entry for title change")

    print("✅ API smoke test passed")
    print(f"   project: {project_id}")
    print(f"   feature: {feature_id}")

finally:
    if feature_id:
        try:
            req("DELETE", f"/api/projects/{project_id}/features/{feature_id}")
        except Exception:
            pass
PY
