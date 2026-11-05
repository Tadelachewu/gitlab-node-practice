# Runs in a workflow job on the deployment machine. Logs in to Vault with the job's GitHub
# OIDC token, reads the email settings, and deploys the image with them.
param(
  [Parameter(Mandatory)][string]$Image,
  [Parameter(Mandatory)][string]$Commit,
  [Parameter(Mandatory)][string]$ContainerName,
  [Parameter(Mandatory)][int]$Port,
  [string]$VaultAddr = 'http://127.0.0.1:8200',
  [string]$VaultRole = 'github-actions',
  # Must match bound_audiences in the Vault role.
  [string]$Audience = 'https://github.com/tadelachewu',
  [string]$SecretPath = 'secret/data/apps/gitlab-node-practice/smtp'
)

$ErrorActionPreference = 'Stop'

if (-not $env:ACTIONS_ID_TOKEN_REQUEST_URL) {
  throw 'No OIDC token is available. This job needs the id-token: write permission.'
}

$tokenUrl = "$env:ACTIONS_ID_TOKEN_REQUEST_URL&audience=$([Uri]::EscapeDataString($Audience))"
$jwt = (Invoke-RestMethod $tokenUrl -Headers @{ Authorization = "Bearer $env:ACTIONS_ID_TOKEN_REQUEST_TOKEN" }).value

$login = Invoke-RestMethod "$VaultAddr/v1/auth/jwt/login" -Method Post -ContentType 'application/json' `
  -Body (@{ role = $VaultRole; jwt = $jwt } | ConvertTo-Json)
$vaultHeaders = @{ 'X-Vault-Token' = $login.auth.client_token }

$secret = (Invoke-RestMethod "$VaultAddr/v1/$SecretPath" -Headers $vaultHeaders).data.data

# The settings have been read, so this job has no further use for its Vault login.
Invoke-RestMethod "$VaultAddr/v1/auth/token/revoke-self" -Method Post -Headers $vaultHeaders | Out-Null

foreach ($name in 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM') {
  $value = $secret.$name
  # Tells GitHub to hide these values if they ever appear in the job's log.
  if ($value -and $name -in 'SMTP_USER', 'SMTP_PASS') { Write-Output "::add-mask::$value" }
  [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}
Write-Output "Read the email settings from Vault at $SecretPath."

& (Join-Path $PSScriptRoot 'deploy.ps1') -Image $Image -Commit $Commit -ContainerName $ContainerName -Port $Port
