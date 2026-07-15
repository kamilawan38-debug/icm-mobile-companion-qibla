param([string]$Mode = "start")
$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

switch ($Mode) {
  { $_ -in "start", "run" } { npx expo start; break }
  { $_ -in "tunnel", "--tunnel" } { npx expo start --tunnel; break }
  { $_ -in "web", "--web" } { npx expo start --web; break }
  { $_ -in "doctor", "--doctor" } { npx expo-doctor; break }
  { $_ -in "help", "--help" } { Write-Output "usage: ./script/build_and_run.ps1 [start|tunnel|web|doctor|help]"; break }
  default { throw "Unknown mode: $Mode" }
}
