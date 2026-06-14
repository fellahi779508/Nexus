Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objShell = CreateObject("WScript.Shell")
strScriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
objShell.CurrentDirectory = strScriptPath
objShell.Run "cmd.exe /c Run-Nexus.bat", 0, False
Set objFile = Nothing
Set objFSO = Nothing
Set objShell = Nothing