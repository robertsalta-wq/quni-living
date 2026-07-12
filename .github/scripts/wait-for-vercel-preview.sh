#!/usr/bin/env bash
# Wait for a successful GitHub deployment for the given SHA and print its URL.
# Does not filter on creator (vercel[bot] vs human) — that filter breaks after force-push.
set -euo pipefail

: "${GITHUB_REPOSITORY:?}"
: "${SHA:?}"
: "${GH_TOKEN:?}"
: "${GITHUB_OUTPUT:?}"

MAX_TIMEOUT="${MAX_TIMEOUT:-600}"
CHECK_INTERVAL="${CHECK_INTERVAL:-5}"
DEADLINE=$((SECONDS + MAX_TIMEOUT))

echo "Waiting up to ${MAX_TIMEOUT}s for a successful deployment of ${SHA}"

while (( SECONDS < DEADLINE )); do
  mapfile -t DEPLOY_IDS < <(
    gh api "repos/${GITHUB_REPOSITORY}/deployments?sha=${SHA}&per_page=30" \
      --jq '.[].id'
  )

  if ((${#DEPLOY_IDS[@]} == 0)); then
    echo "No deployments yet for ${SHA}; retrying..."
    sleep "${CHECK_INTERVAL}"
    continue
  fi

  BEST_URL=""
  for DEPLOY_ID in "${DEPLOY_IDS[@]}"; do
    URL="$(
      gh api "repos/${GITHUB_REPOSITORY}/deployments/${DEPLOY_ID}/statuses?per_page=20" \
        --jq '
          map(select(.state == "success"))
          | sort_by(.created_at)
          | reverse
          | .[0]
          | (.environment_url // .target_url // empty)
        ' 2>/dev/null || true
    )"
    [[ -z "${URL}" ]] && continue

    if [[ "${URL}" == *".vercel.app"* ]]; then
      echo "Found ready Vercel preview: ${URL}"
      echo "url=${URL}" >> "${GITHUB_OUTPUT}"
      exit 0
    fi

    # Keep a non-Vercel success as fallback (should be rare for this repo).
    if [[ -z "${BEST_URL}" ]]; then
      BEST_URL="${URL}"
    fi
  done

  if [[ -n "${BEST_URL}" ]]; then
    echo "Found ready deployment: ${BEST_URL}"
    echo "url=${BEST_URL}" >> "${GITHUB_OUTPUT}"
    exit 0
  fi

  echo "Deployments exist but none successful yet for ${SHA}; retrying..."
  sleep "${CHECK_INTERVAL}"
done

echo "::error::No successful GitHub deployment found for ${SHA} within ${MAX_TIMEOUT}s"
exit 1
