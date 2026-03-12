#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: restore_db.sh /path/to/crm_YYYYMMDD_HHMMSS.dump.gz"
  exit 1
fi

INPUT_FILE="$1"
DB_URL="${CRM_DATABASE_URL:-${DATABASE_URL:-}}"

if [[ ! -f "${INPUT_FILE}" ]]; then
  echo "Backup file not found: ${INPUT_FILE}"
  exit 1
fi
if [[ -z "${DB_URL}" ]]; then
  echo "CRM_DATABASE_URL or DATABASE_URL is required"
  exit 1
fi

TMP_FILE="$(mktemp /tmp/crm_restore_XXXXXX.dump)"
gunzip -c "${INPUT_FILE}" > "${TMP_FILE}"
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="${DB_URL}" "${TMP_FILE}"
rm -f "${TMP_FILE}"
echo "Restore completed from ${INPUT_FILE}"
