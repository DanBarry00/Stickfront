# Stickfront launcher: the desktop shortcut runs this.
# 1. Checks whether this copy of the game is in sync with the GitHub repo (git fetch).
# 2. If there's an update, asks the player and, on yes, runs git pull.
# 3. Opens the game in its own Microsoft Edge app window (or the default browser).
# Offline, or without git, it just starts the game.

param([switch]$CheckOnly)   # -CheckOnly: just report how many updates are waiting (no dialogs, no game)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles()

$root = Split-Path -Parent $PSScriptRoot
$title = 'Stickfront'

# Find git (the installer may have just installed it, so look in the usual places too).
function Find-Git {
  $cmd = Get-Command git.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($p in @("$env:ProgramFiles\Git\cmd\git.exe", "${env:ProgramFiles(x86)}\Git\cmd\git.exe", "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe")) {
    if (Test-Path $p) { return $p }
  }
  return $null
}

# Run git in the game folder without a console window; give up after $timeout seconds.
function Invoke-Git([string[]]$gitArgs, [int]$timeout = 20) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $script:git
  $psi.Arguments = (@('-C', "`"$root`"") + $gitArgs) -join ' '
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $p = [System.Diagnostics.Process]::Start($psi)
  $out = $p.StandardOutput.ReadToEndAsync()
  $err = $p.StandardError.ReadToEndAsync()
  if (-not $p.WaitForExit($timeout * 1000)) { try { $p.Kill() } catch {} ; return @{ ok = $false; out = ''; err = 'timed out' } }
  return @{ ok = ($p.ExitCode -eq 0); out = $out.Result.Trim(); err = $err.Result.Trim() }
}

function Show-Box([string]$text, [string]$buttons = 'OK', [string]$icon = 'Information') {
  return [System.Windows.Forms.MessageBox]::Show($text, $title, $buttons, $icon)
}

function Update-Game {
  $script:git = Find-Git
  if (-not $script:git -or -not (Test-Path (Join-Path $root '.git'))) { return }
  $fetch = Invoke-Git @('fetch', '--quiet', 'origin') 20
  if (-not $fetch.ok) { return }   # offline (or GitHub is down): just play
  $count = Invoke-Git @('rev-list', '--count', 'HEAD..@{u}')
  if (-not $count.ok) { return }
  $behind = 0
  [void][int]::TryParse($count.out, [ref]$behind)
  if ($CheckOnly) { Write-Output "behind=$behind"; return }
  if ($behind -le 0) { return }
  $log = (Invoke-Git @('log', '--format=%s', '-n', '8', 'HEAD..@{u}')).out
  $changes = ($log -split "`n" | ForEach-Object { '  - ' + $_.Trim() }) -join "`n"
  $plural = if ($behind -eq 1) { '' } else { 's' }
  $answer = Show-Box "A Stickfront update is available ($behind new change$plural):`n`n$changes`n`nUpdate now?" 'YesNo' 'Question'
  if ($answer -ne 'Yes') { return }
  $pull = Invoke-Git @('pull', '--ff-only', '--quiet') 120
  if ($pull.ok) { Show-Box 'Stickfront is up to date. Have fun!' | Out-Null; return }
  # the local copy has drifted (edited files): offer to replace it with the latest version
  $reset = Show-Box "The update couldn't be applied automatically:`n`n$($pull.err)`n`nReplace your copy with the latest version? Any changes you made to the game files will be lost." 'YesNo' 'Warning'
  if ($reset -eq 'Yes') {
    $r = Invoke-Git @('reset', '--hard', '--quiet', '@{u}') 60
    if ($r.ok) { Show-Box 'Stickfront is up to date. Have fun!' | Out-Null }
    else { Show-Box "Sorry, the update failed:`n`n$($r.err)`n`nThe game will start without it." 'OK' 'Error' | Out-Null }
  }
}

function Start-Game {
  $game = Join-Path $root 'game\index.html'
  $url = 'file:///' + ($game -replace '\\', '/')
  $edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($edge) { Start-Process -FilePath $edge -ArgumentList "--app=`"$url`"", '--start-maximized' }
  else { Start-Process -FilePath $game }
}

try { Update-Game } catch { if ($CheckOnly) { Write-Output "error: $_" } }   # an update problem should never stop the game from starting
if (-not $CheckOnly) { Start-Game }
