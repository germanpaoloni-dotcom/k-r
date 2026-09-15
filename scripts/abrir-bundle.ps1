<#
.SYNOPSIS
  Aplica automáticamente el último bundle de git (el archivo .bundle que te manda
  Claude cuando no puede pushear directo) al repo local de Kōr, y lo pushea a GitHub.

.DESCRIPTION
  1. Busca el .bundle más reciente en tu carpeta de Descargas (o usa el que le pases).
  2. Si el repo todavía no existe en tu máquina, lo clona desde ahí.
  3. Si ya existe, aplica el bundle en fast-forward (nunca reescribe ni pisa commits tuyos).
  4. Pushea a GitHub.
  5. Archiva el bundle ya aplicado en Descargas\kor-bundles-aplicados para no confundirte.

.PARAMETER BundlePath
  Ruta a un bundle específico. Si no se pasa, se usa el .bundle más reciente en Descargas.

.PARAMETER RepoPath
  Carpeta del repo local. Por defecto $HOME\kor.

.EXAMPLE
  .\abrir-bundle.ps1
  Busca el bundle más nuevo en Descargas y lo aplica.

.EXAMPLE
  .\abrir-bundle.ps1 -BundlePath "C:\Users\german\Downloads\kor-fase2.bundle"
  Aplica un bundle puntual.
#>

param(
    [string]$BundlePath,
    [string]$RepoPath = "$HOME\kor",
    [string]$RemoteUrl = "https://github.com/germanpaoloni-dotcom/k-r.git",
    [string]$DownloadsPath = "$HOME\Downloads",
    [string]$Branch = "main",
    [switch]$NoArchive
)

function Write-Step($msg) { Write-Host "-> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "OK  $msg" -ForegroundColor Green }
function Write-ErrMsg($msg) { Write-Host "ERROR  $msg" -ForegroundColor Red }

# 1. Localizar el bundle -----------------------------------------------------
if (-not $BundlePath) {
    Write-Step "Buscando el .bundle más reciente en $DownloadsPath"
    $latest = Get-ChildItem -Path $DownloadsPath -Filter "*.bundle" -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) {
        Write-ErrMsg "No encontré ningún archivo .bundle en $DownloadsPath."
        Write-Host "Pasá la ruta a mano: .\abrir-bundle.ps1 -BundlePath 'C:\ruta\al\archivo.bundle'"
        exit 1
    }
    $BundlePath = $latest.FullName
}
if (-not (Test-Path $BundlePath)) {
    Write-ErrMsg "No existe el archivo: $BundlePath"
    exit 1
}
Write-Ok "Bundle: $BundlePath"

# 2. Verificar integridad ------------------------------------------------------
git bundle verify $BundlePath *> $null
if ($LASTEXITCODE -ne 0) {
    Write-ErrMsg "El bundle está corrupto o incompleto (¿se cortó la descarga?). Volvé a descargarlo."
    exit 1
}

# 3. Clonar o actualizar -------------------------------------------------------
$repoExists = Test-Path (Join-Path $RepoPath ".git")

if (-not $repoExists) {
    Write-Step "No existe el repo en $RepoPath — clonando desde el bundle"
    git clone $BundlePath $RepoPath
    if ($LASTEXITCODE -ne 0) { Write-ErrMsg "Falló el clone."; exit 1 }
    Set-Location $RepoPath
    git remote set-url origin $RemoteUrl
    Write-Ok "Repo clonado en $RepoPath y remoto apuntado a $RemoteUrl"
} else {
    Set-Location $RepoPath
    Write-Step "Aplicando el bundle sobre el repo existente en $RepoPath"
    git pull --ff-only $BundlePath $Branch
    if ($LASTEXITCODE -ne 0) {
        Write-ErrMsg "No se pudo aplicar en fast-forward."
        Write-Host "Puede ser que tengas cambios locales sin commitear, o que este bundle no traiga nada nuevo."
        Write-Host "Revisá con: git status   y   git log --oneline -5"
        exit 1
    }
    Write-Ok "Bundle aplicado."
}

# 4. Push -----------------------------------------------------------------------
Write-Step "Pusheando a GitHub..."
git push origin $Branch
if ($LASTEXITCODE -ne 0) {
    Write-ErrMsg "Falló el push. Revisá tu login de GitHub en esta máquina (git config / credential manager)."
    exit 1
}
Write-Ok "Listo — $Branch actualizado en GitHub."

# 5. Archivar el bundle ya aplicado ---------------------------------------------
if (-not $NoArchive) {
    $archiveDir = Join-Path $DownloadsPath "kor-bundles-aplicados"
    New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
    Move-Item -Path $BundlePath -Destination $archiveDir -Force
    Write-Ok "Bundle archivado en $archiveDir"
}
