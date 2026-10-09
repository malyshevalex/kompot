#!/bin/sh
# Выпуск версии на GitHub: Windows (установщик и zip) и macOS (подписанный и нотаризованный dmg и zip).
# Перед запуском поднимите версию в package.json, закоммитьте и отправьте изменения.
# Токен GitHub берётся из gh для аккаунта malyshevalex (gh auth login), основной аккаунт gh не переключается.
set -e
cd "$(dirname "$0")/.."
sh scripts/guard.sh

VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"
REPO=malyshevalex/kompot

if [ -n "$(git status --porcelain)" ]; then
  echo "Есть незакоммиченные изменения — сначала закоммитьте их." >&2
  exit 1
fi
git fetch -q origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "Ветка main не совпадает с GitHub — сначала git push." >&2
  exit 1
fi
TOKEN=$(gh auth token --user malyshevalex 2>/dev/null) || {
  echo "В gh нет входа для malyshevalex: gh auth login -h github.com, затем gh auth switch на основной аккаунт." >&2
  exit 1
}
if GH_TOKEN="$TOKEN" gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
  echo "Релиз $TAG уже есть — поднимите версию в package.json." >&2
  exit 1
fi

for i in 1 2 3; do rm -rf release 2>/dev/null; [ ! -e release ] && break; sleep 1; done
APPLE_KEYCHAIN_PROFILE=kletka npx electron-builder --mac dmg zip --arm64 --win nsis zip --x64 --publish never
sh scripts/notarize-dmg.sh
spctl -a -t install release/Kompot-"$VERSION"-arm64.dmg
# без app-update.yml собранная версия не сможет обновляться
for f in release/mac-arm64/Kompot.app/Contents/Resources/app-update.yml release/win-unpacked/resources/app-update.yml; do
  [ -f "$f" ] || { echo "Нет $f — релиз не публикую." >&2; exit 1; }
done

cd release
GH_TOKEN="$TOKEN" gh release create "$TAG" --repo "$REPO" --target main --title "Компот $VERSION" --generate-notes \
  "Kompot-Setup-$VERSION.exe" "Kompot-Setup-$VERSION.exe.blockmap" latest.yml "Kompot-$VERSION-win.zip" \
  "Kompot-$VERSION-arm64.dmg" "Kompot-$VERSION-arm64-mac.zip" "Kompot-$VERSION-arm64-mac.zip.blockmap" latest-mac.yml
echo "Готово: https://github.com/$REPO/releases/tag/$TAG"
