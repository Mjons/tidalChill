#!/bin/bash
# Smoke test on an emulator: install, open app, preview wallpaper, set it, fire an event, screenshot each step.
set -x
mkdir -p shots
shot(){ adb exec-out screencap -p > "shots/$1.png"; }
dump(){ adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml shots/ui_$1.xml >/dev/null 2>&1; }
tap(){ dump "$1"; xy=$(python3 ci/tap.py "shots/ui_$1.xml" "$2") && adb shell input tap $xy; }
adb logcat -c
adb install -r TidalChill.apk || exit 1
adb shell am start -n app.tidalchill/.MainActivity; sleep 6; shot 1_app
adb shell am start -a android.service.wallpaper.CHANGE_LIVE_WALLPAPER \
  --ecn android.service.wallpaper.extra.LIVE_WALLPAPER_COMPONENT app.tidalchill/app.tidalchill.TideWallpaper
sleep 20; shot 2_preview
tap preview "^set wallpaper$|^set$|apply" ; sleep 4; shot 3_after_set
tap dest "home and lock|home screen" ; sleep 4
adb shell input keyevent HOME; sleep 12; shot 4_home
adb shell am start -n app.tidalchill/.MainActivity; sleep 4
tap pad "Tsunami"; sleep 1
adb shell input keyevent HOME; sleep 10; shot 5_tsunami
adb shell am start -n app.tidalchill/.MainActivity; sleep 3
tap pad2 "Aliens"; sleep 1
adb shell input keyevent HOME; sleep 14; shot 6_aliens
adb shell dumpsys wallpaper > shots/dumpsys_wallpaper.txt 2>&1
adb logcat -d | grep -iE "tidal|chromium|AndroidRuntime|wallpaper|console" | tail -400 > shots/logcat.txt
exit 0
