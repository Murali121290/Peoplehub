# PeopleHub: Operations Runbook & Maintenance Guide

This document defines operations guidelines, backup and rollback procedures, monitoring configurations, governance models, and notes on technical debt.

## 1. Monitoring & Logging

### Application Logging
- **FastAPI / Uvicorn Logs:** Server actions are logged directly to stdout/stderr in JSON or plain text format.
- **Log Levels:** Configured via command line parameters inside Docker Compose:
  - `INFO` (Default): Logs route calls, database connection warnings, and scheduler actions.
  - `DEBUG`: Logs database execution scripts and WebSocket join events.
- **Log Collection:** In production, direct standard output streams to local files or log forwarders (e.g., Fluentd, Logstash, or Datadog agent):
  ```bash
  docker-compose logs -f backend >> /var/log/peoplehub/backend.log
  ```

---

## 2. Backup & Restore Procedures

### Database Backups (PostgreSQL)
To prevent data loss, logical database backups must be executed daily using PostgreSQL utilities.

#### Automated Backup Script
Run the following cron command to generate daily gzip-compressed SQL dumps:
```bash
pg_dump -h localhost -p 5435 -U postgres -d peoplehub_db | gzip > /backups/peoplehub_db_$(date +%F).sql.gz
```

#### Restoration Checklist
To restore a backup dump in case of server failure:
1. Stop the application backend container:
   ```bash
   docker-compose stop backend
   ```
2. Recreate the database structure:
   ```bash
   docker-compose exec -T postgres dropdb -U postgres peoplehub_db
   docker-compose exec -T postgres createdb -U postgres peoplehub_db
   ```
3. Stream the backup dump into the new instance:
   ```bash
   gunzip -c /backups/peoplehub_db_target_date.sql.gz | docker-compose exec -T postgres psql -U postgres -d peoplehub_db
   ```
4. Restart the backend:
   ```bash
   docker-compose start backend
   ```

---

## 3. Rollback Procedures

If a deployment contains bugs or breaks services, execute the rollback workflow:

### Code Rollback
1. Revert to the last stable Git release tag or commit hash:
   ```bash
   git checkout tags/v1.2.0
   ```
2. Rebuild the application containers:
   ```bash
   docker-compose up --build -d
   ```

### Schema Rollback (Alembic)
If the broken deployment introduced schema changes that must be reverted:
1. View the migration history:
   ```bash
   alembic history
   ```
2. Revert to the last functional schema version:
   ```bash
   alembic downgrade <target_revision_id>
   ```

---

## 4. Incident Management Guide

When an alert is triggered (e.g., HTTP 500 status rates climb or database becomes unreachable):

1. **Phase 1: Triage & Logging Check**
   - Check container health states: `docker-compose ps`
   - Inspect backend logs for tracebacks: `docker-compose logs -n 100 backend`
2. **Phase 2: Database Outage Recovery**
   - If PostgreSQL locks or fails, check disk usage: `df -h`
   - Check if database max connections have been exhausted. Restart database: `docker-compose restart postgres`
3. **Phase 3: Client Connection Issues (WebSockets)**
   - If clients report real-time chat disconnects, inspect WebSocket routes. Ensure Nginx rules proxy connection upgrades properly.

---

## 5. Technical Debt & Known Issues

During review of the PeopleHub codebase, the following technical debt and risks were identified:

> [!WARNING]
> **Issue 1: Binary Files Stored in Database (BLOBs)**
> *   **Impact:** Profile images, PAN files, Aadhaar uploads, and resumes are saved directly in the PostgreSQL database as `LargeBinary` fields.
> *   **Risk:** Database storage sizes will expand rapidly, slowing down `pg_dump` backups and increasing memory requirements.
> *   **Remediation:** Refactor the storage layer to save uploads to an external object store (e.g. AWS S3, MinIO) and store only file URLs in SQL tables.

> [!WARNING]
> **Issue 2: Sync Client Lack of Retry Queue**
> *   **Impact:** SQLAlchemy triggers initiate database sync webhook requests asynchronously via fire-and-forget thread pools (`sync_client.py`).
> *   **Risk:** If the external CMS server is offline or encounters network drops, synchronization events are lost, leading to database drifts between systems.
> *   **Remediation:** Implement a message broker (e.g. RabbitMQ, Redis) and background queue (e.g. Celery) to support task retries and lock safety.

---

## 6. Governance Model
- **Code Ownership:** Maintained by the HR Tech Core Engineering Team.
- **Contribution Policy:** Major features require design documents, PR approvals from at least one core maintainer, and passing automated regression checks.
- **Security Vulnerability Reporting:** Contact `security-report@company.com` before posting public issues.
