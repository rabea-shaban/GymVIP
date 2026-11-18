; =====================================================================
; GymVIP Commercial Standalone Installer Script (Inno Setup)
; Compiles the entire GymVIP On-Premise SaaS into a single setup EXE.
; =====================================================================

#define MyAppName "GymVIP"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "GymVIP Software Solutions"
#define MyAppURL "https://gymvip.eg"
#define MyAppExeName "GymVIP.vbs"

[Setup]
AppId={{D37F2C0B-4819-4A92-80F5-A938C2652A10}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
LicenseFile=..\..\LICENSE
OutputDir=..\..\dist-installer
OutputBaseFilename=GymVIP-Setup-v1.0.0
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "arabic"; MessagesFile: "compiler:Languages\Arabic.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Dist Files & Executable scripts
Source: "..\..\Backend\dist\*"; DestDir: "{app}\Backend\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\Backend\node_modules\*"; DestDir: "{app}\Backend\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\Backend\prisma\*"; DestDir: "{app}\Backend\prisma"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\..\Backend\package.json"; DestDir: "{app}\Backend"; Flags: ignoreversion
Source: "..\..\Frontend\dist\*"; DestDir: "{app}\Frontend\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "start-gymvip.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "stop-gymvip.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: shellexec postinstall skipifsilent
