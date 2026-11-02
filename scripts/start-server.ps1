# Copied into the deployment folder by deploy.ps1. Runs the app until it is stopped.
param([int]$Port = 3000)

$ErrorActionPreference = 'Stop'

$settingsPath = Join-Path $PSScriptRoot 'smtp-settings.json'
if (Test-Path $settingsPath) {
  $settings = Get-Content $settingsPath -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($setting in $settings.PSObject.Properties) {
    Set-Item "Env:$($setting.Name)" $setting.Value
  }
}

$env:PORT = $Port
# The app has no login, so only accept connections from this machine.
$env:HOSTNAME = '127.0.0.1'

Set-Location $PSScriptRoot
$server = Join-Path $PSScriptRoot 'server.js'
Start-Process node -ArgumentList "`"$server`"" -NoNewWindow -Wait `
  -RedirectStandardOutput (Join-Path $PSScriptRoot 'server.log') `
  -RedirectStandardError (Join-Path $PSScriptRoot 'server-error.log')
