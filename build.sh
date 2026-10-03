#!/bin/sh
# Usage: ./build.sh [base]   e.g. ./build.sh /nodes/proxion/   (default: /)
set -e

BASE="${1:-/}"
OUT=dist

case "$BASE" in
  /|/*/) ;;
  *) echo "base must start and end with /, e.g. /nodes/proxion/" >&2; exit 1 ;;
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

echo "built $OUT/ for $BASE"
