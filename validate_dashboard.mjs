import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { Script, runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';

const htmlPath = new URL('./ceo-dashboard.html', import.meta.url);
// The page is split into html + css + js files; the checks below read them as one document.
const readAsset = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const shareJs = readAsset('./assets/share.js');
const html = readAsset('./ceo-dashboard.html') + '\n<style>' + readAsset('./assets/ceo-dashboard.css') + '</style>\n<script>' + readAsset('./assets/ceo-dashboard.js') + '</script>';
const rowsMatch = html.match(/const sourceRows = (\[.*?\]);/s);
assert.ok(rowsMatch, 'sourceRows block not found');

const rows = JSON.parse(rowsMatch[1]);
const readObjectLiteral = (name) => {
  const pattern = new RegExp('const ' + name + ' = (\\{[\\s\\S]*?\\n    \\});');
  const match = html.match(pattern);
  assert.ok(match, name + ' block not found');
  return JSON.parse(JSON.stringify(runInNewContext('(' + match[1] + ')')));
};
const regionMembers = readObjectLiteral('regionMembers');
const regionMeta = readObjectLiteral('regionMeta');
const provincesMatch = html.match(/const provinceNames = (\[.*?\]);/s);
assert.ok(provincesMatch, 'provinceNames block not found');
const provinceNames = JSON.parse(provincesMatch[1]);
const years = [1403, 1404, 1405];
const valueFor = (province, year) => rows.find((row) => row.province === province && row.year === year)?.sales ?? null;

const requiredTokens = [
  'year-button', 'map-label', 'map-name', 'no-activity', 'activityStatusFor',
  'getBBox', 'viewBox', 'preserveAspectRatio', 'Estedad', 'Segoe UI', 'selectProvinceFromMap',
  'بدون مقایسه', 'provinceTrend', 'provincePopup', 'mapViewport', 'zoomIn',
  'topRankList', 'میلیارد تومان', 'let mapYear = years.includes(requestedYear) ? requestedYear : 1405', 'overallTotal', 'regionAverageGrid',
  'میانگین فروش دورهٔ سه‌سالهٔ هر منطقه', 'منطقه‌بندی شش‌گانه',
  'map-active-banner', 'map-active-title', 'map-active-name', 'map-active-unit',
  'map-side-head', 'map-side-tools', 'mapGuidePanel', 'openMapGuide', 'closeMapGuide', 'showModal()', 'select-trigger', 'select-popover', 'select-options',
  'MaxSilverEstedadFontBase64', 'embeddedFontStyle',
  'exportActiveLayer', 'handleActiveLayerExport', 'accordion-card',
  'mobile-dashboard-nav', 'dashboard-slides', 'mobileDashboardPanels', 'scroll-snap-type',
  '--font-persian:', '--font-latin:', '--muted: #475467',
];
const missing = requiredTokens.filter((token) => !html.includes(token));
assert.deepEqual(missing, [], 'Missing dashboard tokens: ' + missing.join(', '));
assert.ok(!html.includes('Vazirmatn'), 'Old remote font reference remains');
assert.ok(!html.includes('NovinNeue'), 'The requested Estedad font should replace NovinNeue');
assert.ok(!html.includes('FontAwesome'), 'Icon glyph font should be replaced by the supplied inline SVG icons');
assert.ok(!html.includes('fonts.googleapis.com'), 'Dashboard must not require Google Fonts');
assert.ok(!html.includes('mapModeHint'), 'Redundant map hint should be removed');
assert.ok(!html.includes('شش منطقه · مراکز منطقه‌ای با نشان زرد'), 'Redundant regional descriptor should be removed');
assert.ok(!html.includes('<div class="footer">'), 'The visible source and proposed-brand footer should be removed');
assert.ok(!html.includes('Brand Book v0.1'), 'The provisional Brand Book footer label should be removed');
for (const removedCopy of [
  'source-note', 'راهنمای برند', 'فرایند فروش', 'نمای ۲۰ ثانیه‌ای از فروش',
  'PNG مناسب ارائه', 'SVG مناسب چاپ و ویرایش', 'دانلود لایه</h4>',
  'سال‌های نمایشی', 'تغییر فروش ۱۴۰۳ تا ۱۴۰۵', 'period-badge', 'change-line',
  'data-export-layer', 'exportActiveSvg', 'region-center-province', 'id="strategyLegend"',
  'map-legend-details', 'regionCodeFor'
]) {
  assert.ok(!html.includes(removedCopy), 'Requested redundant UI remains: ' + removedCopy);
}
const totalMetricCard = html.match(/<div class="metric-card"><small>جمع فروش سه‌ساله کشور<\/small>[\s\S]*?<\/div>/);
assert.ok(totalMetricCard, 'National three-year sales metric is missing');
assert.doesNotMatch(totalMetricCard[0], /مجموع سال‌های ۱۴۰۳ تا ۱۴۰۵/, 'Removed national total period label returned');
assert.doesNotMatch(totalMetricCard[0], /<em>/, 'Removed national total subtitle returned');
assert.doesNotMatch(totalMetricCard[0], /<em>[^<]*میلیارد تومان/ , 'Duplicate sales unit remains in national total');
assert.ok(!html.includes('<section class="action-strip"'), 'Screenshot action-summary cards should be removed');
for (const removedDashboardCopy of [
  'action-card', 'action-strip', 'highOpportunityCount', 'recoveryCount', 'maintainCount', 'uncoveredCount',
  'کلیک روی استان = جزئیات سریع', 'میانگین سه جمع سالانهٔ ثبت‌شده', 'region-unit', 'region-coverage'
]) {
  assert.ok(!html.includes(removedDashboardCopy), 'Requested dashboard content remains: ' + removedDashboardCopy);
}
assert.match(html, /id="exportActiveLayer"[^>]*aria-label="دانلود لایه فعال"/);
assert.match(html, /id="openMapGuide"[^>]*aria-haspopup="dialog"[^>]*aria-controls="mapGuidePanel"[^>]*aria-expanded="false"/);
assert.match(html, /<dialog class="map-side" id="mapGuidePanel"[^>]*aria-labelledby="mapGuideHeading"/);
assert.ok(html.includes("mapGuidePanel.addEventListener('close'"), 'The map edge panel should restore its accessible expanded state when dismissed');
assert.ok(html.includes('height: clamp(560px, 88vh, 920px)'), 'The desktop map should use the space freed by the edge panel');
assert.ok(!html.includes('grid-template-columns: minmax(0, 1fr) 238px'), 'A permanent map sidebar should not constrain the map width');
const resetButton = html.match(/<button id="resetMap"[^>]*>([\s\S]*?)<\/button>/);
assert.ok(resetButton, 'Map reset control is missing');
assert.match(resetButton[0], /aria-label="بازنشانی نقشه"/);
assert.match(resetButton[1], /^\s*<svg\b/, 'Map reset control should be icon-only');
assert.doesNotMatch(resetButton[1], /بازنشانی/, 'Visible reset text should be removed');
assert.ok(html.includes('id="msShare"') && html.includes('aria-haspopup="dialog"'), 'The shared share button must open an accessible dialog');
assert.ok(shareJs.includes("url.protocol !== 'https:'"), 'QR generation must require HTTPS');
assert.ok(shareJs.includes("url.search = ''") && shareJs.includes("url.hash = ''"), 'Share URLs must not carry query strings or fragments');
assert.ok(shareJs.includes("qrcode(0, 'M')") && shareJs.includes("code.addData(url, 'Byte')"), 'The QR generator must encode the live page URL');
assert.ok(shareJs.includes("ctx.fillStyle = '#051934'") && shareJs.includes('ms-share-frame') && shareJs.includes('ms-share-note'), 'The branded QR frame and access-control note are missing');
assert.ok(html.includes("mapLegendEl.innerHTML = mapMetric === 'sales'"), 'Map legend should be rebuilt from the active layer');
assert.ok(html.includes('yearColors[mapYear]') && html.includes('faYear(mapYear)'), 'Sales legend should match the selected year');
assert.ok(html.includes("Object.keys(regionMeta).map((region)"), 'Region legend should derive from active region metadata');
for (const activeLayerLabel of ['توسعه بازار', 'احیای فروش', 'حفظ و توسعه', 'بدون فروش ثبت‌شده', 'ظرفیت بازار · شدت رنگ = امتیاز', 'نفوذ شبکه · شدت رنگ = امتیاز']) {
  assert.ok(html.includes(activeLayerLabel), 'Active-layer legend label is missing: ' + activeLayerLabel);
}
assert.ok(html.includes('استان مقایسه') && html.includes('influence-legend-line'), 'Selection and network legend symbols should be explained');
assert.match(html, /if \(mapMetric === 'regions'\) return '';/, 'Region map labels should omit region number suffixes');
assert.match(html, /if \(valueText\) \{[\s\S]*?label\.appendChild\(valueTspan\);/, 'Province labels should omit empty secondary values');
assert.ok(!html.includes("'ر' + regionFor"), 'Visible map label should not synthesize R-plus-region-number text');
assert.match(html, /await exportMapPng\(metric, year\)/, 'Export must use the currently active layer and year');
assert.match(html, /const metric = mapMetric;\s*const year = mapYear;/, 'Active layer export must not force a different layer');
assert.match(html, /<details class="strategy-card accordion-card" id="strategyCard"/);
assert.match(html, /<details class="influence-card accordion-card">[\s\S]*?نفوذ شبکه/);
for (const removedCenterDetail of ['regionCenters', 'centerLabel', 'region-center-hatch', 'centerHatchPattern', 'region-center-label', 'مرکز: ']) {
  assert.ok(!html.includes(removedCenterDetail), 'Removed regional center/hatch detail remains: ' + removedCenterDetail);
}
assert.ok(html.includes("'منطقه ۴': { short: 'تهران، البرز و قم', color: '#FFCC2A' }"), 'Region 4 must use the requested yellow brand accent');
assert.ok(html.includes("@font-face{font-family:'Estedad';src:url(data:font/ttf;base64,"), 'Exported map SVG must embed Estedad so PNG output keeps the page font');
assert.ok(html.includes("select.setAttribute('aria-hidden', 'true')") && html.includes("trigger.setAttribute('role', 'combobox')"), 'Visible dropdowns should use the Estedad-styled accessible custom controls');
assert.ok(
  html.indexOf('<div class="map-active-banner"') < html.indexOf('<div id="mapViewport"'),
  'Active layer title must appear above the map viewport'
);

const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
assert.ok(styleMatch, 'Dashboard stylesheet not found');
const stylesheet = styleMatch[1];
assert.match(stylesheet, /\.region-average-card \.region-name \{[^}]*font-size:\s*14px/, 'Regional card labels should be compact');
assert.match(stylesheet, /\.region-average-card strong \{[^}]*font-size:\s*19px/, 'Regional average figures should be compact');
assert.match(stylesheet, /\.dot\.no-activity \{ background: #FEE4E2; border: 1px solid var\(--no-activity\); \}/, 'No-record legend swatch should match the map fill');
const subMinimumTextSizes = [...stylesheet.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)]
  .map((match) => ({ size: Number(match[1]), before: stylesheet.slice(Math.max(0, match.index - 100), match.index) }))
  .filter(({ size }) => size < 12);
assert.ok(
  subMinimumTextSizes.every(({ size }) => size >= 11),
  'Compact responsive microcopy and SVG map labels must remain at least 11px'
);
const phoneStylesStart = stylesheet.indexOf('@media (max-width: 560px) {');
const phoneStylesEnd = stylesheet.indexOf('#provinceDetailsSlide { container-type', phoneStylesStart);
assert.ok(phoneStylesStart >= 0 && phoneStylesEnd > phoneStylesStart, 'Phone-specific layout rules are missing');
const phoneStyles = stylesheet.slice(phoneStylesStart, phoneStylesEnd);
const phoneFontSizes = [...phoneStyles.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((match) => Number(match[1]));
assert.ok(phoneFontSizes.every((size) => size >= 12), 'Phone layout text must stay at least 12px for legibility');
assert.ok(phoneStyles.includes('scroll-snap-type: x mandatory'), 'Phone summary strips should use native swipe and snap');
assert.ok(phoneStyles.includes('flex: 0 0 100%'), 'Phone map and province details should use swipeable full-width panels');
assert.ok(html.includes('dashboardSlides.scrollTo('), 'Slide tabs should not force extra vertical page scrolling');
assert.ok(html.includes('Math.max(7, Math.min(12 * (placement?.fontScale || 1)'), 'Map labels should use the enlarged, collision-conscious scale');
assert.ok(html.includes('.year-button:disabled { cursor: default; color: var(--muted); background: #EAECF0 !important;'), 'Disabled year controls should retain readable contrast');

const luminance = (hex) => {
  const channels = hex.slice(1).match(/../g).map((channel) => parseInt(channel, 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};
const contrastRatio = (foreground, background) => {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
const contrastPairs = [
  ['#475467', '#FFFFFF'], ['#475467', '#F8F9FC'], ['#D0D5DD', '#051934'],
  ['#FFFFFF', '#1D4ED8'], ['#FFFFFF', '#B54708'], ['#FFFFFF', '#15803D'],
  ['#051934', '#FFCC2A']
];
for (const [foreground, background] of contrastPairs) {
  assert.ok(contrastRatio(foreground, background) >= 4.5, 'Insufficient text contrast: ' + foreground + ' on ' + background);
}
for (const staleLabel of ['منطقه‌بندی هفت‌گانه', 'منطقه ۷', 'هفت محدوده', 'استان مستقل', 'فروشنده آزاد']) {
  assert.ok(!html.includes(staleLabel), 'Stale regional label remains: ' + staleLabel);
}

const stalePalette = ['#2F80ED', '#2F9E73', '#7B61A8', '#c9414d', '#f7d9dc'];
const stale = stalePalette.filter((token) => html.includes(token));
assert.deepEqual(stale, [], 'Stale palette tokens found: ' + stale.join(', '));

const expectedRegions = {
  'منطقه ۱': ['آذربایجان شرقی','آذربایجان غربی','اردبیل','زنجان','قزوین','کردستان','همدان','کرمانشاه'],
  'منطقه ۲': ['اصفهان','چهارمحال و بختیاری','مرکزی','لرستان','ایلام','خوزستان','کهگیلویه و بویراحمد','فارس','بوشهر'],
  'منطقه ۳': ['گیلان','مازندران','گلستان','سمنان'],
  'منطقه ۴': ['تهران','البرز','قم'],
  'منطقه ۵': ['خراسان شمالی','خراسان رضوی','خراسان جنوبی'],
  'منطقه ۶': ['سیستان و بلوچستان','یزد','کرمان','هرمزگان']
};
assert.deepEqual(regionMembers, expectedRegions, 'Region assignments differ from the approved six-region map');
assert.equal(provinceNames.length, 31, 'Expected 31 provinces in the dashboard map');
assert.equal(new Set(provinceNames).size, 31, 'Province list contains duplicates');
const assignedProvinces = Object.values(regionMembers).flat();
assert.equal(assignedProvinces.length, 31, 'Every province must have exactly one region');
assert.equal(new Set(assignedProvinces).size, 31, 'A province is assigned to multiple regions');
assert.deepEqual(assignedProvinces.slice().sort(), provinceNames.slice().sort(), 'A province is missing or unknown in region assignments');

assert.ok(Object.values(regionMeta).every((meta) => !Object.hasOwn(meta, 'center') && !Object.hasOwn(meta, 'centerLabel')), 'Regional centers must not be imposed on the map');
assert.equal(regionMeta['منطقه ۴'].color, '#FFCC2A', 'Region 4 color must be yellow');
assert.ok(Object.values(regionMeta).every((meta) => !Object.prototype.hasOwnProperty.call(meta, 'seller')), 'Representative labels should not be present yet');

const expectedSummary = {
  'منطقه ۱': { mean: 12.8236, observed: 12, expected: 24 },
  'منطقه ۲': { mean: 37.0605, observed: 11, expected: 27 },
  'منطقه ۳': { mean: 31.7097, observed: 9, expected: 12 },
  'منطقه ۴': { mean: 120.7677, observed: 6, expected: 9 },
  'منطقه ۵': { mean: 32.0969, observed: 3, expected: 9 },
  'منطقه ۶': { mean: 38.5477, observed: 11, expected: 12 }
};
const regionalSummary = Object.entries(regionMembers).map(([region, members]) => {
  const annualTotals = years.map((year) => {
    const recorded = members.map((province) => valueFor(province, year)).filter((value) => value !== null);
    return recorded.length ? recorded.reduce((sum, value) => sum + value, 0) : null;
  });
  assert.ok(annualTotals.every((total) => total !== null), region + ' cannot claim a three-year mean without a recorded subtotal in each year');
  const observed = members.reduce((count, province) => count + years.filter((year) => valueFor(province, year) !== null).length, 0);
  const mean = annualTotals.reduce((sum, total) => sum + total, 0) / years.length;
  const expected = members.length * years.length;
  const approved = expectedSummary[region];
  assert.ok(mean !== null && Math.abs(mean - approved.mean) < 0.00005, region + ' recorded-sales mean changed');
  assert.equal(observed, approved.observed, region + ' coverage changed');
  assert.equal(expected, approved.expected, region + ' expected coverage changed');
  return { region, mean: Number(mean.toFixed(4)), coverage: observed + '/' + expected, annualTotals: annualTotals.map((total) => Number(total.toFixed(4))) };
});

const rowKeys = rows.map((row) => row.province + '|' + row.year);
assert.equal(new Set(rowKeys).size, rows.length, 'Sales source contains duplicate province-year rows');
const fontDir = path.join(path.dirname(fileURLToPath(htmlPath)), 'assets', 'fonts');
const fontPath = path.join(fontDir, 'Estedad-VF.ttf');
assert.ok(fs.existsSync(fontPath), 'Missing bundled Estedad font');
assert.equal(fs.readFileSync(fontPath).subarray(0, 4).toString('hex'), '00010000', 'Invalid TrueType font asset');
const fontLicense = fs.readFileSync(new URL('./LICENSES.md', import.meta.url), 'utf8');
assert.ok(fontLicense.includes('SIL OPEN FONT LICENSE'), 'Estedad font license should be bundled locally');
const vendorDir = path.join(path.dirname(fileURLToPath(htmlPath)), 'assets', 'vendor');
const qrLibrary = fs.readFileSync(path.join(vendorDir, 'qrcode-generator-1.4.4.js'), 'utf8');
const qrLicense = fs.readFileSync(new URL('./LICENSES.md', import.meta.url), 'utf8');
assert.ok(qrLibrary.includes('Kazuhiko Arase') && qrLibrary.includes('Licensed under the MIT license'), 'QR library attribution is missing');
assert.ok(qrLicense.includes('MIT License') && qrLicense.includes('Copyright (c) 2009 Kazuhiko Arase'), 'QR library license text is missing');
const qrContext = {};
runInNewContext(qrLibrary, qrContext);
const qrSmokeTest = qrContext.qrcode(0, 'M');
qrSmokeTest.addData('https://example.com/maxsilver/dashboard', 'Byte');
qrSmokeTest.make();
assert.ok(qrSmokeTest.getModuleCount() >= 21 && qrSmokeTest.isDark(0, 0), 'Bundled QR library failed to generate a QR matrix');
assert.ok(!fs.existsSync(path.join(fontDir, 'Estedad-export-font.js')), 'The duplicate base64 export font must not be shipped; the export reads the cached TTF');
assert.ok(html.includes('async function ensureExportFont()') && html.includes('await ensureExportFont();'), 'Map export must load the font on demand');
const faYearMatch = html.match(/const faYear = \(year\) => ([^;]+);/);
assert.ok(faYearMatch, 'Year formatter is missing');
const faYear = runInNewContext('(year) => ' + faYearMatch[1]);
assert.equal(faYear(1405), '۱۴۰۵', 'Calendar years must not be grouped as large numbers');
const yearColorsMatch = html.match(/const yearColors = (\{[^\n]+\});/);
assert.ok(yearColorsMatch, 'Sales-year color mapping is missing');
const yearColors = JSON.parse(yearColorsMatch[1]);
const mapLegendExpression = html.match(/mapLegendEl\.innerHTML = ([\s\S]*?);\s*const rankItem/);
assert.ok(mapLegendExpression, 'Dynamic map legend renderer is missing');
const renderLegend = runInNewContext(
  '((mapMetric,mapYear,regionMeta,yearColors,faYear)=>{' +
  'const selectedLegend = \'<span><i class="outline selected"></i> استان منتخب</span>\';' +
  'const compareLegend = \'<span><i class="outline compare"></i> استان مقایسه</span>\';' +
  'return (' + mapLegendExpression[1] + ');})'
);
const salesLegend = renderLegend('sales', 1404, regionMeta, yearColors, faYear);
assert.ok(salesLegend.includes('فروش ۱۴۰۴') && !salesLegend.includes('۱۴۰۳') && !salesLegend.includes('۱۴۰۵'), 'Sales legend must show only the selected year');
assert.ok(salesLegend.includes('بدون رکورد') && salesLegend.includes('استان مقایسه'), 'Sales legend must explain missing data and map outlines');
const regionsLegend = renderLegend('regions', 1405, regionMeta, yearColors, faYear);
for (const region of Object.keys(regionMeta)) assert.ok(regionsLegend.includes(region), 'Regional legend is missing ' + region);
assert.ok(!regionsLegend.includes('مرکز منطقه') && !regionsLegend.includes('حفظ و توسعه'), 'Regional legend must not mix in center or action-layer symbols');
const actionLegend = renderLegend('action', 1405, regionMeta, yearColors, faYear);
for (const label of ['توسعه بازار', 'احیای فروش', 'حفظ و توسعه', 'بدون فروش ثبت‌شده']) assert.ok(actionLegend.includes(label), 'Action legend is missing ' + label);
assert.ok(!actionLegend.includes('منطقه ۱'), 'Action legend must not show region colors');
const potentialLegend = renderLegend('potential', 1405, regionMeta, yearColors, faYear);
assert.ok(potentialLegend.includes('ظرفیت بازار') && !potentialLegend.includes('توسعه بازار'), 'Potential legend must describe only the potential layer');
const influenceLegend = renderLegend('influence', 1405, regionMeta, yearColors, faYear);
assert.ok(influenceLegend.includes('نفوذ شبکه') && influenceLegend.includes('ارتباط شبکه'), 'Influence legend must identify the network layer');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, 'Inline dashboard script not found');
new Script(scriptMatch[1]);

console.log(JSON.stringify({
  bytes: Buffer.byteLength(html, 'utf8'),
  sourceRows: rows.length,
  regions: regionalSummary,
  tehranBillionsToman: {
    1403: valueFor('تهران', 1403),
    1404: valueFor('تهران', 1404),
    1405: valueFor('تهران', 1405)
  },
  brandColors: ['#051934', '#1D4ED8', '#B54708', '#FFCC2A', '#15803D', '#B42318'].map((color) => ({ color, present: html.includes(color) })),
  interactiveFeatures: {
    mapLabels: html.includes('labelsLayer') && html.includes('nameTspan'),
    accessibleMapEdgePanel: html.includes('mapGuidePanel.showModal()') && html.includes('mapGuidePanel.close()') && html.includes('aria-expanded'),
    popup: html.includes('renderPopup') && html.includes('popupChart'),
    boundedPan: html.includes('clampPan') && html.includes('pointermove'),
    exports: html.includes('exportMapPng') && html.includes('handleActiveLayerExport') && html.includes('const metric = mapMetric;') && html.includes('const year = mapYear;'),
    dynamicMapLegend: Boolean(mapLegendExpression) && ['sales','regions','action','potential','influence'].every((metric) => typeof renderLegend(metric, 1405, regionMeta, yearColors, faYear) === 'string'),
    resetIconOnly: Boolean(resetButton && /<svg\b/.test(resetButton[1]) && !/بازنشانی/.test(resetButton[1])),
    regionSuffixRemoved: html.includes("if (mapMetric === 'regions') return '';") && !html.includes('regionCodeFor'),
    comparison: html.includes('comparisonProvince') && html.includes('بدون مقایسه'),
    accordions: html.includes('id="strategyCard"') && html.includes('نفوذ شبکه') && html.includes('accordion-card'),
    centerHatchingRemoved: !html.includes('region-center-hatch') && !html.includes('centerHatchPattern'),
    customEstedadMenus: html.includes('select-popover') && html.includes('font-family: var(--font-persian) !important'),
    embeddedExportFont: html.includes('embeddedFontStyle') && html.includes('ensureExportFont'),
    brandedQrSharing: shareJs.includes("url.protocol !== 'https:'") && shareJs.includes("ctx.fillStyle = '#051934'") && qrSmokeTest.getModuleCount() >= 21
  }
}, null, 2));
