; =====================================================================
; 💎 Nexus POS Engine - Inno Setup Configuration Script (ELECTRON EDITION)
; =====================================================================

[Setup]
; App Metadata
AppName=Nexus
AppVersion=1.3.0
<<<<<<< HEAD
AppPublisher=Nexus Software Solutions
AppId={{8F5B2C9A-4D3E-4A1B-BC7D-2E9C3D8F5A6B}
=======
AppPublisher=Duss Software Solutions
AppId={{8F5B2C9A-4D3E-4A1B-BC7D-2E9C3D8F5A6B}}
>>>>>>> 4bcc8df4307e681ff3cd2c38fcb76fc1132aca87
DefaultDirName={autopf}\Nexus
DefaultGroupName=Nexus

; Design & Styling Configurations
DisableProgramGroupPage=yes
DisableWelcomePage=no
WizardStyle=modern

; Output Build Settings
OutputDir=C:\Nexus-Distributable
OutputBaseFilename=Nexus-v1.3.0-Setup
Compression=lzma2/max
SolidCompression=yes

; Execution Privilege Level (Requires Admin to install safely to Program Files)
PrivilegesRequired=admin

; Application Logo Icon
SetupIconFile=E:\Stock-Manager-Electron\resources\favicon.ico

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; 🚀 The Single Electron Payload
<<<<<<< HEAD
; This grabs the main Nexus.exe, along with all the packaged resources, locales, and chromium runtimes inside win-unpacked.
Source: "E:\Stock-Manager-Electron\dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
=======
Source: "C:\Users\Dell\Documents\WebProjects\Nexus\dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{src}\license.dat"; DestDir: "{app}\resources\"; Flags: external onlyifdoesntexist
>>>>>>> 4bcc8df4307e681ff3cd2c38fcb76fc1132aca87

[Icons]
Name: "{group}\Nexus"; Filename: "{app}\Nexus.exe"; IconFilename: "{app}\Nexus.exe"
Name: "{group}\{cm:UninstallProgram,Nexus}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Nexus"; Filename: "{app}\Nexus.exe"; Tasks: desktopicon; IconFilename: "{app}\Nexus.exe"

[Run]
Description: "{cm:LaunchProgram,Nexus}"; Flags: nowait postinstall skipifsilent; Filename: "{app}\Nexus.exe"

[Code]
function GetDriveSerial(DriveLetter: String): String;
var
  WbemLocator, WbemServices, WbemObjectSet, WbemObject: Variant;
begin
  Result := '';
  try
    WbemLocator := CreateOleObject('WbemScripting.SWbemLocator');
    WbemServices := WbemLocator.ConnectServer('localhost', 'root\CIMV2');
    WbemObjectSet := WbemServices.ExecQuery('SELECT VolumeSerialNumber FROM Win32_LogicalDisk WHERE DeviceID="' + DriveLetter + '"');
    if not VarIsNull(WbemObjectSet) and (WbemObjectSet.Count > 0) then
    begin
      WbemObject := WbemObjectSet.ItemIndex(0);
      Result := WbemObject.VolumeSerialNumber;
    end;
  except
  end;
end; // The rogue extra end; right below this line was removed!

function GetMotherboardUUID(): String;
var
  WbemLocator, WbemServices, WbemObjectSet, WbemObject: Variant;
begin
  Result := '';
  try
    WbemLocator := CreateOleObject('WbemScripting.SWbemLocator');
    WbemServices := WbemLocator.ConnectServer('localhost', 'root\CIMV2');
    WbemObjectSet := WbemServices.ExecQuery('SELECT SerialNumber FROM Win32_BaseBoard');
    if not VarIsNull(WbemObjectSet) and (WbemObjectSet.Count > 0) then
    begin
      WbemObject := WbemObjectSet.ItemIndex(0);
      Result := WbemObject.SerialNumber;
    end;
  except
  end;
end;

function InitializeSetup(): Boolean;
var
  LicensePath, LicenseContent, CurrentDrive, CurrentSerial, UsbSerial, AppState, BoardUUID: String;
  FileLines: TArrayOfString;
begin
  Result := False; // Assume failure by default
  LicensePath := ExpandConstant('{src}\license.dat');
  CurrentDrive := Copy(ExpandConstant('{src}'), 1, 2); // Gets 'E:'

  // 1. Check if file exists (Fail-Closed)
  if not FileExists(LicensePath) then
  begin
    MsgBox('Critical Error: Licensing module missing. Run setup directly from the authorized USB.', mbError, MB_OK);
    Exit;
  end;

  // 2. Read the file
  LoadStringsFromFile(LicensePath, FileLines);
  if GetArrayLength(FileLines) < 1 then Exit;
  
  LicenseContent := FileLines[0];
  UsbSerial := Copy(LicenseContent, 1, Pos(':', LicenseContent) - 1);
  AppState := Copy(LicenseContent, Pos(':', LicenseContent) + 1, Length(LicenseContent));

  // 3. Verify they aren't running from the desktop
  CurrentSerial := GetDriveSerial(CurrentDrive);
  if CurrentSerial <> UsbSerial then
  begin
    MsgBox('Unauthorized copy detected. You must run this installer from the physical USB drive provided.', mbError, MB_OK);
    Exit;
  end;

  // 4. Bind to hardware
  BoardUUID := GetMotherboardUUID();
  
  if AppState = 'UNBOUND' then
  begin
    // Blow the fuse: rewrite file with Motherboard UUID
    SaveStringToFile(LicensePath, UsbSerial + ':' + BoardUUID, False);
    Result := True;
  end
  else if AppState = BoardUUID then
  begin
    // Allow reinstall on the SAME machine
    Result := True;
  end
  else
  begin
    // Block install on a new machine
    MsgBox('License Error: This USB stick is already registered to a different computer motherboard.', mbError, MB_OK);
    Exit;
  end;
end;