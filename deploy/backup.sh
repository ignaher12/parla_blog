#!/usr/bin/env bash
# Backup diario de Parla di Viaggi: copia consistente de la base SQLite + fotos.
# Lo corre el timer parladiviaggi-backup (systemd). Guarda los últimos 14 días.
set -euo pipefail
DATA=/var/lib/parladiviaggi
DEST=/var/backups/parladiviaggi
HOY=$(date +%Y%m%d)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

/usr/local/bin/node --disable-warning=ExperimentalWarning -e '
const { DatabaseSync } = require("node:sqlite");
new DatabaseSync(process.argv[1], { readOnly: true }).exec(`VACUUM INTO '"'"'${process.argv[2]}'"'"'`);
' "$DATA/db/parla.db" "$TMP/parla.db"

tar -czf "$DEST/parla-$HOY.tgz" -C "$TMP" parla.db -C "$DATA" media
ls -1t "$DEST"/parla-*.tgz | tail -n +15 | xargs -r rm -f
echo "Backup listo: $DEST/parla-$HOY.tgz"
