// «Время и дата» and the weather units (Настройки на ПК › Общие): time zone, date format, °C/°F, wind units.
const { test, expect } = require('@playwright/test');

async function show(page, widgets, extra = {}) {
  await page.addInitScript(([widgets, extra]) => {
    const cfg = { night: { enabled: false }, rules: [], shortcuts: [], pages: [{ id: 'p', title: 'P', icon: '⏰', enabled: true, widgets }], ...extra };
    localStorage.setItem('pb-demo-config', JSON.stringify(cfg));
  }, [widgets, extra]);
  await page.goto('/panel/');
}
const CLOCK = [{ id: 'c', type: 'clock', x: 0, y: 0, w: 12, h: 6, options: { weather: true, date: true, status: false } }];
const FORECAST = { current: { temperature_2m: 71.6, apparent_temperature: 70, weather_code: 0, is_day: 1, wind_speed_10m: 12.4 }, daily: { temperature_2m_max: [75], temperature_2m_min: [60] }, hourly: {} };

test('the clock shows the chosen time zone and date format', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-18T10:05:00Z'));
  await show(page, CLOCK, { display: { timeZone: 'Asia/Yekaterinburg', dateFormat: 'numeric', hour12: false, showSeconds: false } });
  await expect(page.locator('.w .clock')).toContainText('15');
  await expect(page.locator('.w .clock')).toContainText('05');
  await expect(page.locator('.w .date')).toHaveText(/18\/11\/2026|18\.11\.2026/);
});

test('without a time zone the clock follows the phone, and «full» adds the year', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-18T10:05:00Z'));
  await page.emulateMedia({});
  await show(page, CLOCK, { display: { timeZone: '', dateFormat: 'full', hour12: false, showSeconds: false } });
  const local = await page.evaluate(() => String(new Date().getHours()).padStart(2, '0'));
  await expect(page.locator('.w .clock')).toContainText(local);
  await expect(page.locator('.w .date')).toContainText('2026');
});

test('the weather asks for °F and km/h and shows them', async ({ page }) => {
  const asked = [];
  await page.route('https://api.open-meteo.com/**', (r) => { asked.push(r.request().url()); r.fulfill({ json: FORECAST }); });
  await show(page, CLOCK, { weather: { city: 'Тест', lat: 1, lon: 2, tempUnit: 'f', windUnit: 'kmh' } });
  await expect(page.locator('.wx-temp')).toHaveText('72°F');
  await expect(page.locator('.wx-range')).toContainText('12 км/ч');
  expect(asked.some((u) => u.includes('temperature_unit=fahrenheit') && u.includes('wind_speed_unit=kmh'))).toBe(true);
});

test('the default weather is °C and m/s', async ({ page }) => {
  const asked = [];
  await page.route('https://api.open-meteo.com/**', (r) => { asked.push(r.request().url()); r.fulfill({ json: { ...FORECAST, current: { ...FORECAST.current, temperature_2m: 3.2, wind_speed_10m: 4.6 } } }); });
  await show(page, CLOCK, { weather: { city: 'Тест', lat: 1, lon: 2 } });
  await expect(page.locator('.wx-temp')).toHaveText('3°');
  await expect(page.locator('.wx-range')).toContainText('5 м/с');
  expect(asked.every((u) => !u.includes('fahrenheit') && u.includes('wind_speed_unit=ms'))).toBe(true);
});

test('the settings page has «Время и дата» and the weather units, and saves them', async ({ page }) => {
  await page.goto('/settings/#general');
  const card = page.locator('#timeCard');
  await expect(card).toBeVisible();
  await card.locator('#timeZone').selectOption('Asia/Yekaterinburg');
  await card.locator('#dateFormat').selectOption('numeric');
  await page.locator('#tempUnit').selectOption('f');
  await page.locator('#windUnit').selectOption('kmh');
  await expect(page.locator('#timePreview')).toContainText('Сейчас на панели:');
  await expect(page.locator('#timePreview')).toContainText('2026');
  await page.getByRole('button', { name: /Save|Сохранить/ }).first().click();
  await expect.poll(async () => page.evaluate(() => {
    const c = JSON.parse(localStorage.getItem('pb-demo-config') || '{}');
    return [c.display?.timeZone, c.display?.dateFormat, c.weather?.tempUnit, c.weather?.windUnit].join(',');
  })).toBe('Asia/Yekaterinburg,numeric,f,kmh');
});
