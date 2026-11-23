const { test } = require('@playwright/test');
const fs = require('fs');
test('scan', async ({ page }) => {
  test.setTimeout(600000);
  await page.setViewportSize({ width: 780, height: 360 });
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await page.goto('/panel/');
  await page.waitForTimeout(3000);
  const n = await page.locator('#dots > *').count();
  const out = [];
  for (let i = 0; i < 60; i++) {
    const title = await page.evaluate(() => document.querySelector('.page.cur, .page.active, .page:not([hidden])')?.dataset?.title || location.hash);
    const found = await page.evaluate(() => {
      const res = [];
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.left < innerWidth && r.right > 0; };
      for (const w of document.querySelectorAll('.w')) {
        if (!vis(w)) continue;
        const wr = w.getBoundingClientRect();
        const type = w.dataset.type || w.className;
        // text that sticks out of the widget's box
        for (const el of w.querySelectorAll('*')) {
          if (!el.childNodes.length || ![...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          if (r.bottom > wr.bottom + 2 || r.right > wr.right + 2) {
            // only if not inside a scrolling list
            let p = el.parentElement, scroll = false;
            while (p && p !== w) { const o = getComputedStyle(p).overflowY; if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) { scroll = true; break; } p = p.parentElement; }
            if (!scroll) { res.push(`${type}: «${el.textContent.trim().slice(0, 40)}» вылезает ${Math.round(Math.max(r.bottom - wr.bottom, r.right - wr.right))}px`); break; }
          }
        }
      }
      return res;
    });
    const name = await page.evaluate(() => [...document.querySelectorAll('#dots > *')].findIndex((d) => d.classList.contains('on') || d.classList.contains('cur') || d.getAttribute('aria-current')));
    if (found.length) out.push(`страница ${name}: ` + found.join(' | '));
    await page.screenshot({ path: `/tmp/scan/p${String(i).padStart(2, '0')}.png` });
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(700);
    if (i >= n - 1) break;
  }
  fs.writeFileSync('/tmp/scan/report.txt', out.join('\n') + `\n(страниц: ${n})\n`);
});
