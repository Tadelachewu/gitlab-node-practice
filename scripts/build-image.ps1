# Builds the Docker image for a commit. The image stays in this machine's Docker.
param([Parameter(Mandatory)][string]$Commit)

# Docker writes its progress to stderr, which must not count as a PowerShell error.
$ErrorActionPreference = 'Continue'

docker build -t "contacts-app:$Commit" --build-arg "BUILD_COMMIT=$Commit" (Join-Path $PSScriptRoot '..') 2>&1 |
  ForEach-Object { "$_" }
if ($LASTEXITCODE) { throw "docker build failed with exit code $LASTEXITCODE." }
