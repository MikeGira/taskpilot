# IT Helpdesk Automation Starter Kit — Setup Guide

## Prerequisites

- Windows Server 2016+ (or Windows 10/11 with RSAT installed)
- PowerShell 5.1+ (check: `$PSVersionTable.PSVersion`)
- For AD scripts: `Import-Module ActiveDirectory` must work without errors
- Run PowerShell as Administrator for first-time setup

---

## Step 1 — Extract the kit

Extract the ZIP to a folder you can keep permanently. Recommended:

```
C:\IT-Automation\
```

Your folder should look like this:

```
C:\IT-Automation\
  config.json
  reset-password.ps1
  disk-cleanup.ps1
  new-user.ps1
  health-check.ps1
  scheduler.xml
  setup-guide.md
  Logs\          ← created automatically on first run
```

---

## Step 2 — Edit config.json

Open `config.json` in Notepad or VS Code and replace the ALL_CAPS values:

| Field | What to put |
|-------|-------------|
| `domain` | Your AD domain name, e.g. `contoso` |
| `dc` | Your domain components, e.g. `DC=contoso,DC=local` |
| `adminOU` | OU path for your IT accounts |
| `usersOU` | OU path where new users should be created |
| `defaultGroups` | Groups all new users should join |
| `defaultTempPassword` | A strong temp password (users must change on login) |
| `logPath` | Where logs are written (default: `C:\IT-Automation\Logs`) |
| `diskAlertThresholdPercent` | Alert if free disk % falls below this (default: 20) |
| `drivesToMonitor` | Drive letters to check, e.g. `["C", "D"]` |

---

## Step 3 — Set PowerShell execution policy (one time)

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine
```

---

## Step 4 — Create the log directory

```powershell
New-Item -ItemType Directory -Path "C:\IT-Automation\Logs" -Force
```

---

## Step 5 — Test each script manually

**Health check (no AD required):**
```powershell
cd C:\IT-Automation
.\health-check.ps1
```

**Disk cleanup (no AD required):**
```powershell
.\disk-cleanup.ps1
```

**Password reset (requires AD):**
```powershell
.\reset-password.ps1 -Username testuser
```

**New user (requires AD):**
```powershell
.\new-user.ps1 -FirstName Test -LastName User -Department "IT"
```

After each run, check `C:\IT-Automation\Logs\` for the log file — it should have a timestamped entry.

---

## Step 6 — Schedule the health check (optional)

Import the Task Scheduler template:

```cmd
schtasks /create /xml "C:\IT-Automation\scheduler.xml" /tn "TaskPilot-HealthCheck"
```

Or use the GUI: **Task Scheduler → Action → Import Task** → select `scheduler.xml`.

The task runs daily at 7:00 AM. Edit the time in the XML or via Task Scheduler properties.

---

## Step 7 — Verify

After the first scheduled run, confirm:

1. `C:\IT-Automation\Logs\health-check.log` exists and has today's entry
2. No ERROR lines in the log
3. Disk alert lines appear if any drive is below threshold

---

## Troubleshooting

**"ActiveDirectory module not found"**  
Install RSAT: `Add-WindowsCapability -Online -Name Rsat.ActiveDirectory.DS-LDS.Tools~~~~0.0.1.0`

**"Execution policy" error**  
Run: `Set-ExecutionPolicy RemoteSigned -Scope LocalMachine` as Administrator

**"Access denied" on cleanup**  
Run PowerShell as Administrator, or adjust the Task Scheduler task to run under a service account with appropriate permissions.

**"User not found" on password reset**  
Confirm the username with: `Get-ADUser -Filter "SamAccountName -eq 'username'"`

---

## Support

Questions or issues? Email: hello@taskpilot.dev — I respond within one business day.
