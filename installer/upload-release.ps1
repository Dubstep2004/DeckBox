<#
  Прикрепляет установщик DeckBox к релизу на GitHub.

  Запуск (PowerShell):
    Set-ExecutionPolicy -Scope Process Bypass
    .\upload-release.ps1                       # ищет DeckBox-Setup-*.exe в Загрузках и рядом со скриптом
    .\upload-release.ps1 -File C:\путь\DeckBox-Setup-1.1.2.exe

  Нужен GitHub CLI (gh): если его нет, скрипт поставит его через winget.
  При первом запуске откроется браузер для входа в GitHub.
#>
param(
    [string]$File,
    [string]$Repo = 'Dubstep2004/DeckBox',
    [string]$Tag
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

function Find-Gh {
    $cmd = Get-Command gh -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($p in @("$env:ProgramFiles\GitHub CLI\gh.exe", "$env:LOCALAPPDATA\Programs\GitHub CLI\gh.exe")) {
        if (Test-Path $p) { return $p }
    }
    return $null
}

# 1. Файл установщика
if (-not $File) {
    $downloads = Join-Path $env:USERPROFILE 'Downloads'
    $File = @($PSScriptRoot, $downloads, (Get-Location).Path) |
        Where-Object { $_ -and (Test-Path $_) } |
        ForEach-Object { Get-ChildItem -Path $_ -Filter 'DeckBox-Setup-*.exe' -File -ErrorAction SilentlyContinue } |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $File -or -not (Test-Path $File)) {
    throw 'Не нашёл DeckBox-Setup-*.exe. Положите его в «Загрузки» или укажите путь: .\upload-release.ps1 -File C:\путь\к\файлу.exe'
}
$File = (Resolve-Path $File).Path
if (-not $Tag) {
    if ((Split-Path $File -Leaf) -match 'DeckBox-Setup-(\d+\.\d+\.\d+)') { $Tag = "v$($Matches[1])" }
    else { throw 'Не удалось понять версию из имени файла. Укажите тег: -Tag v1.1.2' }
}
Write-Host "Файл:   $File"
Write-Host "Релиз:  $Repo $Tag"

# 2. GitHub CLI
$gh = Find-Gh
if (-not $gh) {
    Write-Host 'Устанавливаю GitHub CLI...'
    winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements | Out-Host
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
    $gh = Find-Gh
    if (-not $gh) { throw 'GitHub CLI не установился. Поставьте вручную: winget install GitHub.cli, затем запустите скрипт ещё раз.' }
}

# 3. Вход в GitHub
& $gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Нужно войти в GitHub. Скопируйте код, который появится ниже, и вставьте его в открывшемся браузере.'
    & $gh auth login --hostname github.com --git-protocol https --web
    if ($LASTEXITCODE -ne 0) { throw 'Вход в GitHub не выполнен.' }
}

# 4. Релиз: создать, если его ещё нет
& $gh release view $Tag --repo $Repo *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Релиза $Tag нет, создаю..."
    & $gh release create $Tag --repo $Repo --title "DeckBox $Tag" --notes "Скачайте $(Split-Path $File -Leaf) и запустите." --target main
    if ($LASTEXITCODE -ne 0) { throw 'Не удалось создать релиз.' }
}

# 5. Загрузка (--clobber заменяет файл с тем же именем)
Write-Host 'Загружаю установщик (около 50 МБ)...'
& $gh release upload $Tag $File --repo $Repo --clobber
if ($LASTEXITCODE -ne 0) { throw 'Загрузка не удалась. Проверьте интернет и запустите скрипт ещё раз.' }

$url = "https://github.com/$Repo/releases/tag/$Tag"
Write-Host ''
Write-Host "Готово! $url" -ForegroundColor Green
Start-Process $url
