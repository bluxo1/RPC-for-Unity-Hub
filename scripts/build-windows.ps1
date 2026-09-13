$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

npm run build
if ($LASTEXITCODE -ne 0) { throw 'TypeScript build failed.' }

$clientId = $env:UNITY_HUB_RPC_CLIENT_ID
if (-not $clientId) { $clientId = '1545892869363998771' }
$encodedClientId = $clientId | ConvertTo-Json -Compress
npx.cmd esbuild .\src\index.ts --bundle --platform=node --format=cjs "--define:process.env.UNITY_HUB_RPC_CLIENT_ID=$encodedClientId" --outfile=dist\bundle.cjs
if ($LASTEXITCODE -ne 0) { throw 'esbuild bundling failed.' }

node --experimental-sea-config sea-config.json
if ($LASTEXITCODE -ne 0) { throw 'Node SEA blob creation failed.' }

$node = (Get-Command node -ErrorAction Stop).Source
Copy-Item $node dist/UnityHubRPC.exe -Force
$fuse = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'
npx.cmd postject dist\UnityHubRPC.exe NODE_SEA_BLOB dist\unity-hub-rpc.blob --sentinel-fuse $fuse
if ($LASTEXITCODE -ne 0) { throw 'SEA blob injection failed.' }
Write-Host 'Built dist/UnityHubRPC.exe'
