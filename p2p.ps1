#
# P2P Marketplace — development launcher (Windows)
#
#   Double-click p2p.bat, or:  powershell -ExecutionPolicy Bypass -File p2p.ps1
#
# One menu window that stays open, and each service in its own window so the
# Expo QR code and the server logs stay readable. Restarting a service closes
# its window and opens a fresh one rather than stacking duplicates.
#
# The LAN IP is re-detected on every start, so switching WiFi never means
# editing a config file.

$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Run  = Join-Path $Root '.p2p-run'
New-Item -ItemType Directory -Force -Path $Run | Out-Null

$Services = @(
  @{ Key='backend'; Label='Backend API';   Dir=(Join-Path $Root 'server'); Port=8000; Cmd='npm run dev' }
  @{ Key='web';     Label='Web app';       Dir=(Join-Path $Root 'web');    Port=5173; Cmd='npm run dev -- --host' }
  @{ Key='mobile';  Label='Mobile (Expo)'; Dir=(Join-Path $Root 'mobile'); Port=8081; Cmd='npx expo start --lan' }
)
function Get-Service-Def($key) { $Services | Where-Object { $_.Key -eq $key } | Select-Object -First 1 }

# ── Network ──────────────────────────────────────────────────────────────────

# Current LAN IP. Skips loopback, APIPA and virtual adapters (Hyper-V, WSL,
# VirtualBox) so services advertise something a phone can actually reach.
function Get-LanIp {
  try {
    $candidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
      Where-Object {
        $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and
        $_.InterfaceAlias -notmatch 'Loopback|vEthernet|WSL|VirtualBox|Hyper-V|Docker'
      }
    # Prefer a connected Wi-Fi/Ethernet adapter over anything else.
    $preferred = $candidates | Where-Object { $_.InterfaceAlias -match 'Wi-Fi|WiFi|Wireless|Ethernet' }
    $pick = if ($preferred) { $preferred | Select-Object -First 1 } else { $candidates | Select-Object -First 1 }
    if ($pick) { return $pick.IPAddress }
  } catch { }
  return '127.0.0.1'
}

# ── Service control ──────────────────────────────────────────────────────────

function PidFile($key) { Join-Path $Run "$key.pid" }

function Test-ServiceRunning($key) {
  $f = PidFile $key
  if (-not (Test-Path $f)) { return $false }
  $procId = Get-Content $f -ErrorAction SilentlyContinue
  if (-not $procId) { return $false }
  return [bool](Get-Process -Id $procId -ErrorAction SilentlyContinue)
}

function Get-PortOwners($port) {
  try {
    return (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop |
            Select-Object -ExpandProperty OwningProcess -Unique)
  } catch { return @() }
}

function Stop-Tree($procId) {
  # taskkill /T takes the console window and everything it spawned (node, metro…)
  & taskkill /PID $procId /T /F *> $null
}

function Stop-Service-Window($key, [switch]$Quiet) {
  $svc = Get-Service-Def $key
  $stopped = $false
  $f = PidFile $key
  if (Test-Path $f) {
    $procId = Get-Content $f -ErrorAction SilentlyContinue
    if ($procId -and (Get-Process -Id $procId -ErrorAction SilentlyContinue)) {
      Stop-Tree $procId; $stopped = $true
    }
    Remove-Item $f -Force -ErrorAction SilentlyContinue
  }
  # A previous run (or a manual npm) may still own the port.
  foreach ($owner in (Get-PortOwners $svc.Port)) { Stop-Tree $owner; $stopped = $true }
  if ($stopped -and -not $Quiet) { Write-Host ("  stopped  " + $svc.Label) -ForegroundColor Yellow }
}

function Start-Service-Window($key) {
  $svc = Get-Service-Def $key
  if (-not (Test-Path $svc.Dir)) {
    Write-Host ("  failed   " + $svc.Label + " — " + $svc.Dir + " not found") -ForegroundColor Red
    return
  }

  $ip = $script:Ip
  # Re-detected by the launcher on every start, so switching networks needs no edits.
  $env_lines = @(
    "set `"LAN_IP=$ip`""
    "set `"EXPO_PUBLIC_API_URL=http://${ip}:8000`""
    "set `"VITE_API_URL=http://${ip}:8000`""
    "set `"REACT_NATIVE_PACKAGER_HOSTNAME=$ip`""
  ) -join "`r`n"

  $cmdFile = Join-Path $Run "$key.run.cmd"
  @"
@echo off
title P2P - $($svc.Label)
cd /d "$($svc.Dir)"
$env_lines
echo ----------------------------------------------------------
echo  $($svc.Label)
echo  dir : $($svc.Dir)
echo  host: http://${ip}:$($svc.Port)
echo ----------------------------------------------------------
echo.
if not exist node_modules (
  echo Installing dependencies...
  call npm install || goto :failed
)
call $($svc.Cmd)
set CODE=%ERRORLEVEL%
echo.
echo ----------------------------------------------------------
if not "%CODE%"=="0" (
  echo  $($svc.Label) exited with code %CODE%.
  echo  Scroll up for the error. Common causes: port in use, missing .env,
  echo  or dependencies out of date ^(try: cd "$($svc.Dir)" ^&^& npm install^).
) else (
  echo  $($svc.Label) stopped.
)
echo ----------------------------------------------------------
pause
exit /b %CODE%
:failed
echo Dependency install failed.
pause
exit /b 1
"@ | Set-Content -Path $cmdFile -Encoding ASCII

  # Launch cmd.exe directly and keep its PID. wt.exe is a thin client that
  # returns immediately, so its PID is dead on arrival and could never be used
  # to close the window later. On Windows 11 this still opens inside Windows
  # Terminal when that's the default terminal app, so Expo's QR renders fine.
  $proc = Start-Process cmd.exe -PassThru -ArgumentList @('/k', "`"$cmdFile`"")

  if ($proc) { $proc.Id | Set-Content (PidFile $key) }
  Start-Sleep -Milliseconds 500
  Write-Host ("  started  {0,-14} http://{1}:{2}" -f $svc.Label, $ip, $svc.Port) -ForegroundColor Green
}

function Restart-Service-Window($key) {
  $svc = Get-Service-Def $key
  if (Test-ServiceRunning $key) {
    Write-Host ("  restarting " + $svc.Label + "...")
    Stop-Service-Window $key -Quiet
    Start-Sleep -Milliseconds 700
  }
  Start-Service-Window $key
}

function Start-All   { $script:Ip = Get-LanIp; foreach ($s in $Services) { Restart-Service-Window $s.Key } }
function Stop-All    { foreach ($s in $Services) { Stop-Service-Window $s.Key }; Write-Host '  all service windows closed.' }
function Restart-All { Stop-All; Start-Sleep -Seconds 1; $script:Ip = Get-LanIp; foreach ($s in $Services) { Start-Service-Window $s.Key } }

# ── UI ───────────────────────────────────────────────────────────────────────

function Show-Menu {
  $script:Ip = Get-LanIp
  Clear-Host
  Write-Host '+----------------------------------------------------------+' -ForegroundColor Cyan
  Write-Host '|  P2P Marketplace - development launcher                  |' -ForegroundColor Cyan
  Write-Host '+----------------------------------------------------------+' -ForegroundColor Cyan
  Write-Host ("  LAN IP   $script:Ip   (re-detected each start)")
  Write-Host ''
  Write-Host ("  {0,-16} {1,-12} {2}" -f 'SERVICE', 'STATUS', 'URL')
  foreach ($s in $Services) {
    if (Test-ServiceRunning $s.Key)          { $st='running';   $col='Green' }
    elseif ((Get-PortOwners $s.Port).Count)  { $st='port busy'; $col='Yellow' }
    else                                     { $st='stopped';   $col='DarkGray' }
    Write-Host ("  {0,-16} " -f $s.Label) -NoNewline
    Write-Host ("{0,-12}" -f $st) -ForegroundColor $col -NoNewline
    Write-Host (" http://{0}:{1}" -f $script:Ip, $s.Port) -ForegroundColor DarkGray
  }
  Write-Host ''
  Write-Host '  1) Start/Restart Backend'
  Write-Host '  2) Start/Restart Web'
  Write-Host '  3) Start/Restart Mobile (Expo)'
  Write-Host '  4) Start All Services'
  Write-Host '  5) Restart All Services'
  Write-Host '  6) Stop All Services'
  Write-Host '  7) Exit'
  Write-Host ''
}

while ($true) {
  Show-Menu
  $choice = Read-Host '  Choose [1-7]'
  Write-Host ''
  switch ($choice) {
    '1' { $script:Ip = Get-LanIp; Restart-Service-Window 'backend' }
    '2' { $script:Ip = Get-LanIp; Restart-Service-Window 'web' }
    '3' { $script:Ip = Get-LanIp; Restart-Service-Window 'mobile' }
    '4' { Start-All }
    '5' { Restart-All }
    '6' { Stop-All }
    '7' { Write-Host '  Leaving services running. Bye.'; exit 0 }
    default { Write-Host '  Pick a number between 1 and 7.' -ForegroundColor Red }
  }
  Write-Host ''
  Read-Host '  Press Enter to return to the menu' | Out-Null
}
