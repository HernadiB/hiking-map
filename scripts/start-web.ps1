[CmdletBinding()]
param(
  [switch]$Clear,
  [int]$Port = 8082,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Resolve-RepositoryRoot {
  if ($env:HIKING_MAP_APP_ROOT) {
    return (Resolve-Path -LiteralPath $env:HIKING_MAP_APP_ROOT).Path
  }

  $scriptRoot = Split-Path -Parent $PSCommandPath
  return (Resolve-Path -LiteralPath (Join-Path $scriptRoot '..')).Path
}

$repositoryRoot = Resolve-RepositoryRoot
$mobileRoot = Join-Path $repositoryRoot 'mobile'

if (-not (Test-Path -LiteralPath (Join-Path $mobileRoot 'package.json'))) {
  throw "The Expo app was not found under: $mobileRoot"
}

$npmArguments = @('run', 'web', '--', '--port', $Port)

if ($Clear) {
  $npmArguments += '--clear'
}

Write-Host "Web workspace: $mobileRoot"

if ($DryRun) {
  Write-Host "Would run: npm.cmd $($npmArguments -join ' ')"
  exit 0
}

Push-Location -LiteralPath $mobileRoot

try {
  & npm.cmd @npmArguments
} finally {
  Pop-Location
}
