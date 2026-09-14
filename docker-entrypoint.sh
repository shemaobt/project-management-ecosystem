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

case "$BACKEND_URL" in
  http://*|https://*) ;;
  *)
    echo "docker-entrypoint: BACKEND_URL='$BACKEND_URL' must start with http:// or https://" >&2
    exit 1
    ;;
esac

envsubst '$BACKEND_URL' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
