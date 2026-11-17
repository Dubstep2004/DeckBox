// DeckBox: Russian for the text that the settings page writes in English directly (not through t()).
// While the interface language is Russian, every text node and title / placeholder / aria-label whose whole text is
// listed here is replaced, also in parts of the page rendered later. Other languages are left alone.
(() => {
  'use strict';
  const RU = {
    // header, pages
    'DeckBox Settings': 'Настройки DeckBox',
    'Phone connected': 'Телефон подключён',
    'Phone not connected': 'Телефон не подключён',
    'Phone…': 'Телефон…',
    'Home': 'Главная', 'Dashboard': 'Приборная панель', 'AI quotas': 'Квоты ИИ', 'Sessions': 'Сессии', 'System': 'Система',
    'Processes': 'Процессы', 'Shortcuts': 'Ярлыки', 'Music': 'Музыка', 'Status': 'Статус', 'Ambient': 'Атмосфера', 'World': 'Мир',
    'Daily': 'На каждый день', 'Markets': 'Рынки', 'Feeds': 'Ленты', 'Focus': 'Фокус', 'Calm': 'Спокойствие', 'Clock': 'Часы',
    'Automation': 'Автоматизация', 'Planner': 'Планировщик', 'Nightstand': 'Прикроватные часы', 'Weekend': 'Выходные',
    'Deep work': 'Глубокая работа', 'Audio deck': 'Аудиопульт', 'Streaming deck': 'Пульт стримера', 'Meeting deck': 'Пульт встреч',
    'Development deck': 'Пульт разработчика', 'Music deck': 'Музыкальный пульт', 'Computer controls': 'Управление компьютером',
    '🏠 Home': '🏠 Главная', '🧭 Dashboard': '🧭 Приборная панель', '✳️ AI quotas': '✳️ Квоты ИИ', '🤖 Sessions': '🤖 Сессии',
    '📊 System': '📊 Система', '⚙️ Processes': '⚙️ Процессы', '🎛️ Shortcuts': '🎛️ Ярлыки', '🎵 Music': '🎵 Музыка',
    '🎯 Status': '🎯 Статус', '🌅 Ambient': '🌅 Атмосфера', '🌍 World': '🌍 Мир', '✅ Daily': '✅ На каждый день',
    '💱 Markets': '💱 Рынки', '📡 Feeds': '📡 Ленты', '🍅 Focus': '🍅 Фокус', '🫁 Calm': '🫁 Спокойствие', '🕰️ Clock': '🕰️ Часы',
    '⚡ Automation': '⚡ Автоматизация', '🗓️ Planner': '🗓️ Планировщик', '🛏️ Nightstand': '🛏️ Прикроватные часы',
    '🏖️ Weekend': '🏖️ Выходные', '🎧 Deep work': '🎧 Глубокая работа', '🎛️ Audio deck': '🎛️ Аудиопульт',
    '🎛️ Streaming deck': '🎛️ Пульт стримера', '🎛️ Meeting deck': '🎛️ Пульт встреч', '🎛️ Development deck': '🎛️ Пульт разработчика',
    '🎛️ Music deck': '🎛️ Музыкальный пульт', '🎛️ Computer controls': '🎛️ Управление компьютером',
    'never': 'никогда', '1 min': '1 мин', '2 min': '2 мин', '5 min': '5 мин', '15 min': '15 мин', '1 hour': '1 час',
    'Delete page': 'Удалить страницу',
    'Wi-Fi settings change after a restart': 'Настройки Wi-Fi применяются после перезапуска',
    'Save all pages to a file': 'Сохранить все страницы в файл', 'Load pages from a file': 'Загрузить страницы из файла',
    'Icon': 'Значок', 'Show this page on the phone': 'Показывать эту страницу на телефоне', 'Move earlier': 'Переместить выше',
    'Move later': 'Переместить ниже',
    'Save this page to a file to share it or use it on another computer': 'Сохранить страницу в файл, чтобы поделиться ею или использовать на другом компьютере',
    'The page the panel comes back to (idle return, Back key)': 'Страница, на которую панель возвращается (после простоя и кнопкой «Назад»)',
    'Font': 'Шрифт', 'Resize': 'Изменить размер', 'Enabled': 'Включено', 'Appearance preview page': 'Страница для предпросмотра оформления',

    // appearance
    'Choose a preset, then adjust individual values. Safe areas and page navigation remain reserved.': 'Выберите набор, затем настройте отдельные значения. Безопасные зоны и навигация по страницам не перекрываются.',
    'Inherit / current look': 'Наследовать / текущий вид', 'Original appearance': 'Исходный вид', 'Rounded cards': 'Скруглённые карточки',
    'Flat surfaces': 'Плоские поверхности', 'Content only': 'Только содержимое', 'Seamless panel': 'Сплошная панель',
    'Original widget font': 'Исходный шрифт виджета', 'Original font': 'Исходный шрифт', 'Sans-serif': 'Без засечек',
    'Rounded': 'Скруглённый', 'Condensed': 'Узкий', 'Serif': 'С засечками', 'Monospace': 'Моноширинный', 'Automatic': 'Автоматически',
    'Original widget default': 'Как у виджета', 'Off': 'Выкл.', 'On': 'Вкл.', 'off': 'выкл.',

    // shortcuts
    'Terminal': 'Терминал', 'Browser': 'Браузер', 'Files': 'Файлы', 'Snip': 'Снимок', 'Task Manager': 'Диспетчер задач',
    'Mute': 'Без звука', 'Screen Off': 'Выключить экран', 'Lock': 'Блокировка', 'Settings': 'Настройки',
    '⌨️ Terminal': '⌨️ Терминал', '🌐 Browser': '🌐 Браузер', '📁 Files': '📁 Файлы', '✂️ Snip': '✂️ Снимок',
    '📊 Task Manager': '📊 Диспетчер задач', '🔇 Mute': '🔇 Без звука', '🌙 Screen Off': '🌙 Выключить экран', '🔒 Lock': '🔒 Блокировка',
    '⚙️ Settings': '⚙️ Настройки',
    'terminal — Terminal': 'terminal — Терминал', 'browser — Browser': 'browser — Браузер', 'files — Files': 'files — Файлы',
    'snip — Snip': 'snip — Снимок', 'taskmgr — Task Manager': 'taskmgr — Диспетчер задач', 'mute — Mute': 'mute — Без звука',
    'screenoff — Screen Off': 'screenoff — Выключить экран', 'lock — Lock': 'lock — Блокировка', 'settings — Settings': 'settings — Настройки',
    'New shortcut': 'Новый ярлык', 'Test': 'Проверить', 'Delete': 'Удалить', 'Custom icon image': 'Своя картинка значка',
    'Upload…': 'Загрузить…', 'Remove': 'Удалить',
    'PNG, WEBP or SVG, 512 KB max. Overrides the emoji (and the app’s own icon) on the phone.': 'PNG, WEBP или SVG, до 512 КБ. Заменяет эмодзи (и собственный значок приложения) на телефоне.',
    'Pick a preset…': 'Выберите готовый вариант…', 'File Explorer (args: folder)': 'Проводник (аргумент: папка)',
    'Web address (URL in the command field)': 'Веб-адрес (URL в поле команды)', 'Store app (shell:AppsFolder\\AppID)': 'Приложение из Store (shell:AppsFolder\\AppID)',
    'Windows Settings': 'Параметры Windows', 'Screen snip': 'Снимок экрана', 'Built-in: toggle mute': 'Встроенное: выключить / включить звук',
    'Built-in: turn monitors off': 'Встроенное: выключить мониторы', 'Built-in: lock the PC': 'Встроенное: заблокировать ПК',
    'Program, address or built-in command. Anything the Windows Run dialog accepts works.': 'Программа, адрес или встроенная команда. Подойдёт всё, что принимает окно «Выполнить» в Windows.',
    'On / off key: the phone shows its state': 'Кнопка-переключатель: телефон показывает её состояние',
    'e.g. wt.exe, https://…, builtin:lock': 'например wt.exe, https://…, builtin:lock', 'e.g. -d D:\\Projects claude': 'например -d D:\\Projects claude',

    // rules
    '✳️ Claude needs me → AI page': '✳️ Claude ждёт меня → страница ИИ', '🎵 Music plays → music page': '🎵 Играет музыка → страница музыки',
    '🔴 On air while the mic is on': '🔴 «В эфире», пока включён микрофон', '📆 In a meeting → on air': '📆 На встрече → «В эфире»',
    '🔥 CPU busy → notification': '🔥 ЦП загружен → уведомление', '🌙 Away → ambient page': '🌙 Меня нет → страница атмосферы',
    '🕙 Evenings → calm page': '🕙 Вечером → спокойная страница', '🔔 Doorbell → notification': '🔔 Дверной звонок → уведомление',
    '🎯 Quota above 80 % → warning': '🎯 Квота выше 80 % → предупреждение', '👀 Review requested → work page': '👀 Запрошено ревью → рабочая страница',
    '❌ CI failed → notification': '❌ CI упал → уведомление', '🌅 Workday mornings → daily page': '🌅 Утром в будни → страница дня',
    '🔋 Mouse battery low': '🔋 Садится батарея мыши', '🌡️ Too warm (webhook value)': '🌡️ Слишком жарко (значение вебхука)',
    '➕ Empty rule': '➕ Пустое правило',
    'Page switches count down on the phone and wait while you use it (General › Page switching).': 'Переключение страниц идёт с обратным отсчётом на телефоне и ждёт, пока вы им пользуетесь (Общие › Переключение страниц).',
    'an AI session needs me': 'сессия ИИ ждёт меня', 'an AI session is working': 'сессия ИИ работает', 'music or video plays': 'играет музыка или видео',
    'an app is running': 'запущено приложение', 'an app is in front': 'приложение на переднем плане', 'the microphone is in use': 'используется микрофон',
    'the camera is in use': 'используется камера', 'a calendar event is on': 'идёт событие календаря', 'OBS is recording or streaming': 'OBS пишет или транслирует',
    'the CPU is busy': 'ЦП загружен', 'I am away from the PC': 'меня нет за компьютером', 'it is between': 'время между',
    'a pushed value': 'переданное значение', 'an AI quota is above': 'квота ИИ выше', 'a GitHub review is requested': 'запрошено ревью в GitHub',
    'CI fails on my pull request': 'CI упал в моём pull request', 'a device battery is below': 'заряд устройства ниже',
    'the network is slow': 'сеть медленная', 'always (use the days and hours below)': 'всегда (по дням и часам ниже)',
    'show the page': 'показать страницу', 'show a notification': 'показать уведомление', 'push a value': 'передать значение',
    'run a shortcut': 'запустить ярлык', '· high priority': '· высокий приоритет', 's · then rest': 'с · затем пауза', 'low': 'низкий',
    'normal': 'обычный', 'high': 'высокий', 's (empty = 3 s, as in General)': 'с (пусто = 3 с, как в «Общих»)', '· low priority': '· низкий приоритет',
    '· every day, at once': '· каждый день, сразу', 'info': 'инфо', 'warning': 'предупреждение', 'error': 'ошибка',
    'any project (or: api|docs, codex)': 'любой проект (или: api|docs, codex)', 'any app (or: Spotify|Music)': 'любое приложение (или: Spotify|Music)',
    'any event (or: meeting|call)': 'любое событие (или: meeting|call)', 'any repo (or: api|web)': 'любой репозиторий (или: api|web)',

    // control deck
    'Control Deck': 'Пульт управления',
    'Register the redirect address in your Spotify Developer app. A Client ID is sufficient; no client secret is used.': 'Укажите адрес перенаправления в своём приложении Spotify Developer. Достаточно Client ID, секрет не используется.',
    'Build': 'Сборка', 'Kind': 'Тип', 'shortcut': 'ярлык', 'app': 'приложение', 'macro': 'макрос', 'snippet': 'фрагмент', 'meeting': 'встреча',
    'focus': 'фокус', 'project': 'проект', 'keys': 'клавиши', 'text': 'текст', 'task': 'задача', 'server': 'сервер', 'sound': 'звук',
    'radio': 'радио', 'playlist': 'плейлист', 'service': 'служба', 'presentation': 'презентация', 'mixer': 'микшер',
    'Target: executable shortcut ID. Output remains on the computer.': 'Цель: ID исполняемого ярлыка. Вывод остаётся на компьютере.',
    'Run tests': 'Запустить тесты', 'Web dev server': 'Веб-сервер разработки', 'API dev server': 'API-сервер разработки',
    'Target: executable shortcut ID. Stop affects only the process started by this control.': 'Цель: ID исполняемого ярлыка. «Стоп» останавливает только процесс, запущенный этой кнопкой.',
    'Mute in meeting': 'Без звука на встрече', 'Target: meeting shortcut ID.': 'Цель: ID ярлыка встречи.', 'Camera': 'Камера',
    'Raise hand': 'Поднять руку', 'Chime': 'Колокольчик', 'Applause': 'Аплодисменты',
    'Target: full sound file path. Device: output ID. Value: volume 0–100.': 'Цель: полный путь к звуковому файлу. Устройство: ID выхода. Значение: громкость 0–100.',
    'Add control': 'Добавить элемент', 'Import & verify radio stations (radio-browser.info)': 'Импорт и проверка радиостанций (radio-browser.info)',
    'Import popular stations by country from the public radio-browser.info directory (CC0), or check configured radio stream URLs.': 'Импортируйте популярные станции по странам из открытого каталога radio-browser.info (CC0) или проверьте адреса настроенных потоков.',
    'Load countries': 'Загрузить страны', 'Load countries first…': 'Сначала загрузите страны…', 'Import stations': 'Импортировать станции',
    'Check configured streams': 'Проверить настроенные потоки', 'Available shortcut IDs': 'Доступные ID ярлыков',
    'Create executable, text and macro shortcuts in Deck first.': 'Сначала создайте исполняемые, текстовые и макро-ярлыки в пульте.',
    'Audio and routine profiles': 'Звуковые профили и сценарии', 'Meeting': 'Встреча', 'Profile ID': 'ID профиля', 'Profile label': 'Название профиля',
    'Override output device ID': 'Свой ID устройства вывода', 'Override microphone device ID': 'Свой ID микрофона',
    'Captured audio levels': 'Сохранённые уровни звука', 'Control IDs to run in order': 'ID элементов для запуска по порядку',
    'Profile action IDs': 'ID действий профиля',
    '0 captured levels. Explicit input/output overrides take precedence over captured audio roles.': 'Сохранено уровней: 0. Явно заданные вход и выход важнее сохранённых звуковых ролей.',
    'Remove profile': 'Удалить профиль', 'Capture current audio profile': 'Сохранить текущий звуковой профиль', 'Add routine profile': 'Добавить сценарий',
    'List device, monitor and MIDI IDs': 'Показать ID устройств, мониторов и MIDI', 'Country': 'Страна', 'Station count': 'Число станций',

    // general
    'For the': 'Для виджета', 'Agenda': 'Повестка',
    'widget and calendar rules. Paste an iCalendar (ICS) address: Google Calendar › Settings › your calendar ›': 'и правил календаря. Вставьте адрес iCalendar (ICS): Google Календарь › Настройки › ваш календарь ›',
    'Secret address in iCal format': 'Закрытый адрес в формате iCal', '; Outlook › Settings › Calendar › Shared calendars ›': '; Outlook › Параметры › Календарь › Общие календари ›',
    'Publish a calendar': 'Опубликовать календарь', '(ICS link); iCloud › share as a public calendar (': '(ссылка ICS); iCloud › общий доступ как публичный календарь (',
    'works). The addresses stay on this computer.': 'тоже подходит). Адреса остаются на этом компьютере.',
    'Long-lived access tokens': 'Долгосрочные токены доступа', 'Connect to OBS (for the': 'Подключение к OBS (для виджета',
    'widget, the On air widget and rules)': ', виджета «В эфире» и правил)', 'In OBS: Tools › WebSocket Server Settings ›': 'В OBS: Сервис › Настройки сервера WebSocket ›',
    'Enable WebSocket server': 'Включить сервер WebSocket', '; copy the password from': '; скопируйте пароль из', 'Show Connect Info': 'Показать сведения о подключении',
    'You design pages in landscape; in portrait the panel arranges the widgets by itself, top to bottom. Tablets use the same pages, just bigger.': 'Страницы создаются в альбомной ориентации; в портретной панель сама выстраивает виджеты сверху вниз. Планшеты используют те же страницы, только крупнее.',
    'For OLED screens that show the same page for hours. The night screen helps too.': 'Для OLED-экранов, которые часами показывают одну страницу. Ночной экран тоже помогает.',
    'A touch brightens it again without pressing anything; so do a page switch, a notification and a permission prompt.': 'Касание снова делает экран ярче, ничего не нажимая; так же действуют смена страницы, уведомление и запрос разрешения.',
    'How rules, webhooks and the idle return change the page. Instead of jumping, the phone shows': 'Как правила, вебхуки и возврат после простоя меняют страницу. Вместо резкого перехода телефон показывает',
    '“Claude needs me — switching to AI in 3…”': '«Claude ждёт меня — переход к ИИ через 3…»', 'with': 'с кнопками', 'Stay': 'Остаться', 'and': 'и', 'Go now': 'Перейти сейчас',
    'Where the idle return and the Back key go.': 'Куда ведут возврат после простоя и кнопка «Назад».',
    'Back home after (seconds without a touch, 0 = never)': 'Возвращаться на главную через (секунд без касаний, 0 = никогда)',
    'Each page can override this (page editor › Back home after).': 'Для каждой страницы это можно изменить (редактор страницы › Возвращаться на главную через).',
    'Countdown before switching (seconds, 0 = at once)': 'Отсчёт перед переключением (секунды, 0 = сразу)',
    "Don't interrupt for (seconds after I touch the panel)": 'Не прерывать в течение (секунд после касания панели)',
    'At least (seconds between two automatic switches)': 'Не чаще (секунд между двумя автоматическими переключениями)',
    'A rule keeps its page at most (minutes, 0 = while it lasts)': 'Правило держит свою страницу не дольше (минут, 0 = пока действует)',
    'After that the panel goes home when nobody touches it.': 'После этого панель возвращается на главную, если её никто не трогает.',
    'Keep the phone on the panel. Neither needs root.': 'Держать телефон на панели. Root не нужен ни для одного варианта.',
    'Pin the panel: Home and Recents stay on it (Android asks once; hold Back and Overview together to unpin)': 'Закрепить панель: кнопки «Домой» и «Недавние» не уводят с неё (Android спросит один раз; чтобы открепить, удерживайте «Назад» и «Обзор» вместе)',
    "Use the panel as the phone's home screen: it starts after a reboot and Home returns to it (turn off to get your launcher back)": 'Сделать панель главным экраном телефона: она запускается после перезагрузки, а кнопка «Домой» возвращает к ней (выключите, чтобы вернуть свой лаунчер)',
    "Keep the phone awake: turn off Android's screen saver (it starts on the charger) and keep the screen on while plugged in (set over USB)": 'Не давать телефону засыпать: выключить заставку Android (она включается на зарядке) и держать экран включённым при подключении (настраивается по USB)',
    'smart plug in Home Assistant': 'умная розетка в Home Assistant', '(the phone on its own charger), or two': '(телефон на своей зарядке) или два',
    'shortcuts': 'ярлыка', ', for example': ', например', 'for a USB hub with switchable ports. Without USB power the panel keeps running over Wi-Fi.': 'для USB-хаба с отключаемыми портами. Без питания по USB панель продолжает работать по Wi-Fi.',
    'Keep the battery between': 'Держать заряд между', '% and': '% и', 'Switch the power with': 'Переключать питание через',
    'a Home Assistant switch (smart plug)': 'выключатель Home Assistant (умная розетка)', 'two shortcuts (power on / power off)': 'два ярлыка (включить / выключить питание)',
    'Switch entity': 'Сущность выключателя', 'Shortcut: power on': 'Ярлык: включить питание', 'Shortcut: power off': 'Ярлык: выключить питание',
    'Test: power off': 'Проверка: выключить питание', 'Test: power on': 'Проверка: включить питание', 'charging (just now)': 'заряжается (только что)',
    'When Claude Code asks for permission (run a command, edit a file…), the phone shows the request with': 'Когда Claude Code просит разрешение (выполнить команду, изменить файл…), телефон показывает запрос с кнопками',
    'Allow': 'Разрешить', 'Deny': 'Запретить',
    '. If the phone is not connected or nobody answers in time, Claude Code asks in the terminal as usual. This needs a small hook in': '. Если телефон не подключён или никто не ответил вовремя, Claude Code спросит в терминале, как обычно. Для этого нужен небольшой хук в',
    '; DeckBox adds it for you (a backup is kept next to the file).': '; DeckBox добавит его сам (рядом с файлом сохранится резервная копия).',
    'Not installed': 'Не установлен', 'Installed': 'Установлен', 'Only when I am away from the PC (no keyboard or mouse for a minute)': 'Только когда меня нет за компьютером (клавиатура и мышь не трогались минуту)',
    'Seconds to answer before the terminal takes over': 'Секунд на ответ, прежде чем спросит терминал',
    'Choose which AI coding services to track and show on the panel, and configure rotation.': 'Выберите, какие ИИ-сервисы отслеживать и показывать на панели, и настройте их смену.',
    'Tracked AI services': 'Отслеживаемые ИИ-сервисы', 'Rotate providers automatically': 'Переключать сервисы автоматически', 'Cards at a time': 'Карточек одновременно',
    '0 = show all': '0 = показать все', 'Rotate every (seconds)': 'Переключать каждые (секунд)', 'e.g. 5, 8, 15 seconds': 'например 5, 8, 15 секунд',
    'All connected devices': 'Все подключённые устройства', 'If several Android devices are connected, choose which one runs the panel.': 'Если подключено несколько Android-устройств, выберите, на каком работает панель.',
    'Path to adb.exe (empty = auto-detect)': 'Путь к adb.exe (пусто = найти автоматически)', 'auto-detected': 'найдено автоматически',
    'Shows all pages': 'Показывает все страницы',
    'Pair a phone by plugging it in once over USB after turning this on (and restarting), or without a cable:': 'Сопрягите телефон, один раз подключив его по USB после включения этой настройки (и перезапуска), или без кабеля:',
    'Pair a phone over Wi-Fi': 'Сопрячь телефон по Wi-Fi', 'Addresses offered to the phone': 'Адреса, которые получит телефон',
    'Listening on port 8766 (HTTPS)': 'Ожидает подключений на порту 8766 (HTTPS)', 'Click to copy': 'Нажмите, чтобы скопировать',

    // webhooks, advanced
    'A number': 'Число', 'A status with a subtitle': 'Статус с подписью', 'A list (style: list)': 'Список (стиль: list)',
    'Expires after 10 minutes': 'Пропадает через 10 минут', 'Notification on the phone': 'Уведомление на телефоне',
    'Switch the phone to a page': 'Переключить телефон на страницу', 'Refresh everything now': 'Обновить всё сейчас',
    'JSON payloads may carry': 'JSON может содержать', '(a list) and': '(список) и',
    '(seconds). Plain text or a number works too. Notifications take': '(секунды). Подойдёт и простой текст или число. Уведомления принимают',
    '(light up the night screen) and': '(разбудить ночной экран) и', '(switch to it).': '(переключиться на неё).',
    'Version': 'Версия', 'Settings file': 'Файл настроек', 'browser storage (demo)': 'хранилище браузера (демо)', 'Log': 'Журнал',
    'The settings file includes your shortcut commands, tokens and keys: keep it private.': 'В файле настроек есть команды ярлыков, токены и ключи: никому его не показывайте.',
    'The phone asks Open-Meteo for this location only while a page has a widget that uses the weather (weather, forecast, sun & moon, a clock with its weather line, Custom HTML).': 'Телефон запрашивает погоду у Open-Meteo для этого места, только пока на странице есть виджет с погодой (погода, прогноз, солнце и луна, часы со строкой погоды, свой HTML).',
    'widget. Create a token in Home Assistant › your profile › Security ›': '. Создайте токен в Home Assistant › ваш профиль › Безопасность ›',
    '. The token stays on this computer; the phone only sees the entities its widgets list. (Home Assistant can also push values and notifications to the panel, see Webhooks.)': '. Токен остаётся на этом компьютере; телефон видит только сущности, перечисленные в его виджетах. (Home Assistant также может передавать на панель значения и уведомления, см. «Вебхуки».)',
    ', then fades over. It never pulls a page away while you are using the panel, and rules that fire one after another wait their turn instead of bouncing the screen back and forth.': ', а затем плавно переходит. Он никогда не уводит страницу, пока вы пользуетесь панелью, а правила, сработавшие одно за другим, ждут своей очереди, а не дёргают экран туда-сюда.',
    'Follow the computer lock: turn the phone screen off when macOS locks; wake it and open DeckBox when macOS unlocks (ADB required; unlock phones secured by a PIN or password manually)': 'Следовать блокировке компьютера: выключать экран телефона, когда macOS блокируется, и включать его с DeckBox при разблокировке (нужен ADB; телефоны с PIN-кодом или паролем разблокируйте вручную)',
    "A phone that is plugged in all the time wears its battery out. DeckBox can keep it between two levels by switching the phone's power on and off. Phones cannot stop charging by themselves without root, so the power is switched where it comes from: a": 'Телефон, который постоянно на зарядке, изнашивает батарею. DeckBox может держать заряд между двумя уровнями, включая и выключая питание телефона. Без root телефон не умеет сам прекращать зарядку, поэтому питание переключается там, откуда оно приходит:',
    'Several phones (or a phone and a tablet) can use this computer at once, over USB or Wi-Fi. Give each one a name and choose the pages it shows; a phone shows all pages until you choose.': 'Несколько телефонов (или телефон и планшет) могут работать с этим компьютером одновременно, по USB или Wi-Fi. Дайте каждому имя и выберите, какие страницы он показывает; пока вы не выбрали, телефон показывает все страницы.',
    "shows a QR code to scan with the phone's camera. The phone then talks HTTPS to this PC, trusts only this PC's certificate and has to present a secret key. The phone and this PC must be on the same network — or both on": 'показывает QR-код, который нужно отсканировать камерой телефона. Дальше телефон общается с этим ПК по HTTPS, доверяет только сертификату этого ПК и предъявляет секретный ключ. Телефон и ПК должны быть в одной сети — или оба в',
    ', which also works from another place or across separate Wi-Fi networks. Windows Firewall asks once — allow it (tick the network type Tailscale uses, too).': ', что работает и из другого места, и между разными сетями Wi-Fi. Брандмауэр Windows спросит один раз — разрешите (отметьте и тип сети, который использует Tailscale).',
    "From other machines on your network or Tailscale, with the webhook key (HTTPS with this PC's self-signed certificate, so curl needs -k). The key can also go in ?token= for senders that cannot set headers. It only opens the webhook endpoints, never the phone API; replace it if it leaks.": 'С других компьютеров в вашей сети или в Tailscale — с ключом вебхука (HTTPS с самоподписанным сертификатом этого ПК, поэтому curl нужен -k). Ключ можно передать и в ?token= для отправителей, которые не умеют задавать заголовки. Он открывает только адреса вебхуков, но не API телефона; если ключ утёк, замените его.',
    'Profile action IDs': 'ID действий профиля',
    'Mo': 'Пн', 'Tu': 'Вт', 'We': 'Ср', 'Th': 'Чт', 'Fr': 'Пт', 'Sa': 'Сб', 'Su': 'Вс', 'active now': 'действует сейчас',
  };
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const ATTRS = ['title', 'placeholder', 'aria-label'];
  const active = () => window.DeckBoxI18n?.getLang?.() === 'ru';

  function textNode(n) {
    const raw = n.nodeValue;
    if (!raw || !/[A-Za-z]/.test(raw)) return;
    const hit = RU[norm(raw)];
    if (hit === undefined) return;
    const lead = raw.match(/^\s*/)[0], tail = raw.match(/\s*$/)[0];
    const next = lead + hit + tail;
    if (next !== raw) n.nodeValue = next; // never rewrite a node to itself: that would notify the observer again
  }
  function element(el) {
    for (const a of ATTRS) {
      const v = el.getAttribute?.(a);
      const hit = v ? RU[norm(v)] : undefined;
      if (hit !== undefined && hit !== v) el.setAttribute(a, hit);
    }
  }
  function walk(root) {
    if (!root || !active()) return;
    if (root.nodeType === 3) { if (!/^(SCRIPT|STYLE|TEXTAREA)$/.test(root.parentNode?.nodeName || '')) textNode(root); return; }
    if (root.nodeType !== 1) return;
    element(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      // code samples and text fields keep their text; their tooltips are still translated
      acceptNode: (n) => (n.nodeType === 1 && /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE)$/.test(n.nodeName) ? (element(n), NodeFilter.FILTER_REJECT) : NodeFilter.FILTER_ACCEPT),
    });
    for (let n = tw.nextNode(); n; n = tw.nextNode()) (n.nodeType === 3 ? textNode(n) : element(n));
  }
  let busy = false;
  const mo = new MutationObserver((list) => {
    if (busy || !active()) return;
    busy = true;
    try {
      for (const m of list) {
        if (m.type === 'characterData') walk(m.target);
        else if (m.type === 'attributes') element(m.target);
        else m.addedNodes.forEach(walk);
      }
    } finally { busy = false; }
  });
  function start() {
    if (active() && RU[document.title]) document.title = RU[document.title];
    walk(document.body);
    mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  // a language switch to Russian re-translates the whole page
  window.DeckBoxRuDom = {
    refresh: () => { if (active() && RU[document.title]) document.title = RU[document.title]; walk(document.body); },
    size: Object.keys(RU).length,
  };
})();
