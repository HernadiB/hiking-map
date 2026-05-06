[CmdletBinding()]
param(
  [switch]$LaunchEmulator,
  [switch]$Clear,
  [int]$Port = 8081,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Test-UnsafePath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if ($Path -match '\s') {
    return $true
  }

  foreach ($character in $Path.ToCharArray()) {
    if ([int][char]$character -gt 127) {
      return $true
    }
  }

  return $false
}

function Resolve-RepositoryRoot {
  if ($env:HIKING_MAP_APP_ROOT) {
    return (Resolve-Path -LiteralPath $env:HIKING_MAP_APP_ROOT).Path
  }

  $scriptRoot = Split-Path -Parent $PSCommandPath
  $repoRoot = (Resolve-Path -LiteralPath (Join-Path $scriptRoot '..')).Path

  if (-not (Test-UnsafePath -Path $repoRoot)) {
    return $repoRoot
  }

  # Prefer a plain ASCII copy for Android native tooling.
  $asciiCandidate = 'C:\dev\hiking-map'
  $candidatePackageJson = Join-Path $asciiCandidate 'mobile\package.json'

  if (Test-Path -LiteralPath $candidatePackageJson) {
    return $asciiCandidate
  }

  throw "This repository path is not safe for Android native tooling: $repoRoot. Set HIKING_MAP_APP_ROOT to a plain ASCII copy, or create C:\dev\hiking-map."
}

function Configure-AndroidEnvironment {
  $androidHome = 'C:\Android\AndroidStudio'
  $javaHome = 'C:\Program Files\Android\Android Studio\jbr'
  $androidUserHome = 'C:\Android\user'
  $androidAvdHome = 'C:\Android\avd'
  $gradleUserHome = 'C:\Android\gradle'
  $pathEntries = New-Object System.Collections.Generic.List[string]

  if (Test-Path -LiteralPath (Join-Path $javaHome 'bin\java.exe')) {
    $env:JAVA_HOME = $javaHome
    $pathEntries.Add((Join-Path $javaHome 'bin'))
  }

  if (Test-Path -LiteralPath $androidHome) {
    $env:ANDROID_HOME = $androidHome
    $env:ANDROID_SDK_ROOT = $androidHome
    $pathEntries.Add((Join-Path $androidHome 'platform-tools'))
    $pathEntries.Add((Join-Path $androidHome 'emulator'))
    $pathEntries.Add((Join-Path $androidHome 'cmdline-tools\latest\bin'))
  }

  if (Test-Path -LiteralPath $androidUserHome) {
    $env:ANDROID_USER_HOME = $androidUserHome
    $env:HOME = $androidUserHome
    $env:USERPROFILE = $androidUserHome
  }

  if (Test-Path -LiteralPath $androidAvdHome) {
    $env:ANDROID_AVD_HOME = $androidAvdHome
  }

  if (Test-Path -LiteralPath $gradleUserHome) {
    $env:GRADLE_USER_HOME = $gradleUserHome
  }

  $existingPathEntries = @()

  if ($env:Path) {
    $existingPathEntries = $env:Path.Split(';') | Where-Object { $_ }
  }

  $env:Path = (($pathEntries + $existingPathEntries) | Select-Object -Unique) -join ';'
}

function Get-AdbPath {
  $resolvedCommand = Get-Command adb -ErrorAction SilentlyContinue

  if ($resolvedCommand) {
    return $resolvedCommand.Source
  }

  $fallbackPath = 'C:\Android\AndroidStudio\platform-tools\adb.exe'

  if (Test-Path -LiteralPath $fallbackPath) {
    return $fallbackPath
  }

  throw 'adb.exe was not found. Install Android Platform-Tools first.'
}

function Get-EmulatorPath {
  $emulatorPath = 'C:\Android\AndroidStudio\emulator\emulator.exe'

  if (Test-Path -LiteralPath $emulatorPath) {
    return $emulatorPath
  }

  throw 'The Android emulator binary was not found. Install the Android Emulator component first.'
}

function Get-ConnectedDevices {
  param(
    [Parameter(Mandatory = $true)]
    [string]$AdbPath
  )

  return @(
    & $AdbPath devices |
      Select-Object -Skip 1 |
      Where-Object { $_ -match '\sdevice$' }
  )
}

function Ensure-EmulatorAndReverse {
  param(
    [Parameter(Mandatory = $true)]
    [switch]$LaunchEmulator,
    [Parameter(Mandatory = $true)]
    [int]$Port,
    [Parameter(Mandatory = $true)]
    [switch]$DryRun
  )

  if ($DryRun) {
    if ($LaunchEmulator) {
      Write-Host 'Would launch the configured Android emulator if no device is connected.'
    }

    Write-Host "Would run: adb reverse tcp:$Port tcp:$Port"
    return
  }

  $adbPath = Get-AdbPath
  $connectedDevices = @(Get-ConnectedDevices -AdbPath $adbPath)

  if ($connectedDevices.Count -eq 0 -and $LaunchEmulator) {
    $emulatorPath = Get-EmulatorPath
    $availableAvds = @(& $emulatorPath -list-avds | Where-Object { $_.Trim() })

    if ($availableAvds.Count -eq 0) {
      throw 'No Android Virtual Device is available. Create one in Android Studio first.'
    }

    $avdName = 'HikingMap_Pixel_8_API_36'

    if ($availableAvds -notcontains $avdName) {
      $avdName = $availableAvds[0]
    }

    if ($DryRun) {
      Write-Host "Would launch emulator: $avdName"
    } else {
      Write-Host "Launching emulator: $avdName"
      Start-Process -FilePath $emulatorPath -ArgumentList @('-avd', $avdName) | Out-Null
      & $adbPath wait-for-device | Out-Null
    }
  }

  $connectedDevices = @(Get-ConnectedDevices -AdbPath $adbPath)

  if ($connectedDevices.Count -eq 0) {
    Write-Host 'No Android device is connected. Start one manually or rerun with -LaunchEmulator.'
    return
  }

  & $adbPath reverse ("tcp:$Port") ("tcp:$Port") | Out-Null
}

Configure-AndroidEnvironment

$repositoryRoot = Resolve-RepositoryRoot
$mobileRoot = Join-Path $repositoryRoot 'mobile'

if (-not (Test-Path -LiteralPath (Join-Path $mobileRoot 'package.json'))) {
  throw "The Expo app was not found under: $mobileRoot"
}

$startScript = 'start'

if ($Clear) {
  $startScript = 'start:clear'
}

$npmArguments = @('run', $startScript, '--', '--dev-client', '--port', $Port)

Write-Host "Mobile workspace: $mobileRoot"

if ((Resolve-Path -LiteralPath (Join-Path (Split-Path -Parent $PSCommandPath) '..')).Path -ne $repositoryRoot) {
  Write-Host "Using ASCII-safe repository copy: $repositoryRoot"
}

Ensure-EmulatorAndReverse -LaunchEmulator:$LaunchEmulator -Port $Port -DryRun:$DryRun

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
