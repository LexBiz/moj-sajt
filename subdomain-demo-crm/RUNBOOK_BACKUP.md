# CRM Backup and Restore Runbook

## 1) Daily backup

Run once per day (cron):

```bash
cd /var/www/mujsajt/subdomain-demo-crm
CRM_DATABASE_URL="postgres://..." ./scripts/backup_db.sh
```

The script creates compressed custom dumps in `backups/` and keeps 14 days.

## 2) Offsite replication

Copy `backups/*.dump.gz` to remote storage (S3/Backblaze/Hetzner Box) every day.

## 3) Restore drill (monthly)

Run on a staging database:

```bash
cd /var/www/mujsajt/subdomain-demo-crm
CRM_DATABASE_URL="postgres://staging..." ./scripts/restore_db.sh ./backups/crm_YYYYMMDD_HHMMSS.dump.gz
```

Verify:
- `GET /api/ops/status` returns `ok: true`.
- Lead count and case count match expected snapshot.

## 4) Incident restore

1. Stop app process (`pm2 stop demo-crm-temp`).
2. Restore latest valid dump.
3. Start app (`pm2 start demo-crm-temp --update-env`).
4. Validate with healthcheck and test login.

## 5) Recommended PITR

For critical production:
- enable WAL archiving on PostgreSQL host,
- keep PITR window for at least 7 days,
- test point-in-time restore quarterly.
