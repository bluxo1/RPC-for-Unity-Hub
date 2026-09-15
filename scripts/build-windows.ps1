$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

npm run build
if ($LASTEXITCODE -ne 0) { throw 'TypeScript build failed.' }

node scripts/bundle.mjs
if ($LASTEXITCODE -ne 0) { throw 'esbuild bundling failed.' }

node --experimental-sea-config sea-config.json
if ($LASTEXITCODE -ne 0) { throw 'Node SEA blob creation failed.' }

$node = (Get-Command node -ErrorAction Stop).Source
Copy-Item $node dist/UnityHubRPC.exe -Force
$fuse = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'
npx.cmd postject dist\UnityHubRPC.exe NODE_SEA_BLOB dist\unity-hub-rpc.blob --sentinel-fuse $fuse
if ($LASTEXITCODE -ne 0) { throw 'SEA blob injection failed.' }

# The tray helper is a separate binary that a single-file executable cannot carry.
# systray2 looks for it at `./traybin/<name>` relative to the working directory before
# falling back to its own package, and the installer registers the app to start with
# -WorkingDirectory '{app}', so shipping it beside the exe is what makes the tray work.
$trayBin = 'node_modules\systray2\traybin\tray_windows_release.exe'
if (-not (Test-Path $trayBin)) { throw "Tray helper not found at $trayBin." }
New-Item -ItemType Directory -Force -Path dist\traybin | Out-Null
Copy-Item $trayBin dist\traybin\ -Force

Write-Host 'Built dist/UnityHubRPC.exe'
