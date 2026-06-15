; =====================================================================
; 💎 Nexus POS Engine - Inno Setup Configuration Script (FIXED)
; =====================================================================

[Setup]
; App Metadata
AppName=Nexus
AppVersion=1.2.1
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

; Add your application logo icon here (.ico format required)
SetupIconFile=C:\Users\Dell\Documents\WebProjects\Nexus\resources\favicon.ico

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; 1. The Core Launchers (FIXED: Added your compiled C# executable back so shortcuts work)
Source: "C:\Users\Dell\Documents\WebProjects\Nexus\Nexus.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Users\Dell\Documents\WebProjects\Nexus\Run-Nexus.bat"; DestDir: "{app}"; Flags: ignoreversion

; 2. The Production Backend Folders (dist and node_modules only)
Source: "C:\Users\Dell\Documents\WebProjects\Nexus\backend\dist\*"; DestDir: "{app}\backend\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "C:\Users\Dell\Documents\WebProjects\Nexus\backend\node_modules\*"; DestDir: "{app}\backend\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

; 3. The Standalone Production Frontend Folders (FIXED: Set DestDir to preserve Next.js standalone mapping)
Source: "C:\Users\Dell\Documents\WebProjects\Nexus\frontend\.next\standalone\*"; DestDir: "{app}\frontend\.next\standalone"; Flags: ignoreversion recursesubdirs createallsubdirs

; 4. The Embedded Execution Environments (Node runtime binaries)
Source: "C:\Users\Dell\Documents\WebProjects\Nexus\resources\node\*"; DestDir: "{app}\resources\node"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Create Start Menu entries pointing to the native launcher executable
Name: "{group}\Nexus"; Filename: "{app}\Nexus.exe"; IconFilename: "{app}\Nexus.exe"
Name: "{group}\{cm:UninstallProgram,Nexus}"; Filename: "{uninstallexe}"

; Create Desktop Shortcut entry if the user checks the checkbox option during setup wizard
Name: "{autodesktop}\Nexus"; Filename: "{app}\Nexus.exe"; Tasks: desktopicon; IconFilename: "{app}\Nexus.exe"

[Run]
; Automatically launch the application seamlessly right after the installation wizard hits 100%
Description: "{cm:LaunchProgram,Nexus}"; Flags: nowait postinstall skipifsilent; Filename: "{app}\Nexus.exe"