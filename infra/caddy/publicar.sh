#!/usr/bin/env bash
# Publica o Site do Monitor Eleitoral na Borda (Caddy) da VPS.
# Roda NA VPS, como root (ou com sudo), a partir de um checkout deste repo:
#   sudo infra/caddy/publicar.sh
# Copia o .caddy para /etc/caddy/sites/, valida a configuração inteira e só então
# recarrega o Caddy. Idempotente; se a validação falha, restaura o arquivo anterior
# e não recarrega nada. O Caddy emite o TLS sozinho (HTTP-01).
set -euo pipefail

HOST="eleicoes.chicofigueiredo.com.br"
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORIGEM="$AQUI/$HOST.caddy"
DESTINO="/etc/caddy/sites/$HOST.caddy"
SEGREDO="/etc/caddy/segredos/eleicoes-apuracao.auth"

[[ $EUID -eq 0 ]] || { echo "Rode como root: sudo $0" >&2; exit 1; }
[[ -f "$ORIGEM" ]] || { echo "Não achei $ORIGEM" >&2; exit 1; }
command -v caddy >/dev/null || { echo "caddy não instalado nesta máquina (ver vps/caddy/instalar.sh no repo da VPS)" >&2; exit 1; }

if [[ ! -s "$SEGREDO" ]]; then
  cat >&2 <<MSG
Falta $SEGREDO (uma linha 'usuario hash-bcrypt'). Para criar:
  HASH=\$(caddy hash-password)            # digita a senha duas vezes
  (umask 077; echo "usuario \$HASH" > $SEGREDO); chown caddy:caddy $SEGREDO
MSG
  exit 1
fi

ANTERIOR=""
if [[ -f "$DESTINO" ]]; then
  ANTERIOR="$(mktemp)"
  cp -p "$DESTINO" "$ANTERIOR"
fi

install -m 644 -o root -g root "$ORIGEM" "$DESTINO"

if ! caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile; then
  echo "Configuração inválida; restaurando o arquivo anterior." >&2
  if [[ -n "$ANTERIOR" ]]; then cp -p "$ANTERIOR" "$DESTINO"; else rm -f "$DESTINO"; fi
  [[ -n "$ANTERIOR" ]] && rm -f "$ANTERIOR"
  exit 1
fi
[[ -n "$ANTERIOR" ]] && rm -f "$ANTERIOR"

systemctl reload caddy
echo "Site $HOST publicado e Caddy recarregado."
