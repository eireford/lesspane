#!/usr/bin/env bash
# Read-only environment check for the LessPane prototype. Writes env-check.txt (no secret values).
cd "$(dirname "$0")"
OUT=env-check.txt
{
echo "== LessPane environment check: $(date -Is)"
echo "-- System"; grep PRETTY_NAME /etc/os-release; uname -r; echo "pwd: $PWD"
echo "-- Node / npm"
echo "node path: $(command -v node)"; node -v 2>&1; echo "npm $(npm -v 2>&1)"
echo "-- Project"
test -d node_modules && echo "node_modules: present" || echo "node_modules: MISSING"
ls node_modules/@rollup 2>/dev/null | grep rollup- | tr '\n' ' '; echo
if [ -f .env ]; then
  echo ".env: present"
  while IFS='=' read -r k v; do
    [[ -z "$k" || "$k" =~ ^# ]] && continue
    if [[ -z "$v" ]]; then echo "  $k = (empty)"
    elif [[ "$k" =~ (PASSWORD|KEY) ]]; then echo "  $k = (set, ${#v} chars)"
    else echo "  $k = $v"; fi
  done < .env
else echo ".env: MISSING"; fi
echo "-- Type check / tests"
npm run -s check 2>&1 | tail -2
npx vitest run 2>&1 | grep -E 'Tests|FAIL' | head -5
echo "-- Tools"
for t in git docker gcloud; do printf '%s: ' "$t"; command -v $t >/dev/null && ($t --version 2>&1 | head -1) || echo "not installed"; done
if command -v gcloud >/dev/null; then
  echo "-- gcloud config"
  echo "account: $(gcloud config get-value account 2>/dev/null)"
  P=$(gcloud config get-value project 2>/dev/null); echo "project: $P"
  echo "run/region: $(gcloud config get-value run/region 2>/dev/null)"
  if [ -n "$P" ]; then
    echo "-- Enabled APIs (needed: run, cloudbuild, artifactregistry, firestore, secretmanager)"
    gcloud services list --enabled --format='value(config.name)' 2>&1 | grep -E 'run|cloudbuild|artifactregistry|firestore|secretmanager|places|maps' || echo "(none of the needed APIs enabled)"
    echo "-- Artifact Registry (us-west1)"; gcloud artifacts repositories list --location=us-west1 --format='value(name)' 2>&1 | tail -3
    echo "-- Firestore databases"; gcloud firestore databases list --format='value(name,locationId,type)' 2>&1 | tail -3
    echo "-- Secrets"; gcloud secrets list --format='value(name)' 2>&1 | grep -i lesspane || echo "(no lesspane secrets)"
    echo "-- Cloud Run services (us-west1)"; gcloud run services list --region=us-west1 --format='value(metadata.name,status.url)' 2>&1 | tail -3
  fi
fi
echo "== done"
} > "$OUT" 2>&1
echo "Wrote $PWD/$OUT"
