#!/usr/bin/env bash
# Aplica automáticamente el último bundle de git (el archivo .bundle que manda Claude
# cuando no puede pushear directo) al repo local de Kōr, y lo pushea a GitHub.
#
# Uso:
#   ./abrir-bundle.sh                       # usa el .bundle más reciente en ~/Downloads
#   ./abrir-bundle.sh /ruta/al/archivo.bundle   # usa un bundle puntual
#
# Variables de entorno opcionales para personalizar:
#   REPO_PATH, REMOTE_URL, DOWNLOADS_PATH, BRANCH, NO_ARCHIVE=1

set -euo pipefail

REPO_PATH="${REPO_PATH:-$HOME/kor}"
REMOTE_URL="${REMOTE_URL:-https://github.com/germanpaoloni-dotcom/k-r.git}"
DOWNLOADS_PATH="${DOWNLOADS_PATH:-$HOME/Downloads}"
BRANCH="${BRANCH:-main}"
BUNDLE_PATH="${1:-}"

step() { printf "\033[36m-> %s\033[0m\n" "$1"; }
ok()   { printf "\033[32mOK  %s\033[0m\n" "$1"; }
err()  { printf "\033[31mERROR  %s\033[0m\n" "$1"; }

# 1. Localizar el bundle
if [ -z "$BUNDLE_PATH" ]; then
  step "Buscando el .bundle más reciente en $DOWNLOADS_PATH"
  BUNDLE_PATH=$(ls -t "$DOWNLOADS_PATH"/*.bundle 2>/dev/null | head -n1 || true)
  if [ -z "$BUNDLE_PATH" ]; then
    err "No encontré ningún archivo .bundle en $DOWNLOADS_PATH."
    echo "Pasalo a mano: ./abrir-bundle.sh /ruta/al/archivo.bundle"
    exit 1
  fi
fi
if [ ! -f "$BUNDLE_PATH" ]; then
  err "No existe el archivo: $BUNDLE_PATH"
  exit 1
fi
ok "Bundle: $BUNDLE_PATH"

# 2. Verificar integridad
if ! git bundle verify "$BUNDLE_PATH" >/dev/null 2>&1; then
  err "El bundle está corrupto o incompleto (¿se cortó la descarga?). Volvé a descargarlo."
  exit 1
fi

# 3. Clonar o actualizar
if [ ! -d "$REPO_PATH/.git" ]; then
  step "No existe el repo en $REPO_PATH — clonando desde el bundle"
  git clone "$BUNDLE_PATH" "$REPO_PATH"
  cd "$REPO_PATH"
  git remote set-url origin "$REMOTE_URL"
  ok "Repo clonado en $REPO_PATH y remoto apuntado a $REMOTE_URL"
else
  cd "$REPO_PATH"
  step "Aplicando el bundle sobre el repo existente en $REPO_PATH"
  if ! git pull --ff-only "$BUNDLE_PATH" "$BRANCH"; then
    err "No se pudo aplicar en fast-forward."
    echo "Puede ser que tengas cambios locales sin commitear, o que este bundle no traiga nada nuevo."
    echo "Revisá con: git status   y   git log --oneline -5"
    exit 1
  fi
  ok "Bundle aplicado."
fi

# 4. Push
step "Pusheando a GitHub..."
if ! git push origin "$BRANCH"; then
  err "Falló el push. Revisá tu login de GitHub en esta máquina (SSH key / gh auth / credential helper)."
  exit 1
fi
ok "Listo — $BRANCH actualizado en GitHub."

# 5. Archivar el bundle ya aplicado
if [ -z "${NO_ARCHIVE:-}" ]; then
  ARCHIVE_DIR="$DOWNLOADS_PATH/kor-bundles-aplicados"
  mkdir -p "$ARCHIVE_DIR"
  mv -f "$BUNDLE_PATH" "$ARCHIVE_DIR/"
  ok "Bundle archivado en $ARCHIVE_DIR"
fi
