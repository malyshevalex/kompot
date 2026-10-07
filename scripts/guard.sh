#!/bin/sh
# Не пересобирать, пока Kompot запущена из release/: сборка заменит файлы под работающим приложением
if pgrep -f "release/mac-arm64/Kompot.app/Contents/MacOS/Kompot" >/dev/null; then
  echo "Kompot запущена из release/ — закройте её и повторите сборку." >&2
  exit 1
fi
