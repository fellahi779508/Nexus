; =====================================================================
; 💎 Nexus POS Engine - Inno Setup Configuration Script (ELECTRON EDITION)
; =====================================================================

[Setup]
; App Metadata
AppName=Nexus
AppVersion=1.3.0
AppPublisher=Duss Software Solutions
AppId={{8F5B2C9A-4D3E-4A1B-BC7D-2E9C3D8F5A6B}
DefaultDirName={autopf}\Nexus
DefaultGroupName=Nexus

; Design & Styling Configurations
DisableProgramGroupPage=yes
DisableWelcomePage=no
WizardStyle=modern

; Output Build Settings
OutputDir=C:\Nexus-Distributable
OutputBaseFilename=Nexus-Setup
Compression=lzma2/max
SolidCompression=yes

; Execution Privilege Level (Requires Admin to install safely to Program Files)
PrivilegesRequired=admin

; Application Logo Icon
SetupIconFile=C:\Users\Dell\Documents\WebProjects\Nexus\resources\favicon.ico

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; 🚀 The Single Electron Payload
; This grabs the main Nexus.exe, along with all the packaged resources, locales, and chromium runtimes inside win-unpacked.
Source: "C:\Users\Dell\Documents\WebProjects\Nexus\dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Create Start Menu entries pointing to your new native Electron executable
Name: "{group}\Nexus"; Filename: "{app}\Nexus.exe"; IconFilename: "{app}\Nexus.exe"
Name: "{group}\{cm:UninstallProgram,Nexus}"; Filename: "{uninstallexe}"

; Create Desktop Shortcut entry if checked during the setup wizard
Name: "{autodesktop}\Nexus"; Filename: "{app}\Nexus.exe"; Tasks: desktopicon; IconFilename: "{app}\Nexus.exe"

[Run]
; Automatically launch the application seamlessly right after the installation hits 100%
Description: "{cm:LaunchProgram,Nexus}"; Flags: nowait postinstall skipifsilent; Filename: "{app}\Nexus.exe"