# Настройка UMIDIGI BISON (без root)

Необязательная чистка телефона, на котором создавалась панель (UMIDIGI BISON, Android 11, MediaTek Helio P60).
Всё здесь обратимо и работает без разблокировки загрузчика.

## Удаление лишних приложений
```powershell
.\debloat.ps1            # удалить пакеты из debloat-list.txt для пользователя 0
.\debloat.ps1 -Restore   # вернуть их все
```
`pm uninstall -k --user 0` только скрывает пакет для текущего пользователя; APK остаётся в системном разделе.
Сброс к заводским настройкам тоже всё возвращает.

## Полезные настройки
```sh
adb shell settings put global window_animation_scale 0.5
adb shell settings put global transition_animation_scale 0.5
adb shell settings put global animator_duration_scale 0.5
adb shell settings put global wifi_scan_always_enabled 0      # без фонового поиска Wi-Fi
adb shell settings put global ble_scan_always_enabled 0       # без фонового поиска Bluetooth
adb shell settings put global stay_on_while_plugged_in 0      # панель сама держит экран включённым
adb shell settings put global private_dns_mode hostname       # блокировка рекламы и трекеров во всей системе
adb shell settings put global private_dns_specifier dns.adguard-dns.com
adb shell cmd package bg-dexopt-job                           # заранее скомпилировать приложения (~5 минут)
adb shell sm idle-maint run                                   # fstrim и обслуживание в простое
```
Значения по умолчанию для отката: масштаб анимаций `1.0`, обе настройки поиска `1`, частный DNS `off`.

## Заметки
- Последняя прошивка — апрель 2021 года (патч безопасности 2021-03-05); обновляйте Chrome, WebView и сервисы Google Play.
- Загрузчик можно разблокировать (OEM unlock разрешён, Treble поддерживается), если когда-нибудь захотите GSI и root —
  при этом телефон будет очищен.
- Панель, которая всегда на зарядке, держит батарею на 100 %; без root ограничить заряд нельзя, поэтому подумайте об
  умной розетке или USB-таймере (или функции «Бережная зарядка» в DeckBox).
