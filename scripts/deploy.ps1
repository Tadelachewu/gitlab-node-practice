# Replaces the running container with a commit's image, and fails unless the new build is serving.
param(
  [Parameter(Mandatory)][string]$Commit,
  [Parameter(Mandatory)][string]$ContainerName,
  [Parameter(Mandatory)][int]$Port,
  [string]$Image = "contacts-app:$Commit"
)

$ErrorActionPreference = 'Stop'

# Docker writes some output to stderr, which must not count as a PowerShell error.
function Invoke-Docker {
  $ErrorActionPreference = 'Continue'
  & docker @args 2>&1 | ForEach-Object { "$_" }
  if ($LASTEXITCODE) { throw "docker $($args[0]) failed with exit code $LASTEXITCODE." }
}

function Wait-ForCommit {
  $url = "http://127.0.0.1:$Port/api/health"
  $deadline = (Get-Date).AddSeconds(30)

  while ((Get-Date) -lt $deadline) {
    try {
      $health = Invoke-RestMethod $url -TimeoutSec 2
      if ($health.commit -eq $Commit) {
        Write-Output "Container $ContainerName is running commit $Commit at http://localhost:$Port"
        return
      }
    } catch {
      # Not listening yet.
    }
    Start-Sleep -Seconds 1
  }

  Invoke-Docker logs --tail 20 $ContainerName
  throw "The container did not report commit $Commit at $url within 30 seconds."
}

$settingNames = 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'

# Checked before the running container is removed, so a missing setting doesn't take the app down.
$missing = $settingNames | Where-Object { -not [Environment]::GetEnvironmentVariable($_) }
if ($missing) { throw "Missing settings: $($missing -join ', '). Nothing was deployed." }

Invoke-Docker image inspect $Image --format "Deploying commit $Commit" | Write-Output

if (Invoke-Docker ps -aq --filter "name=^/$ContainerName$") {
  Invoke-Docker rm -f $ContainerName | Out-Null
}

$listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  throw "Port $Port is in use by process $($listener.OwningProcess). Stop it, then retry this job."
}

# Naming a variable without a value copies it from this job, which keeps it out of the command line.
$smtpArgs = foreach ($name in $settingNames) { '-e'; $name }

# The app has no login, so only publish it to this machine.
Invoke-Docker run -d --name $ContainerName --restart unless-stopped `
  -p "127.0.0.1:${Port}:3000" @smtpArgs $Image | Out-Null

Wait-ForCommit
