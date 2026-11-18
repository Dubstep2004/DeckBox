; DeckBox installer for Windows 10/11 x64 (per user, no administrator rights needed).
; Build: makensis -DSTAGE=<folder with agent\, platform-tools\, DeckBox.apk, install-phone.cmd> -DVERSION=x.y.z deckbox.nsi
Unicode true
ManifestDPIAware true
SetCompressor /SOLID lzma

!ifndef VERSION
  !define VERSION "0.0.0"
!endif
!define NAME "DeckBox"
!define EXE "DeckBoxAgent.exe"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\DeckBox"

Name "${NAME}"
OutFile "DeckBox-Setup-${VERSION}.exe"
InstallDir "$LOCALAPPDATA\DeckBox\app"
RequestExecutionLevel user
BrandingText "DeckBox ${VERSION}"

VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "DeckBox"
VIAddVersionKey "FileDescription" "Установщик DeckBox"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "MIT. Based on PhoneBox by ersinkoc"

!include "MUI2.nsh"
!define MUI_ICON "${STAGE}\deckbox.ico"
!define MUI_UNICON "${STAGE}\deckbox.ico"
!define MUI_ABORTWARNING
!define MUI_COMPONENTSPAGE_SMALLDESC

!define MUI_WELCOMEPAGE_TITLE "Установка DeckBox"
!define MUI_WELCOMEPAGE_TEXT "DeckBox превращает старый Android-телефон в настольную панель для компьютера.$\r$\n$\r$\nБудут установлены программа-агент для Windows и приложение для телефона. Права администратора не нужны.$\r$\n$\r$\nЕсли хотите сразу поставить приложение на телефон, включите на нём «Отладку по USB» и подключите кабелем.$\r$\n$\r$\nНажмите «Далее», чтобы продолжить."
!define MUI_FINISHPAGE_TITLE "DeckBox установлен"
!define MUI_FINISHPAGE_TEXT "Агент DeckBox запущен, его значок появился в трее рядом с часами.$\r$\n$\r$\nВ настройках выберите шаблон страницы, расставьте виджеты и нажмите «Сохранить»."
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "Открыть настройки DeckBox"
!define MUI_FINISHPAGE_RUN_FUNCTION OpenSettings

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "${STAGE}\LICENSE.txt"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Russian"

Function OpenSettings
  ExecShell "open" "http://127.0.0.1:8765"
FunctionEnd

Section "DeckBox (программа для компьютера)" SecMain
  SectionIn RO
  DetailPrint "Останавливаю запущенный агент..."
  nsExec::Exec 'taskkill /F /IM ${EXE}'
  Pop $0
  ; DeckBox used to be called PhoneBox: stop and remove the old program. Its settings folder (%APPDATA%\PhoneBox)
  ; stays; DeckBox copies it into %APPDATA%\DeckBox on the first start, so pages, shortcuts and rules are kept.
  nsExec::Exec 'taskkill /F /IM PhoneBoxAgent.exe'
  Pop $0
  Sleep 1500
  Delete "$SMSTARTUP\PhoneBox.lnk"
  RMDir /r "$LOCALAPPDATA\PhoneBox\app"
  ; a clean folder: earlier installs from source left many framework files here; settings live elsewhere
  RMDir /r "$INSTDIR"
  SetOutPath "$INSTDIR"
  File /r "${STAGE}\agent\*.*"
  File "${STAGE}\DeckBox.apk"
  File "${STAGE}\install-phone.cmd"
  File "${STAGE}\deckbox.ico"
  File "${STAGE}\LICENSE.txt"
  SetOutPath "$INSTDIR\platform-tools"
  File "${STAGE}\platform-tools\*.*"
  SetOutPath "$INSTDIR"

  CreateDirectory "$SMPROGRAMS\DeckBox"
  CreateShortCut "$SMPROGRAMS\DeckBox\DeckBox.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\deckbox.ico"
  WriteINIStr "$SMPROGRAMS\DeckBox\Настройки DeckBox.url" "InternetShortcut" "URL" "http://127.0.0.1:8765"
  CreateShortCut "$SMPROGRAMS\DeckBox\Установить приложение на телефон.lnk" "$INSTDIR\install-phone.cmd" "" "$INSTDIR\deckbox.ico"
  CreateShortCut "$SMPROGRAMS\DeckBox\Удалить DeckBox.lnk" "$INSTDIR\uninstall.exe"

  WriteUninstaller "$INSTDIR\uninstall.exe"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "DeckBox"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINST_KEY}" "Publisher" "DeckBox"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\deckbox.ico"
  WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoRepair" 1

  DetailPrint "Запускаю агент DeckBox..."
  Exec '"$INSTDIR\${EXE}"'
SectionEnd

Section "Запускать вместе с Windows" SecAutostart
  ; the same shortcut name the tray menu's "Start with Windows" item uses
  Delete "$SMSTARTUP\DeskAgent.lnk"
  CreateShortCut "$SMSTARTUP\DeckBox.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\deckbox.ico"
SectionEnd

Section "Установить приложение на телефон (USB)" SecPhone
  ; a silent update from the agent never waits for the phone: the phone updates itself from its update card
  IfSilent 0 +2
    Return
  DetailPrint "Установка приложения на телефон..."
  ExecWait '"$SYSDIR\cmd.exe" /c ""$INSTDIR\install-phone.cmd""'
SectionEnd

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecMain} "Агент, который передаёт данные на телефон, и страница настроек."
  !insertmacro MUI_DESCRIPTION_TEXT ${SecAutostart} "Агент будет запускаться сам при входе в Windows."
  !insertmacro MUI_DESCRIPTION_TEXT ${SecPhone} "Поставить приложение DeckBox на телефон, подключённый по USB. Можно сделать позже из меню Пуск."
!insertmacro MUI_FUNCTION_DESCRIPTION_END

Section "Uninstall"
  nsExec::Exec 'taskkill /F /IM ${EXE}'
  Pop $0
  Sleep 1500
  nsExec::Exec '"$INSTDIR\platform-tools\adb.exe" kill-server'
  Pop $0
  Delete "$SMSTARTUP\DeckBox.lnk"
  RMDir /r "$SMPROGRAMS\DeckBox"
  DeleteRegKey HKCU "${UNINST_KEY}"
  RMDir /r "$INSTDIR"
  MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "Удалить также настройки DeckBox (страницы, ярлыки, сопряжение с телефоном)?" IDNO done
    RMDir /r "$APPDATA\DeckBox"
    RMDir /r "$LOCALAPPDATA\DeckBox"
    RMDir /r "$APPDATA\PhoneBox"
    RMDir /r "$LOCALAPPDATA\PhoneBox"
  done:
SectionEnd
