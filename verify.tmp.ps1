$ErrorActionPreference = 'Stop'
$setup = 'C:\Users\hgher\AppData\Local\Temp\uhrpc-setup.exe'
$dir = Join-Path $env:TEMP 'uhrpc-verify'
Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue

# skipifsilent on the [Run] entry means /VERYSILENT will not launch the app.
Start-Process $setup -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART',"/DIR=$dir" -Wait
Start-Sleep -Seconds 2

$keys = Get-ChildItem 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall' -ErrorAction SilentlyContinue
$found = $false
foreach ($k in $keys) {
  $p = Get-ItemProperty $k.PSPath -ErrorAction SilentlyContinue
  if ($p.DisplayName -like '*Unity Hub RPC*') {
    Write-Host "DisplayName   : $($p.DisplayName)"
    Write-Host "DisplayVersion: $($p.DisplayVersion)"
    Write-Host "InstallLoc    : $($p.InstallLocation)"
    $uninst = $p.QuietUninstallString
    if (-not $uninst) { $uninst = $p.UninstallString }
    $found = $true
  }
}
if (-not $found) { Write-Host 'NOT FOUND in uninstall registry' }

Write-Host "--- installed files ---"
Get-ChildItem $dir -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name

# Clean up: this was a verification install only.
if ($uninst) {
  $exe = ($uninst -replace '"','').Split(' /')[0]
  if (Test-Path $exe) {
    Start-Process $exe -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART' -Wait
    Start-Sleep -Seconds 3
    Write-Host "uninstalled: $(-not (Test-Path (Join-Path $dir 'UnityHubRPC.exe')))"
  }
}
Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue
