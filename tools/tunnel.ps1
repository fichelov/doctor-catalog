param(
  [int]$Port = 8789
)

# ASCII-only script: avoids PowerShell encoding issues on Windows.
$ErrorActionPreference = 'SilentlyContinue'
$scriptDir = Split-Path -Parent $PSScriptRoot
$site = $scriptDir.TrimEnd('\')
$root = Split-Path -Parent $site
$logDir = Join-Path $root '.tools'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir 'tunnel.log'
$urlFile = Join-Path $site 'tunnel-url.txt'
$py = 'C:\Users\disco\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe'

function Test-Server {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/index.html" -UseBasicParsing -TimeoutSec 5
    return $r.StatusCode -eq 200
  } catch { return $false }
}

function Ensure-Server {
  if (Test-Server) { return }
  Write-Host "Starting local server on port $Port ..."
  Start-Process -FilePath $py -ArgumentList (Join-Path $site 'tools\serve.py'), $Port -WindowStyle Hidden
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-Server) { return }
  }
  throw "Failed to start server on port $Port"
}

Ensure-Server
Write-Host "Server is up: http://127.0.0.1:$Port"

$attempt = 0
while ($attempt -lt 1000) {
  $attempt++
  Write-Host "Starting tunnel (attempt $attempt) ..."
  Remove-Item $log -Force -ErrorAction SilentlyContinue
  Remove-Item "$log.err" -Force -ErrorAction SilentlyContinue
  $p = Start-Process -FilePath 'ssh' -ArgumentList @(
    '-o','StrictHostKeyChecking=no','-o','UserKnownHostsFile=NUL',
    '-o','ServerAliveInterval=15','-o','ServerAliveCountMax=3',
    '-o','ExitOnForwardFailure=yes','-T',
    '-R',"80:127.0.0.1:$Port",'nokey@localhost.run'
  ) -RedirectStandardOutput $log -RedirectStandardError "$log.err" -WindowStyle Hidden -PassThru

  $url = $null
  for ($i = 0; $i -lt 60 -and -not $url; $i++) {
    Start-Sleep -Milliseconds 700
    $text = ''
    foreach ($f in @($log, "$log.err")) {
      if (Test-Path $f) {
        $text += [regex]::Replace((Get-Content $f -Raw), "\x1B\[[0-9;?]*[a-zA-Z]", '')
      }
    }
    $m = [regex]::Match($text, 'https://[a-z0-9]+\.lhr\.life')
    if ($m.Success) { $url = $m.Value }
  }

  if ($url) {
    $stamp = Get-Date -Format 'dd.MM.yyyy HH:mm'
    "$stamp  $url" | Out-File -FilePath $urlFile -Encoding utf8
    Write-Host ""
    Write-Host "================ DEMO LINK ================" -ForegroundColor Green
    Write-Host $url -ForegroundColor Green
    Write-Host ("Quick entry: {0}/?demo=1#/home" -f $url)
    Write-Host "Saved to: $urlFile"
    Write-Host "===========================================" -ForegroundColor Green

    # health check: если туннель отвалился, но ssh жив - перезапускаем
    $fails = 0
    while (-not $p.HasExited) {
      Start-Sleep -Seconds 45
      try {
        $r = Invoke-WebRequest -Uri "$url/index.html" -UseBasicParsing -TimeoutSec 20
        if ($r.StatusCode -eq 200) { $fails = 0 } else { $fails++ }
      } catch { $fails++ }
      if ($fails -ge 2) {
        Write-Host "Tunnel unhealthy, restarting ..."
        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        break
      }
    }
  } else {
    Write-Host "No URL yet, retrying in 5 seconds ..."
  }

  Wait-Process -Id $p.Id
  Write-Host "Tunnel dropped, restarting in 5 seconds ..."
  Start-Sleep -Seconds 5
}

