// The Russian translator of the panel changes the panel's own words, never your data:
// a song «Hold», a headline ending in «memory», an event «Driver Ed» stay as they are.
const { test, expect } = require('@playwright/test');

test('your own titles and names are not translated, the panel words are', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await page.goto('/panel/');
  await page.waitForFunction(() => window.DeckBoxRuDom);
  const out = await page.evaluate(async () => {
    const box = document.createElement('div');
    box.innerHTML = '<div class="fd-t">Fan the Flames</div><div class="m-title">Hold</div><div class="ag-title">Driver Ed</div>'
      + '<div translate="no">Back in 5 minutes</div><div class="x">Off</div>';
    document.body.append(box);
    await new Promise((r) => setTimeout(r, 300));
    return [...box.children].map((d) => d.textContent);
  });
  expect(out).toEqual(['Fan the Flames', 'Hold', 'Driver Ed', 'Back in 5 minutes', 'Выкл.']);
});
