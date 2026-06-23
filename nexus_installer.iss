; =====================================================================
; 💎 Nexus POS Engine - Inno Setup Configuration Script (ELECTRON EDITION)
; =====================================================================

[Setup]
; App Metadata
AppName=Nexus
AppVersion=1.3.0
AppPublisher=Nexus Software Solutions
AppId={{8F5B2C9A-4D3E-4A1B-BC7D-2E9C3D8F5A6B}}

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
Name: "arabic"; MessagesFile: "compiler:Languages\Arabic.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; 🚀 The Single Electron Payload (Resolved local path conflict)
Source: "E:\Stock-Manager-Electron\dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; Keeps a backup copy of the initial license file template in your app resources if needed
Source: "{src}\license.dat"; DestDir: "{app}\resources\"; Flags: external onlyifdoesntexist

[Icons]
Name: "{group}\Nexus"; Filename: "{app}\Nexus.exe"; IconFilename: "{app}\Nexus.exe"
Name: "{group}\{cm:UninstallProgram,Nexus}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Nexus"; Filename: "{app}\Nexus.exe"; Tasks: desktopicon; IconFilename: "{app}\Nexus.exe"

[Run]
Description: "{cm:LaunchProgram,Nexus}"; Flags: nowait postinstall skipifsilent; Filename: "{app}\Nexus.exe"

[CustomMessages]
; --- English ---
en.LicensingMissing=Critical Error: Licensing module missing. Run setup directly from the authorized USB.
en.UnauthorizedCopy=Unauthorized copy detected. You must run this installer from the physical USB drive provided.
en.HardwareMismatch=License Error: This USB stick is already registered to a different computer motherboard.

; --- French ---
fr.LicensingMissing=Erreur critique : Module de licence manquant. Lancez l'installation directement depuis la clé USB autorisée.
fr.UnauthorizedCopy=Copie non autorisée détectée. Vous devez exécuter ce programme d'installation à partir de la clé USB physique fournie.
fr.HardwareMismatch=Erreur de licence : Cette clé USB est déjà enregistrée sur la carte mère d'un autre ordinateur.

; --- Arabic ---
ar.LicensingMissing=خطأ فادح: وحدة الترخيص مفقودة. يرجى تشغيل برنامج التثبيت مباشرة من ذاكرة USB المصرح بها.
ar.UnauthorizedCopy=تم اكتشاف نسخة غير مصرح بها. يجب تشغيل برنامج التثبيت هذا من ذاكرة USB الفعلية المرفقة.
ar.HardwareMismatch=خطأ في التعريف: ذاكرة USB هذه مسجلة بالفعل للوحة أم (Motherboard) لجهاز كمبيوتر آخر.

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
end;

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
  Result := False; 
  LicensePath := ExpandConstant('{src}\license.dat');
  CurrentDrive := Copy(ExpandConstant('{src}'), 1, 2); 

  // 1. Check if file exists (Fail-Closed)
  if not FileExists(LicensePath) then
  begin
    MsgBox(CustomMessage('LicensingMissing'), mbError, MB_OK);
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
    MsgBox(CustomMessage('UnauthorizedCopy'), mbError, MB_OK);
    Exit;
  end;

  // 4. Bind to hardware
  BoardUUID := GetMotherboardUUID();
  
  if AppState = 'UNBOUND' then
  begin
    SaveStringToFile(LicensePath, UsbSerial + ':' + BoardUUID, False);
    Result := True;
  end
  else if AppState = BoardUUID then
  begin
    Result := True;
  end
  else
  begin
    MsgBox(CustomMessage('HardwareMismatch'), mbError, MB_OK);
    Exit;
  end;
end;