@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title DeckBox - установка приложения на телефон
set "DIR=%~dp0"
set "ADB=%DIR%platform-tools\adb.exe"
set "APK=%DIR%DeckBox.apk"
set "PKG=io.github.dubstep2004.deckbox"
rem the phone app before the rename (PhoneBox and DeckBox 0.9.18)
set "OLDPKG=net.oxog.phonebox.deskpanel"

echo.
echo  DeckBox: установка приложения на телефон
echo  -----------------------------------------
echo  1. Включите на телефоне "Отладку по USB" (Настройки - Для разработчиков).
echo  2. Подключите телефон к компьютеру кабелем.
echo  3. Подтвердите на телефоне запрос "Разрешить отладку по USB?".
echo.

"%ADB%" start-server >nul 2>&1
set /a TRIES=0
:wait
set "STATE="
for /f "delims=" %%s in ('"%ADB%" get-state 2^>nul') do set "STATE=%%s"
if "!STATE!"=="device" goto found
set /a TRIES+=1
if !TRIES! GEQ 60 goto notfound
if !TRIES!==1 echo  Жду телефон... (до 2 минут)
timeout /t 2 /nobreak >nul
goto wait

:notfound
echo.
echo  Телефон не найден. Проверьте кабель и отладку по USB.
echo  Если на телефоне висит запрос на разрешение отладки - подтвердите его.
echo  Повторить можно позже: Пуск - DeckBox - Установить приложение на телефон.
echo.
pause
exit /b 1

:found
echo  Телефон найден.
"%ADB%" shell pm list packages %OLDPKG% 2>nul | findstr /c:"package:%OLDPKG%" >nul
if not errorlevel 1 (
  echo  Удаляю старое приложение PhoneBox / DeckBox 0.9.18. Настройки панели хранятся на компьютере и не пропадут.
  "%ADB%" uninstall %OLDPKG% >nul 2>&1
)
echo  Устанавливаю приложение...
"%ADB%" install -r "%APK%" > "%TEMP%\deckbox-adb.txt" 2>&1
findstr /c:"Success" "%TEMP%\deckbox-adb.txt" >nul && goto ok
findstr /c:"INSTALL_FAILED_UPDATE_INCOMPATIBLE" /c:"signatures do not match" "%TEMP%\deckbox-adb.txt" >nul && goto conflict
goto failed

:conflict
echo.
echo  На телефоне уже стоит DeckBox с другой подписью.
echo  Его нужно удалить, чтобы поставить новое приложение. Настройки панели хранятся на компьютере и не пропадут.
choice /c YN /m " Удалить старое приложение и установить DeckBox? (Y - да, N - нет)"
if errorlevel 2 goto failed
"%ADB%" uninstall %PKG% >nul 2>&1
"%ADB%" install "%APK%" > "%TEMP%\deckbox-adb.txt" 2>&1
findstr /c:"Success" "%TEMP%\deckbox-adb.txt" >nul && goto ok
goto failed

:ok
"%ADB%" shell am start -n %PKG%/.MainActivity >nul 2>&1
echo.
echo  Готово! DeckBox установлен и открыт на телефоне.
echo.
timeout /t 5 >nul
exit /b 0

:failed
echo.
echo  Не удалось установить приложение. Ответ телефона:
type "%TEMP%\deckbox-adb.txt"
echo.
echo  Файл DeckBox.apk лежит в папке %DIR%
echo  Его можно скопировать на телефон и установить вручную.
echo.
pause
exit /b 1
