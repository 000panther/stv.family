#!/bin/sh
# Holt den öffentlichen Nextcloud-Kalender als termine.ics ins Web-Verzeichnis.
# Cronjob-Beispiel (stündlich):
#   0 * * * * /pfad/zu/termine-holen.sh
#
# ZIEL anpassen: Web-Verzeichnis der Seite (dort liegt auch index.html)
ZIEL="/var/www/stv.family/termine.ics"
URL="https://nx67989.your-storageshare.de/remote.php/dav/public-calendars/HpRnkeooAywCCw3X?export"

TMP="$(mktemp)" || exit 1
trap 'rm -f "$TMP"' EXIT

# Nur überschreiben, wenn der Download klappt und wirklich ein Kalender ist
if curl -sf --max-time 30 -o "$TMP" "$URL" && grep -q '^BEGIN:VCALENDAR' "$TMP"; then
    chmod 644 "$TMP"
    mv "$TMP" "$ZIEL"
else
    echo "termine-holen: Download fehlgeschlagen, alte termine.ics bleibt erhalten" >&2
    exit 1
fi
