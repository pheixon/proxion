#!/bin/sh
# Usage: ./build.sh [site url or base]   e.g. ./build.sh https://wideprism.pro/nodes/proxion/   (or just /nodes/proxion/; default: /)
# With a full url, link previews (og:image) get an absolute address, which most messengers require.
set -e

SITE=""
BASE="${1:-/}"
case "$BASE" in
  http://*/|https://*/) SITE="$BASE"; BASE="/${BASE#*://*/}" ;;
esac
OUT=dist

case "$BASE" in
  /|/*/) ;;
  *) echo "base must start and end with /, e.g. https://wideprism.pro/nodes/proxion/ or /nodes/proxion/" >&2; exit 1 ;;
esac

cd "$(dirname "$0")"
rm -rf "$OUT"
rsync -a --exclude=.DS_Store \
  --include=/.htaccess --include='/*.html' \
  --include='/css/***' --include='/js/***' --include='/pages/***' --include='/assets/***' \
  --exclude='*' \
  ./ "$OUT"/

perl -pi -e "s{<base href=\"/\">}{<base href=\"$BASE\">}" "$OUT"/403.html "$OUT"/404.html "$OUT"/500.html
perl -pi -e "s{^(ErrorDocument \d+ )/}{\$1$BASE}" "$OUT"/.htaccess
if [ -n "$SITE" ]; then
  perl -pi -e "s{(property=\"og:image\" content=\")}{\$1$SITE}" "$OUT"/index.html
else
  echo "note: pass the full site url to give link previews an absolute image address" >&2
fi

echo "built $OUT/ for $BASE"
