#!/bin/bash
# Concatenate individual wireframe .txt files into WIREFRAMES.md
# Run from repo root: bash web/wireframes/build.sh

set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/../WIREFRAMES.md"

echo "# Jade Web App — Wireframes" > "$OUT"
echo "" >> "$OUT"
echo "Auto-generated from web/wireframes/*.txt — do not edit directly." >> "$OUT"
echo "Edit individual files, then run: bash web/wireframes/build.sh" >> "$OUT"

for f in "$DIR"/*.txt; do
  echo "" >> "$OUT"
  echo "---" >> "$OUT"
  echo "" >> "$OUT"
  cat "$f" >> "$OUT"
done

echo "" >> "$OUT"
echo "---" >> "$OUT"
echo "Generated from $(ls "$DIR"/*.txt | wc -l | tr -d ' ') wireframe files." >> "$OUT"
