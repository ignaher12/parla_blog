#!/usr/bin/env bash
# Activa una versión nueva en el servidor. Lo ejecuta GitHub Actions por SSH
# como el usuario `parla`, después de subir /tmp/parla-release.tgz.
# Uso: activate.sh <nombre-de-version>
set -euo pipefail

APP=/var/www/parladiviaggi
REL="$APP/releases/$1"
TGZ=/tmp/parla-release.tgz
KEEP=5

mkdir -p "$REL"
tar -xzf "$TGZ" -C "$REL"
rm -f "$TGZ"

PREV=$(readlink -f "$APP/current" || true)
ln -sfn "$REL" "$APP/current.tmp" && mv -T "$APP/current.tmp" "$APP/current"
sudo /usr/bin/systemctl restart parladiviaggi

# Chequeo de salud: si la versión nueva no responde, se vuelve a la anterior.
for i in $(seq 1 20); do
	if curl -fsS -o /dev/null http://127.0.0.1:4321/; then
		echo "OK: versión $1 activa"
		ls -1dt "$APP"/releases/* | tail -n +$((KEEP + 1)) | xargs -r rm -rf
		exit 0
	fi
	sleep 1
done

echo "ERROR: la versión $1 no respondió; vuelvo a la anterior" >&2
if [ -n "$PREV" ] && [ -d "$PREV" ]; then
	ln -sfn "$PREV" "$APP/current.tmp" && mv -T "$APP/current.tmp" "$APP/current"
	sudo /usr/bin/systemctl restart parladiviaggi
fi
exit 1
