param(
    [string]$Path = ".",
    [string]$OutputFile = "project-structure.txt"
)

$ErrorActionPreference = 'Stop'

Write-Host "Collecting project structure from $Path ..."

# Отримуємо усі файли та папки рекурсивно
Get-ChildItem -Path $Path -Recurse -Force |
    Select-Object -ExpandProperty FullName |
    Sort-Object |
    Out-File -FilePath $OutputFile -Encoding UTF8

Write-Host "Done. Structure saved to $OutputFile"
