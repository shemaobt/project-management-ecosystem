#!/bin/sh
set -e

if [ -f /run/secrets/.env ]; then
  set -a
  . /run/secrets/.env
  set +a
fi

if [ -z "${BACKEND_URL:-}" ]; then
  echo "docker-entrypoint: BACKEND_URL is not set — refusing to start (mount it at /run/secrets/.env or pass -e BACKEND_URL)" >&2
  exit 1
fi

# A barra final é invisível para quem escreve a variável e fatal para o proxy: o
# template concatena ${BACKEND_URL}$request_uri, e $request_uri já começa com "/",
# então "https://api.example.com/" viraria proxy_pass .../api/health com duas
# barras — que o FastAPI 404. Corta a barra antes de validar; o que sobra tem de
# ter host, e é por isso que o padrão exige um caractere depois do "//".
BACKEND_URL_GIVEN="$BACKEND_URL"
BACKEND_URL="${BACKEND_URL%"${BACKEND_URL##*[!/]}"}"

case "$BACKEND_URL" in
  http://?*|https://?*) ;;
  *)
    echo "docker-entrypoint: BACKEND_URL='$BACKEND_URL_GIVEN' must be http(s)://<host>" >&2
    exit 1
    ;;
esac

envsubst '$BACKEND_URL' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
