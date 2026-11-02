# Replaces the deployed app with dist/, starts it, and fails unless the new build is serving.
param(
  [string]$Target = (Join-Path $env:USERPROFILE 'deployments\gitlab-node-practice'),
  [string]$TaskName = 'gitlab-node-practice',
  [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'

function Stop-DeployedServer {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $TaskName
  }

  # Stopping the task can leave node running, and the server may also have been started by hand.
  $serverPath = Join-Path $Target 'server.js'
  Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -and $_.CommandLine.Contains($serverPath) } |
    ForEach-Object {
      Stop-Process -Id $_.ProcessId -Force
      Wait-Process -Id $_.ProcessId -ErrorAction SilentlyContinue
    }
}

function Write-SmtpSettings {
  $settings = [ordered]@{}
  foreach ($name in 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM') {
    $value = [Environment]::GetEnvironmentVariable($name)
    if ($value) { $settings[$name] = $value }
  }
  $settings | ConvertTo-Json | Set-Content (Join-Path $Target 'smtp-settings.json') -Encoding utf8
  Write-Output "SMTP settings provided: $($settings.Count) of 5"
}

# Task Scheduler runs the server outside this job, so it keeps running after the job ends.
# It also starts the server again whenever this user logs on.
function Register-ServerTask {
  $user = "$env:USERDOMAIN\$env:USERNAME"
  $script = Join-Path $Target 'start-server.ps1'
  $action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`" -Port $Port"
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
  $principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
  # By default, tasks are stopped after 3 days and don't run on battery power.
  $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings -Force | Out-Null
}

function Wait-ForCommit($commit) {
  $url = "http://127.0.0.1:$Port/api/health"
  $deadline = (Get-Date).AddSeconds(30)

  while ((Get-Date) -lt $deadline) {
    try {
      $health = Invoke-RestMethod $url -TimeoutSec 2
      if ($health.commit -eq $commit) {
        Write-Output "Server is running commit $commit at http://localhost:$Port"
        return
      }
    } catch {
      # Not listening yet.
    }
    Start-Sleep -Seconds 1
  }

  foreach ($log in 'server.log', 'server-error.log') {
    $path = Join-Path $Target $log
    if (Test-Path $path) {
      Write-Output "--- $log ---"
      Get-Content $path -Tail 20
    }
  }
  throw "The server did not report commit $commit at $url within 30 seconds."
}

$dist = Join-Path $PSScriptRoot '..\dist'

Stop-DeployedServer

$listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  throw "Port $Port is in use by process $($listener.OwningProcess). Stop it, then retry this job."
}

if (Test-Path $Target) { Remove-Item $Target -Recurse -Force }
New-Item -ItemType Directory -Path $Target | Out-Null
Copy-Item (Join-Path $dist '*') $Target -Recurse
Copy-Item (Join-Path $PSScriptRoot 'start-server.ps1') $Target
Write-Output "Deployed to $Target"

Write-SmtpSettings
Register-ServerTask
Start-ScheduledTask -TaskName $TaskName

$buildInfo = Get-Content (Join-Path $Target 'build-info.json') -Raw | ConvertFrom-Json
Wait-ForCommit $buildInfo.commit
