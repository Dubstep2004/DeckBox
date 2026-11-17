#!/usr/bin/env bash
# Builds DeckBox-Setup-<version>.exe (Windows x64 agent + phone app + adb) on Linux.
# Needs: .NET 10 SDK, JDK 17+, Android SDK (ANDROID_HOME, platform 35), makensis (apt install nsis), curl, unzip.
# APK signing: set PHONEBOX_STORE_FILE, PHONEBOX_STORE_PASSWORD, PHONEBOX_KEY_ALIAS, PHONEBOX_KEY_PASSWORD
# to the DeckBox keystore. Keep using the same key, or phones refuse to update the app.
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
work=${WORK:-$(mktemp -d)}
stage="$work/stage"
version=$(sed -n 's:.*<Version>\(.*\)</Version>.*:\1:p' "$root/agent/PhoneBox.Agent/PhoneBox.Agent.csproj" | head -n1)

echo "==> Agent (win-x64, self-contained)"
dotnet publish "$root/agent/PhoneBox.Agent" -c Release \
  -p:TargetFrameworks=net10.0-windows10.0.19041.0 -p:EnableWindowsTargeting=true \
  -f net10.0-windows10.0.19041.0 -r win-x64 --self-contained true -p:PublishSingleFile=true \
  -o "$work/agent" --nologo
mkdir -p "$stage/agent" "$stage/platform-tools"
find "$work/agent" -maxdepth 1 -type f ! -name '*.pdb' ! -name 'config.default.linux.json' ! -name 'config.default.macos.json' \
  -exec cp {} "$stage/agent/" \;

echo "==> Phone app"
(cd "$root/android" && ./gradlew --no-daemon -q assembleRelease)
cp "$root/android/app/build/outputs/apk/release/app-release.apk" "$stage/DeckBox.apk"

echo "==> adb for Windows"
curl -fsSL -o "$work/pt.zip" https://dl.google.com/android/repository/platform-tools-latest-windows.zip
unzip -qo "$work/pt.zip" -d "$work"
cp "$work"/platform-tools/{adb.exe,AdbWinApi.dll,AdbWinUsbApi.dll,NOTICE.txt} "$stage/platform-tools/"

echo "==> Installer"
cp "$root/agent/PhoneBox.Agent/phonebox.ico" "$stage/deckbox.ico"
{ cat "$root/LICENSE"
  printf '\nDeckBox is based on PhoneBox by ersinkoc (https://github.com/ersinkoc/phonebox).\n'
  printf 'adb (Android platform-tools) is distributed under its own license, see platform-tools\\NOTICE.txt.\n'
} | sed 's/$/\r/' > "$stage/LICENSE.txt"
sed 's/$/\r/' "$root/installer/install-phone.cmd" > "$stage/install-phone.cmd"
(cd "$root/installer" && makensis -V2 -DSTAGE="$stage" -DVERSION="$version" deckbox.nsi)
echo "==> $root/installer/DeckBox-Setup-$version.exe"
