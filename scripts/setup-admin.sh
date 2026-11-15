#!/usr/bin/env bash
# Configura todo lo que necesita el panel /admin en Cloudflare con wrangler:
#   D1 (reservas, chats, borradores) · R2 (fotos y videos) · secretos de Access, GitHub y respaldo.
# Uso:  npx wrangler login   (una vez)
#       bash scripts/setup-admin.sh
# Se puede repetir: lo que ya existe se reutiliza.
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="turismoavatar"
DB_NAME="turismoavatar"
BUCKET="turismoavatar-media"
W="npx --yes wrangler"

paso() { printf '\n\033[1;33m▸ %s\033[0m\n' "$1"; }
ok() { printf '  \033[1;32m✓\033[0m %s\n' "$1"; }

paso "Cuenta de Cloudflare"
$W whoami >/dev/null 2>&1 || { echo "  Primero ejecuta: npx wrangler login"; exit 1; }
$W whoami 2>/dev/null | grep -iE "account|email|@" | head -3 | sed 's/^/  /'

# ───────── 1. D1 ─────────
paso "Base de datos D1 ($DB_NAME)"
DB_ID=$($W d1 list --json 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const l=JSON.parse(s||'[]');const x=l.find(d=>d.name==='$DB_NAME');process.stdout.write(x?x.uuid:'')})")
if [ -z "$DB_ID" ]; then
  $W d1 create "$DB_NAME" >/dev/null
  DB_ID=$($W d1 list --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{process.stdout.write(JSON.parse(s).find(d=>d.name==='$DB_NAME').uuid)})")
  ok "creada ($DB_ID)"
else
  ok "ya existía ($DB_ID)"
fi
# Activa el bloque [[d1_databases]] en wrangler.toml con el id real
node -e "
const fs=require('fs');let t=fs.readFileSync('wrangler.toml','utf8');
t=t.replace(/# \[\[d1_databases\]\]\n# binding = \"DB\"\n# database_name = \"$DB_NAME\"\n# database_id = \".*\"/,'[[d1_databases]]\nbinding = \"DB\"\ndatabase_name = \"$DB_NAME\"\ndatabase_id = \"$DB_ID\"');
t=t.replace(/(\[\[d1_databases\]\][\s\S]*?database_id = \")[^\"]*(\")/,'\$1$DB_ID\$2');
fs.writeFileSync('wrangler.toml',t)"
ok "wrangler.toml actualizado"

TABLAS=$($W d1 execute "$DB_NAME" --remote --json --command "SELECT name FROM sqlite_master WHERE type='table'" 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const r=JSON.parse(s)[0].results.map(x=>x.name);process.stdout.write(r.join(' '))}catch{}})")
if [[ " $TABLAS " == *" bookings "* && " $TABLAS " != *" cms_drafts "* ]]; then
  $W d1 execute "$DB_NAME" --remote --file=db/migrations/0002_panel.sql -y >/dev/null
  ok "migración del panel aplicada (base existente)"
elif [[ " $TABLAS " != *" bookings "* ]]; then
  $W d1 execute "$DB_NAME" --remote --file=db/schema.sql -y >/dev/null
  ok "tablas creadas"
else
  ok "tablas al día"
fi

# ───────── 2. R2 ─────────
paso "Almacenamiento R2 ($BUCKET)"
if $W r2 bucket list 2>/dev/null | grep -q "name:\s*$BUCKET\|\"$BUCKET\"\|^$BUCKET$\| $BUCKET$"; then
  ok "ya existía"
else
  $W r2 bucket create "$BUCKET" >/dev/null 2>&1 && ok "creado" || ok "no se pudo crear (¿R2 activado en la cuenta?). Actívalo en el dashboard y vuelve a correr el script."
fi
node -e "
const fs=require('fs');let t=fs.readFileSync('wrangler.toml','utf8');
t=t.replace('# [[r2_buckets]]\n# binding = \"MEDIA\"\n# bucket_name = \"$BUCKET\"','[[r2_buckets]]\nbinding = \"MEDIA\"\nbucket_name = \"$BUCKET\"');
fs.writeFileSync('wrangler.toml',t)"
ok "wrangler.toml actualizado"

# ───────── 3. Secretos ─────────
secreto() { # nombre, pregunta, [oculto]
  local nombre="$1" pregunta="$2" valor
  if [ "${3:-}" = "oculto" ]; then read -r -s -p "  $pregunta: " valor; echo; else read -r -p "  $pregunta: " valor; fi
  if [ -z "$valor" ]; then echo "  (omitido)"; return; fi
  printf '%s' "$valor" | $W pages secret put "$nombre" --project-name "$PROJECT" >/dev/null && ok "$nombre guardado"
}

paso "Login del panel con código al correo (Cloudflare Access)"
echo "  Zero Trust → Access → Applications → tu app del panel → copia el dominio del equipo y el AUD tag."
echo "  Deja en blanco para configurarlo después."
secreto CF_ACCESS_TEAM_DOMAIN "Dominio del equipo (ej. turismoavatar.cloudflareaccess.com)"
secreto CF_ACCESS_AUD "Application Audience (AUD) tag"

paso "Publicación desde el editor (GitHub)"
echo "  Token fine-grained solo para gbrss/turismoavatar: Contents (lectura y escritura), Checks y Commit statuses (lectura)."
secreto GITHUB_TOKEN "Token de GitHub" oculto

paso "Contraseña de respaldo (solo se usa si Access no está configurado)"
secreto ADMIN_PASSWORD "Contraseña para el usuario admin (en blanco = no usar)" oculto

paso "Listo"
echo "  Secretos del proyecto:"
$W pages secret list --project-name "$PROJECT" 2>/dev/null | sed 's/^/    /' || true
echo
echo "  Falta subir wrangler.toml con los bindings para que Pages los tome:"
echo "    git add wrangler.toml && git commit -m 'Panel: D1 y R2' && git push"
