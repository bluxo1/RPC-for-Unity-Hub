$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Node = (Get-Command node -ErrorAction Stop).Source
$Entry = Join-Path $ProjectRoot 'dist\src\index.js'
$TaskName = 'UnityHubRPC'

function ConvertTo-PowerShellSingleQuotedArgument {
    param([Parameter(Mandatory = $true)][string]$Value)
    return "'" + $Value.Replace("'", "''") + "'"
}

if (-not (Test-Path $Entry)) {
    throw 'Build first with: npm run build'
}

$Command = '& ' + (ConvertTo-PowerShellSingleQuotedArgument $Node) + ' ' + (ConvertTo-PowerShellSingleQuotedArgument $Entry)
$Action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command `"$Command`"" -WorkingDirectory $ProjectRoot
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Force | Out-Null
Write-Host "Unity Hub RPC will start automatically at Windows logon."
