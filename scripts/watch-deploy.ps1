# Runs on the deployment machine. Checks the registry and deploys each new image that
# GitHub Actions publishes, going back to the previous image if the new one doesn't start.
param(
  [string]$Image = 'ghcr.io/tadelachewu/gitlab-node-practice:main',
  [string]$ContainerName = 'contacts-app-github',
  [int]$Port = 3001,
  [int]$IntervalSeconds = 60,
  [string]$EnvFile = (Join-Path $PSScriptRoot '..\.env'),
  [string]$LogFile = (Join-Path $PSScriptRoot '..\watch-deploy.log')
)

$ErrorActionPreference = 'Stop'

function Write-Log($message) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $message"
  Write-Output $line
  Add-Content -Path $LogFile -Value $line
}

# Docker writes some output to stderr, which must not count as a PowerShell error.
function Invoke-Docker {
  $ErrorActionPreference = 'Continue'
  $output = & docker @args 2>&1 | ForEach-Object { "$_" }
  if ($LASTEXITCODE) { throw "docker $($args[0]) failed: $output" }
  $output
}

function Get-ImageId($reference) {
  Invoke-Docker image inspect $reference --format '{{.Id}}'
}

function Get-ImageCommit($reference) {
  $labels = (Invoke-Docker image inspect $reference --format '{{json .Config.Labels}}') | ConvertFrom-Json
  $commit = $labels.'org.opencontainers.image.revision'
  if (-not $commit) { throw "Image $reference has no commit label." }
  $commit
}

function Get-RunningImageId {
  if (Invoke-Docker ps -aq --filter "name=^/$ContainerName$") {
    Invoke-Docker inspect $ContainerName --format '{{.Image}}'
  }
}

# Read on every deployment, so a changed .env applies to the next container. Throwing here
# leaves the running container alone and tries again next time, so fixing .env is enough.
function Import-SmtpSettings {
  $names = 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'
  foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $null, 'Process') }

  if (-not (Test-Path $EnvFile)) { throw "No settings file at $EnvFile. Nothing was deployed." }

  foreach ($line in Get-Content $EnvFile) {
    if ($line -match '^\s*(SMTP_HOST|SMTP_PORT|SMTP_USER|SMTP_PASS|EMAIL_FROM)\s*=\s*(.*?)\s*$') {
      $value = $Matches[2] -replace '^(["''])(.*)\1$', '$2'
      [Environment]::SetEnvironmentVariable($Matches[1], $value, 'Process')
    }
  }

  $missing = $names | Where-Object { -not [Environment]::GetEnvironmentVariable($_) }
  if ($missing) { throw "Missing from ${EnvFile}: $($missing -join ', '). Nothing was deployed." }
}

function Deploy-Image($reference) {
  & (Join-Path $PSScriptRoot 'deploy.ps1') -Image $reference -Commit (Get-ImageCommit $reference) `
    -ContainerName $ContainerName -Port $Port | ForEach-Object { Write-Log $_ }
}

Write-Log "Watching $Image every $IntervalSeconds seconds."
$failedImageId = $null

while ($true) {
  try {
    Invoke-Docker pull -q $Image | Out-Null
    $latestId = Get-ImageId $Image
    $runningId = Get-RunningImageId

    if ($latestId -ne $runningId -and $latestId -ne $failedImageId) {
      Import-SmtpSettings
      try {
        Write-Log "Deploying new image, commit $(Get-ImageCommit $latestId)."
        Deploy-Image $latestId
        $failedImageId = $null
      } catch {
        Write-Log "Deployment failed: $($_.Exception.Message)"
        $failedImageId = $latestId
        if ($runningId) {
          Write-Log "Going back to commit $(Get-ImageCommit $runningId)."
          Deploy-Image $runningId
        }
      }
    }
  } catch {
    # Docker Desktop may be stopped or the network down. Try again next time.
    Write-Log "Check failed: $($_.Exception.Message)"
  }

  Start-Sleep -Seconds $IntervalSeconds
}
