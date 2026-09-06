$ErrorActionPreference = 'Stop'
Unregister-ScheduledTask -TaskName 'UnityHubRPC' -Confirm:$false -ErrorAction SilentlyContinue
Write-Host 'Unity Hub RPC autostart was removed.'
