// End-to-end smoke test: upload synthetic fixture, visit every page, open drill-downs & profile, export PNG/PDF.
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:4173';
const fixture = process.argv[3] || 'fixture.xlsx';
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const log = (...a) => console.log('[smoke]', ...a);

await page.goto(base + '/#/overview');
await page.getByText('No talent dataset loaded').waitFor();
log('empty state ok');
await page.goto(base + '/#/data');
await page.setInputFiles('input[type=file]', fixture);
await page.getByText('Column mapping').first().waitFor({ timeout: 30000 });
const importBtn = page.getByRole('button', { name: /Import \d+ employees/ });
log('import button:', await importBtn.textContent());
log('kpis:', (await page.locator('text=Duplicate IDs').locator('..').textContent()));
await importBtn.click();
await page.getByText('Active dataset').waitFor();
log('imported');

const pages = ['overview', 'calibration', 'matrix', 'succession', 'performance', 'organization', 'movement', 'employees', 'settings', 'data'];
for (const p of pages) {
  await page.goto(base + '/#/' + p);
  await page.waitForTimeout(700);
  const bad = await page.getByText('Something went wrong').count();
  log(p, bad ? 'RENDER ERROR' : 'ok', '| h1:', await page.locator('h1').first().textContent());
  await page.screenshot({ path: `shot-${p}.jpg`, type: 'jpeg', quality: 55, fullPage: false });
}
// Drill-down + profile
await page.goto(base + '/#/overview');
await page.waitForTimeout(500);
await page.getByText('Successor Coverage').click();
await page.locator('[role=dialog] tbody tr').first().click();
await page.getByText('Profile card preview').waitFor();
const [png] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Download PNG/ }).click()]);
log('png download', png.suggestedFilename());
const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Download PDF/ }).click()]);
log('pdf download', pdf.suggestedFilename());
await page.screenshot({ path: 'shot-profile.jpg', type: 'jpeg', quality: 55 });
await page.keyboard.press('Escape');
// Matrix with filter
await page.goto(base + '/#/calibration');
await page.waitForTimeout(500);
await page.locator('select').first().selectOption({ index: 1 });
await page.waitForTimeout(300);
log('filter applied:', await page.getByText(/of \d+ employees/).first().textContent());
// Mobile
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(base + '/#/overview');
await page.waitForTimeout(600);
await page.screenshot({ path: 'shot-mobile.jpg', type: 'jpeg', quality: 55 });
log('errors:', errors.length ? errors : 'none');
await browser.close();
process.exit(errors.length ? 1 : 0);
