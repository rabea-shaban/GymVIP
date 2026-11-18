Set WshShell = CreateObject("WScript.Shell")
' Run Node server hidden in background
WshShell.Run "node Backend/dist/server.js", 0, False
' Wait 1.5 seconds for server initialization
WScript.Sleep 1500
' Launch default browser to GymVIP local address
WshShell.Run "http://localhost:5000", 1, False
