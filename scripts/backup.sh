#!/bin/bash
# ==============================================================================
# PeopleHub PostgreSQL Backup Script (Daily & Weekly Rotation)
# ==============================================================================
# Usage:
#   ./scripts/backup.sh
# Cron schedule example (Every day at 2:00 AM):
#   0 2 * * * /bin/bash /path/to/Peoplehub/scripts/backup.sh >> /var/log/peoplehub_backup.log 2>&1
# ==============================================================================

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/peoplehub}"
CONTAINER_NAME="${CONTAINER_NAME:-peoplehub_postgres}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-peoplehub_db}"

# Ensure directories exist
mkdir -p "${BACKUP_DIR}/daily"
mkdir -p "${BACKUP_DIR}/weekly"

# Current timestamp
DATE=$(date +%Y-%m-%d_%H%M%S)
DAY_OF_WEEK=$(date +%u) # 1 = Monday ... 7 = Sunday

DAILY_FILE="${BACKUP_DIR}/daily/peoplehub_daily_${DATE}.sql.gz"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting PostgreSQL backup..."

# 1. Perform Daily Backup via docker exec
if docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" | gzip > "${DAILY_FILE}"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Daily backup successful: ${DAILY_FILE}"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Daily backup failed!" >&2
    exit 1
fi

# 2. Perform Weekly Backup (Runs every Sunday / Day 7)
if [ "${DAY_OF_WEEK}" -eq 7 ]; then
    WEEKLY_FILE="${BACKUP_DIR}/weekly/peoplehub_weekly_${DATE}.sql.gz"
    cp "${DAILY_FILE}" "${WEEKLY_FILE}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Weekly backup snapshot created: ${WEEKLY_FILE}"
fi

# 3. Retention Cleanup
# Remove daily backups older than 7 days
find "${BACKUP_DIR}/daily" -type f -name "*.sql.gz" -mtime +7 -exec rm -f {} \;

# Remove weekly backups older than 30 days
find "${BACKUP_DIR}/weekly" -type f -name "*.sql.gz" -mtime +30 -exec rm -f {} \;

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup process completed successfully."
