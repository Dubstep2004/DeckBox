# Перенос новинок из исходного проекта

DeckBox основан на [ersinkoc/phonebox](https://github.com/ersinkoc/phonebox) (MIT). Новые правки оттуда переносятся
сюда по одной, с переименованием и по-русски.

- `LAST` — полный SHA последней перенесённой правки из `ersinkoc/phonebox` (ветка `main`).
- `rename.py IN OUT` — переименовывает пути и имена в патче (`PhoneBox.Agent` → `DeckBox.Agent`,
  `net/oxog/phonebox/deskpanel` → `io/github/dubstep2004/deckbox`, пакет приложения).
- `apply.sh PATCH` — накладывает переименованный патч (3-way); конфликты и `.rej` нужно свести вручную.
- `resolve.py FILE ours|theirs` — оставляет одну сторону во всех блоках конфликта файла.

## Порядок

1. `git fetch upstream` (remote `upstream` = https://github.com/ersinkoc/phonebox.git), список правок:
   `git log --reverse --format='%h %s' $(cat tools/upstream/LAST)..upstream/main`.
2. Пропускать: манифесты Scoop/winget, выпуски («Release x.y.z»), правки только CHANGELOG/README/ROADMAP, переводы на
   другие языки (у DeckBox только русский и английский как запасной).
3. Для каждой правки: `git format-patch -1 <sha> --stdout > /tmp/p.patch`, `python3 tools/upstream/rename.py /tmp/p.patch
   /tmp/p.r.patch`, `tools/upstream/apply.sh /tmp/p.r.patch`, свести конфликты (наш русский текст, PRO-функции и
   DeckBox-имена сохраняются; ключи i18n для других языков отбрасываются; новым ключам `en` нужен перевод в `ru`).
4. Убрать «PhoneBox» из всего, что видит пользователь (тексты, сообщения, адреса `ersinkoc/phonebox` →
   `Dubstep2004/DeckBox`). Учитывать `minSdk = 21`: вызовы новее API 21 — только с проверкой версии.
5. Проверки: `dotnet test agent/DeckBox.Agent.Tests`, сборка под Windows
   (`-p:TargetFrameworks=net10.0-windows10.0.19041.0 -p:EnableWindowsTargeting=true`), `./gradlew lintDebug`
   (если есть Android SDK), Playwright в `tools/ui-tests`.
6. Записать SHA последней перенесённой правки в `LAST`, запись в CHANGELOG (разделы ✨ / ⚡ / 🛠 / 🗑, без слова PhoneBox),
   поднять версию (`agent/DeckBox.Agent/DeckBox.Agent.csproj` `<Version>`, `android/app/build.gradle.kts`
   `versionCode` и `versionName`), push в `main`, запустить workflow `deckbox-release.yml`.
