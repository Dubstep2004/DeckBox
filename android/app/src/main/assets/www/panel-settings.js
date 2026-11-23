// «⚙ Настройки» on the phone (DeckBox PRO): theme, weather, time and date, morning briefing — changed right on the
// panel and saved on the computer (the rest stays in the PC settings).
import { api, cfg, cfgVersion, h, haptic, loadConfig, safeFetch, toast } from './main.js';

const THEMES = [['pro', 'Золото', '#d4af37'], ['silver', 'Серебро', '#c3cad5'], ['emerald', 'Изумруд', '#2fbf8a'], ['ruby', 'Рубин', '#e0455f']];
const ZONES = [['', 'Как на телефоне'], ['Europe/Kaliningrad', 'Калининград (UTC+2)'], ['Europe/Moscow', 'Москва (UTC+3)'], ['Europe/Samara', 'Самара (UTC+4)'],
  ['Asia/Yekaterinburg', 'Екатеринбург (UTC+5)'], ['Asia/Omsk', 'Омск (UTC+6)'], ['Asia/Novosibirsk', 'Новосибирск (UTC+7)'], ['Asia/Krasnoyarsk', 'Красноярск (UTC+7)'],
  ['Asia/Irkutsk', 'Иркутск (UTC+8)'], ['Asia/Yakutsk', 'Якутск (UTC+9)'], ['Asia/Vladivostok', 'Владивосток (UTC+10)'], ['Asia/Magadan', 'Магадан (UTC+11)'],
  ['Asia/Kamchatka', 'Камчатка (UTC+12)'], ['Europe/Minsk', 'Минск (UTC+3)'], ['Asia/Almaty', 'Алматы (UTC+5)'], ['UTC', 'UTC']];

const select = (options, value) => {
  const s = h('select', 'ps-sel', ...options.map(([v, label]) => { const o = h('option', null, label); o.value = v; return o; }));
  s.value = value;
  return s;
};
const seg = (options, value, onPick) => {
  const box = h('div', 'ps-seg');
  let cur = value;
  const paint = () => [...box.children].forEach((b) => b.classList.toggle('on', b.dataset.v === String(cur)));
  for (const [v, label] of options) {
    const b = h('button', null, label);
    b.type = 'button'; b.dataset.v = String(v);
    b.addEventListener('click', () => { haptic(); cur = v; paint(); onPick?.(v); });
    box.append(b);
  }
  paint();
  box.value = () => cur;
  return box;
};
const row = (label, ...control) => h('div', 'ps-row', h('span', 'ps-label', label), h('div', 'ps-ctl', ...control));

export function openPanelSettings() {
  haptic();
  document.querySelector('.ps-back')?.remove();
  const d = cfg.display || {}, w = cfg.weather || {}, b = cfg.briefing || {};
  const back = h('div', 'ps-back');
  const panel = h('div', 'ps-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  const close = () => back.remove();

  // theme
  let theme = d.theme || 'pro';
  const themes = h('div', 'ps-themes', ...THEMES.map(([id, label, color]) => {
    const t = h('button', 'ps-theme' + (id === theme ? ' on' : ''), h('i'), label);
    t.type = 'button'; t.dataset.theme = id;
    t.querySelector('i').style.background = color;
    t.addEventListener('click', () => { haptic(); theme = id; themes.querySelectorAll('.ps-theme').forEach((x) => x.classList.toggle('on', x.dataset.theme === id)); });
    return t;
  }));

  // weather: the city from Open-Meteo's search
  let place = { city: w.city || '', lat: w.lat, lon: w.lon };
  const cityName = h('b', 'ps-city', place.city || 'не выбран');
  const query = h('input', 'ps-input');
  query.type = 'search'; query.placeholder = 'Найти город…'; query.setAttribute('aria-label', 'Город для погоды');
  const results = h('div', 'ps-results');
  let timer = 0;
  query.addEventListener('input', () => {
    clearTimeout(timer);
    const q = query.value.trim();
    if (q.length < 2) { results.replaceChildren(); return; }
    timer = setTimeout(async () => {
      try {
        const r = await (await safeFetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=ru&format=json`)).json();
        results.replaceChildren(...(r.results || []).map((c) => {
          const label = [c.name, c.admin1, c.country].filter(Boolean).join(', ');
          const o = h('button', 'ps-result', label);
          o.type = 'button';
          o.addEventListener('click', () => { haptic(); place = { city: c.name, lat: c.latitude, lon: c.longitude }; cityName.textContent = c.name; results.replaceChildren(); query.value = ''; });
          return o;
        }));
        if (!r.results?.length) results.replaceChildren(h('div', 'ps-none', 'Ничего не нашлось'));
      } catch (_) { results.replaceChildren(h('div', 'ps-none', 'Нет связи с поиском городов')); }
    }, 350);
  });
  const temp = seg([['c', '°C'], ['f', '°F']], w.tempUnit || 'c');
  const wind = seg([['ms', 'м/с'], ['kmh', 'км/ч'], ['mph', 'миль/ч']], w.windUnit || 'ms');

  // time and date
  const h12 = seg([['false', '24 ч'], ['true', '12 ч'], ['auto', 'Как на телефоне']], String(d.hour12 ?? 'false'));
  const secs = seg([[true, 'Да'], [false, 'Нет']], d.showSeconds !== false);
  const dateFmt = select([['long', 'среда, 18 ноября'], ['full', 'среда, 18 ноября 2026 г.'], ['short', 'ср, 18 нояб.'], ['numeric', '18.11.2026']], d.dateFormat || 'long');
  const zone = select(ZONES, d.timeZone || '');

  // morning briefing
  const brief = seg([[true, 'Включена'], [false, 'Выключена']], b.enabled !== false);
  const tasks = h('textarea', 'ps-tasks');
  tasks.rows = 4; tasks.placeholder = 'Одна задача на строку, например:\nПроверить почту\nСделать зарядку';
  tasks.value = (b.tasks || []).join('\n');

  const save = h('button', 'cc-btn primary', '✓ Сохранить');
  save.type = 'button';
  save.addEventListener('click', async () => {
    haptic();
    save.disabled = true;
    const patch = {
      theme,
      weather: { ...(place.lat != null ? { city: place.city, lat: place.lat, lon: place.lon } : {}), tempUnit: temp.value(), windUnit: wind.value() },
      time: { hour12: h12.value() === 'auto' ? 'auto' : h12.value() === 'true', showSeconds: secs.value(), dateFormat: dateFmt.value, timeZone: zone.value },
      briefing: { enabled: brief.value(), tasks: tasks.value.split('\n').map((x) => x.trim()).filter(Boolean) },
    };
    try {
      await api(`/settings/quick?p=${encodeURIComponent(JSON.stringify(patch))}&version=${encodeURIComponent(cfgVersion ?? '')}`, 'POST', 8000);
      toast('Настройки сохранены', 'ok');
      close();
      await loadConfig();
    } catch (e) {
      const conflict = String(e?.message || '').includes('409');
      toast(conflict ? 'Настройки только что изменились на компьютере — откройте ещё раз' : 'Компьютер не ответил, настройки не сохранены', 'err', '', 4);
      if (conflict) { close(); await loadConfig(); }
    } finally { save.disabled = false; }
  });
  const cancel = h('button', 'cc-btn', 'Отмена');
  cancel.type = 'button';
  cancel.addEventListener('click', close);
  const x = h('button', 'session-close', '✕');
  x.setAttribute('aria-label', 'Закрыть');
  x.addEventListener('click', close);

  panel.append(
    h('div', 'ps-head', h('h2', null, '⚙ Настройки'), x),
    h('div', 'ps-body',
      h('section', null, h('h3', null, '🎨 Тема'), themes),
      h('section', null, h('h3', null, '🌦 Погода'), row('Город', cityName), query, results, row('Температура', temp), row('Ветер', wind)),
      h('section', null, h('h3', null, '🕒 Время и дата'), row('Формат', h12), row('Секунды', secs), row('Дата', dateFmt), row('Часовой пояс', zone)),
      h('section', null, h('h3', null, '☀️ Утренняя сводка'), row('Сводка', brief), h('span', 'ps-label', 'Задачи на утро'), tasks),
      h('p', 'ps-note', 'Остальное — на компьютере: значок DeckBox в трее › Настройки.')),
    h('div', 'ps-foot', save, cancel));
  back.append(panel);
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  back.addEventListener('pointerdown', (e) => e.stopPropagation());
  document.body.append(back);
}
window.openPanelSettings = openPanelSettings;
