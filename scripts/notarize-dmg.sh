#!/bin/sh
# electron-builder нотаризует только Kompot.app; образ .dmg подписываем и нотаризуем отдельно
set -e
DMG=$(ls release/Kompot-*-arm64.dmg)
codesign --force --timestamp --sign "Developer ID Application: Aleksandr Malyshev (Y9DZYM3P8L)" "$DMG"
xcrun notarytool submit "$DMG" --keychain-profile kletka --wait
xcrun stapler staple "$DMG"
