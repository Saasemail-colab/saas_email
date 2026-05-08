param(
  [switch]$Commit,
  [string]$Message = "Cleanup unused email providers"
)

$ErrorActionPreference = "Stop"

git rev-parse --is-inside-work-tree | Out-Null

Write-Host "Preview des changements qui seront envoyes a GitHub:"
git status --short

Write-Host ""
Write-Host "Fichiers ignores supprimables en local, preview uniquement:"
git clean -ndX

if ($Commit) {
  git add -A
  git commit -m $Message
  git push
} else {
  Write-Host ""
  Write-Host "Pour supprimer les fichiers inutilises sur GitHub:"
  Write-Host "  .\scripts\github-cleanup.ps1 -Commit"
}
