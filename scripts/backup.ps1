# ==============================================================================
# PeopleHub PostgreSQL Backup Script for Windows (Daily & Weekly Rotation)
# ==============================================================================
# Usage:
#   powershell.exe -ExecutionPolicy Bypass -File .\scripts\backup.ps1
# Scheduled Task Trigger Example:
#   Daily at 2:00 AM
# ==============================================================================

[CmdletBinding()]
param (
    [string]$BackupDir = "C:\Backups\peoplehub",
    [string]$ContainerName = "peoplehub_postgres",
    [string]$DbUser = "postgres",
    [string]$DbName = "peoplehub_db"
)

$ErrorActionPreference = "Stop"

$DailyDir = Join-Path -Path $BackupDir -ChildPath "daily"
$WeeklyDir = Join-Path -Path $BackupDir -ChildPath "weekly"

# Ensure target directories exist
if (-not (Test-Path -Path $DailyDir)) { New-Item -ItemType Directory -Force -Path $DailyDir | Out-Null }
if (-not (Test-Path -Path $WeeklyDir)) { New-Item -ItemType Directory -Force -Path $WeeklyDir | Out-Null }

$DateStr = Get-Date -Format "yyyy-MM-dd_HHmmss"
$DayOfWeek = (Get-Date).DayOfWeek

$DailyFile = Join-Path -Path $DailyDir -ChildPath "peoplehub_daily_$DateStr.sql"

Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Starting PostgreSQL backup..."

# 1. Perform Daily Backup
try {
    docker exec -t $ContainerName pg_dump -U $DbUser -d $DbName | Set-Content -Path $DailyFile -Encoding UTF8
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Daily backup created: $DailyFile"
} catch {
    Write-Error "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ERROR: Database dump failed - $_"
    exit 1
}

# 2. Perform Weekly Backup on Sunday
if ($DayOfWeek -eq "Sunday") {
    $WeeklyFile = Join-Path -Path $WeeklyDir -ChildPath "peoplehub_weekly_$DateStr.sql"
    Copy-Item -Path $DailyFile -Destination $WeeklyFile
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Weekly backup created: $WeeklyFile"
}

# 3. Retention Cleanup
# Delete Daily backups older than 7 days
Get-ChildItem -Path $DailyDir -Filter "*.sql" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item -Force

# Delete Weekly backups older than 30 days
Get-ChildItem -Path $WeeklyDir -Filter "*.sql" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item -Force

Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Backup process completed successfully."
