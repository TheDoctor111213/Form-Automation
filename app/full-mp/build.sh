#!/usr/bin/env bash
set -euo pipefail
d="$(cd "$(dirname "$0")" && pwd)"
out="${1:-$d/RCS Renewal — Multi-property (open in browser).html}"
{ cat "$d/shell.head.html" "$d/lib/pdf-lib.min.js" "$d/lib/supabase.min.js"; printf '\n;\n'; cat "$d/config.js" "$d/core.js" "$d/db.js" "$d/db.supabase.js" "$d/app.js" "$d/gen.js" "$d/templates.js" "$d/shell.tail.html"; } > "$out"
echo "built ($(wc -c < "$out") bytes)"
