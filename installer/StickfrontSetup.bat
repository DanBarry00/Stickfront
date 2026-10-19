<# : Stickfront setup. Double-click this file to install. (A batch file that runs the PowerShell below.)
@echo off
setlocal
set "SF_SELF=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-Expression ([IO.File]::ReadAllText($env:SF_SELF))"
exit /b %errorlevel%
#>

# ---------------------------------------------------------------------------------------------
# Stickfront setup wizard
#   1. checks for Git (and offers to install it)
#   2. downloads the game from GitHub (git clone) into a folder you pick
#   3. puts a Stickfront shortcut on your desktop
# The shortcut runs launcher\launch.ps1, which checks for updates each time the game starts.
# ---------------------------------------------------------------------------------------------

$Repo = 'https://github.com/DanBarry00/Stickfront.git'
$Branch = 'main'                                            # the branch players get
$DefaultDir = Join-Path $env:LOCALAPPDATA 'Programs\Stickfront'
$Title = 'Stickfront Setup'

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles()
$Host.UI.RawUI.WindowTitle = $Title

# (For testing: SF_UNATTENDED=1 answers every question with Yes; SF_DIR, SF_DESKTOP, SF_REPO and
# SF_BRANCH override the install folder, where the shortcut goes, the repo and the branch.)
$Unattended = $env:SF_UNATTENDED -eq '1'
if ($env:SF_DIR) { $DefaultDir = $env:SF_DIR }
if ($env:SF_REPO) { $Repo = $env:SF_REPO }
if ($env:SF_BRANCH) { $Branch = $env:SF_BRANCH }
function Ask([string]$text, [string]$buttons = 'YesNo', [string]$icon = 'Question') {
  if ($Unattended) { Write-Host "  [auto] $($text -split "`n" | Select-Object -First 1)"; return 'Yes' }
  [System.Windows.Forms.MessageBox]::Show($text, $Title, $buttons, $icon)
}
function Say([string]$text) { Write-Host "  $text" }
function Fail([string]$text) {
  Ask $text 'OK' 'Error' | Out-Null
  exit 1
}

function Find-Git {
  $cmd = Get-Command git.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($p in @("$env:ProgramFiles\Git\cmd\git.exe", "${env:ProgramFiles(x86)}\Git\cmd\git.exe", "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe")) {
    if (Test-Path $p) { return $p }
  }
  return $null
}

Write-Host ''
Write-Host '  ======================================'
Write-Host '             STICKFRONT SETUP'
Write-Host '  ======================================'
Write-Host ''

# ---- 1. welcome
if ((Ask "Welcome to Stickfront!`n`nThis will download the game from GitHub and put a Stickfront shortcut on your desktop. Each time you start the game it checks for updates and offers to install them.`n`nContinue?") -ne 'Yes') { exit 0 }

# ---- 2. git
$git = Find-Git
if (-not $git) {
  $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
  if ($winget) {
    $answer = Ask "Stickfront uses Git to download the game and its updates, and Git isn't installed.`n`nInstall Git now? (Windows may ask for permission.)" 'YesNo'
    if ($answer -ne 'Yes') { exit 0 }
    Say 'Installing Git (this can take a minute)...'
    & $winget.Source install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
    $git = Find-Git
    if (-not $git) { Fail "Git didn't finish installing. Install it from https://git-scm.com/download/win, then run this setup again." }
  } else {
    Ask "Stickfront uses Git to download the game and its updates, and Git isn't installed.`n`nThe Git download page will open: install it (the default options are fine), then run this setup again." 'OK' 'Information' | Out-Null
    Start-Process 'https://git-scm.com/download/win'
    exit 0
  }
}
Say "Using Git: $git"

# ---- 3. where to install
$dir = $DefaultDir
$answer = Ask "Install Stickfront to:`n`n$dir`n`nYes: install here.  No: choose another folder." 'YesNoCancel'
if ($answer -eq 'Cancel') { exit 0 }
if ($answer -eq 'No') {
  $pick = New-Object System.Windows.Forms.FolderBrowserDialog
  $pick.Description = 'Choose where to put Stickfront (a "Stickfront" folder is made inside it)'
  if ($pick.ShowDialog() -ne 'OK') { exit 0 }
  $dir = Join-Path $pick.SelectedPath 'Stickfront'
}

# ---- 4. download (or update an existing copy)
if (Test-Path (Join-Path $dir '.git')) {
  if ((Ask "Stickfront is already installed in:`n`n$dir`n`nUpdate it to the latest version and recreate the desktop shortcut?") -ne 'Yes') { exit 0 }
  Say 'Updating...'
  & $git -C $dir pull --ff-only
  if ($LASTEXITCODE -ne 0) { Fail "The update failed (see the window for details). You can delete the folder $dir and run this setup again." }
} else {
  if ((Test-Path $dir) -and (Get-ChildItem -Force $dir | Select-Object -First 1)) { Fail "The folder $dir already exists and isn't empty. Run setup again and choose another folder." }
  Say "Downloading Stickfront into $dir ..."
  & $git clone --branch $Branch --single-branch $Repo $dir
  if ($LASTEXITCODE -ne 0) { Fail "The download failed (see the window for details). Check your internet connection and run this setup again." }
}

# ---- 5. desktop shortcut
$launcher = Join-Path $dir 'launcher\launch.ps1'
if (-not (Test-Path $launcher)) { Fail "The download is missing launcher\launch.ps1. Please let the game's author know." }
$desktop = if ($env:SF_DESKTOP) { $env:SF_DESKTOP } else { [Environment]::GetFolderPath('Desktop') }
$lnkPath = Join-Path $desktop 'Stickfront.lnk'
$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut($lnkPath)
$lnk.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$lnk.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcher`""
$lnk.WorkingDirectory = $dir
$lnk.IconLocation = (Join-Path $dir 'launcher\stickfront.ico') + ',0'
$lnk.Description = 'Play Stickfront (checks for updates first)'
$lnk.WindowStyle = 7   # minimized: the launcher shows its own dialogs
$lnk.Save()
Say "Shortcut created: $lnkPath"

# ---- 6. done
if (-not $Unattended -and (Ask "Stickfront is installed!`n`nThere's a Stickfront shortcut on your desktop. Play now?") -eq 'Yes') {
  Start-Process -FilePath $lnkPath
}
exit 0
