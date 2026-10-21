Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.Run Chr(34) & strPath & "\iniciar_karaoke.bat" & Chr(34), 0, False