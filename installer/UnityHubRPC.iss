#define AppName "Unity Hub RPC"
; Overridden from the tag via ISCC /DAppVersion=... in CI; this default is only for local builds.
#ifndef AppVersion
  #define AppVersion "0.0.0-dev"
#endif
#define AppPublisher "Unity Hub RPC"
#define AppExeName "UnityHubRPC.exe"

[Setup]
AppId={{7D5B5A7B-5C3A-4E12-8F56-1234567890AB}}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={localappdata}\UnityHubRPC
DefaultGroupName={#AppName}
OutputDir=..\release
OutputBaseFilename=UnityHubRPC-Setup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayName={#AppName}

[Files]
Source: "..\dist\UnityHubRPC.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\dist\traybin\*"; DestDir: "{app}\traybin"; Flags: ignoreversion
Source: "..\config.example.json"; DestDir: "{app}"; DestName: "config.example.json"; Flags: ignoreversion

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{userstartup}\{#AppName}"; Filename: "powershell.exe"; Parameters: "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command ""Start-Process -FilePath '{app}\{#AppExeName}' -WorkingDirectory '{app}' -WindowStyle Hidden"""

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Start {#AppName}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "schtasks.exe"; Parameters: "/Delete /TN UnityHubRPC /F"; Flags: runhidden
