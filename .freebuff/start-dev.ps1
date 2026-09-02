$logFile = "C:\Users\Harsh\Desktop\Certiflow\.freebuff\preview-4b680a60-fbef-4e79-afbe-111435f1306f.log"
$logErr = "C:\Users\Harsh\Desktop\Certiflow\.freebuff\preview-4b680a60-fbef-4e79-afbe-111435f1306f.log.err"
$nodeExe = "D:\VALO STORE\node.exe"
$workDir = "C:\Users\Harsh\Desktop\Certiflow"

$proc = Start-Process -FilePath $nodeExe -ArgumentList "$workDir\node_modules\vite\bin\vite.js","--port","5173","--host","0.0.0.0" -WorkingDirectory $workDir -RedirectStandardOutput $logFile -RedirectStandardError $logErr -WindowStyle Hidden -PassThru
$proc.Id
