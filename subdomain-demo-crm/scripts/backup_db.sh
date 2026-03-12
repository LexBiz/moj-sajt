#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${ROOT_DIR}/backups"
DATE_TAG="$(date +%Y%m%d_%H%M%S)"
DB_URL="${CRM_DATABASE_URL:-${DATABASE_URL:-}}"

if [[ -z "${DB_URL}" ]]; then
  echo "CRM_DATABASE_URL or DATABASE_URL is required"
  exit 1
fi

mkdir -p "${BACKUP_DIR}"
OUT_FILE="${BACKUP_DIR}/crm_${DATE_TAG}.dump"

pg_dump "${DB_URL}" --format=custom --file="${OUT_FILE}"
gzip -f "${OUT_FILE}"

find "${BACKUP_DIR}" -type f -name "*.dump.gz" -mtime +14 -delete
echo "Backup created: ${OUT_FILE}.gz"
