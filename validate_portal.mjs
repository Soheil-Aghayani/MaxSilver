import fs from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const root=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const importer=require(path.join(root,'assets','workbook-import.js'));
const data=require(path.join(root,'assets','sales-data.js'));
const XLSX=require(path.join(root,'assets','vendor','xlsx.full.min.js'));
const html=fs.readFileSync(path.join(root,'sales-analysis.html'),'utf8');
const analysisJs=fs.readFileSync(path.join(root,'assets','sales-analysis.2.js'),'utf8');
const shellCss=fs.readFileSync(path.join(root,'assets','site-shell.2.css'),'utf8');
const portal=fs.readFileSync(path.join(root,'index.html'),'utf8');
const readme=fs.readFileSync(path.join(root,'README.md'),'utf8');
const ceo=fs.readFileSync(path.join(root,'ceo-dashboard.html'),'utf8');
const catalogHtml=fs.readFileSync(path.join(root,'product-catalog.html'),'utf8');
const ceoJs=fs.readFileSync(path.join(root,'assets','ceo-dashboard.js'),'utf8');
const roadmap=fs.readFileSync(path.join(root,'sales-process.html'),'utf8');

const customer=importer.parseMatrix([
  ['كد','عنوان','گروه مشتري','فروش'],
  ['C-01','مشتری الف','همکاران',100],
  ['C-02','مشتری ب','پروژه‌ای',0],
  [null,'جمع کل',null,100]
],'فروش ۱۴۰۴.xls');
assert.equal(customer.kind,'customers');
assert.equal(customer.records.length,2,'Blank-code total row must not double count');
assert.equal(customer.skippedNoCode,1);
assert.equal(customer.records[0].year,1404);
assert.equal(customer.records[0].customerName,'مشتری الف');
assert.equal(customer.records[0].customerGroup,'همکاران');
assert.equal(customer.records[1].amount,0,'A recorded zero must remain distinct from a missing amount');
const twoYearCustomers=[...customer.records,{kind:'customers',year:1405,customerCode:'C-03',customerName:'مشتری ج',customerGroup:'پروژه‌ای',amount:40}];

const products=importer.parseMatrix([
  ['كد','عنوان','واحد اصلي','مقدار-اصلي','مقدار خروج-اصلي','في متوسط','خالص فروش','آخرين قيمت خريد'],
  ['P-01','اجاق نمونه','دستگاه',3,-3,500,1500,250],
  [null,'جمع کل',null,3,-3,null,1500,null]
],'كالا ۱۴۰۵.xls');
assert.equal(products.kind,'products');
assert.equal(products.records.length,1);
assert.equal(products.records[0].quantity,3);
assert.equal(products.records[0].netSales,1500);
assert.equal(Object.hasOwn(products.records[0],'lastPurchasePrice'),false,'Purchase-price data must not enter the analytics model');

const transactions=importer.parseMatrix([
  ['date','year','province','customer_id','customer_type','channel','brand','product_code','product_name','model','category','quantity','unit','net_sales','amount_unit'],
  ['2026-03-20',1405,'تهران','C01','رستوران','نماینده','برند نمونه','P01','کالای نمونه','M1','تجهیزات',2,'دستگاه',950,'ریال']
],'transactions.csv');
assert.equal(transactions.kind,'transactions');
assert.equal(transactions.records[0].region,'منطقه ۴');
assert.equal(transactions.records[0].regionDerived,true);
assert.equal(transactions.records[0].province,'تهران');
assert.equal(data.filterRows(transactions.records,{dateFrom:'2026-03-01',dateTo:'2026-03-30'}).length,1);
assert.equal(data.filterRows(transactions.records,{dateFrom:'2026-03-21'}).length,0);
assert.deepEqual(data.trendByPeriod(transactions.records).map(item=>item.year),['2026-03']);

assert.equal(importer.yearFrom('گزارش ۱۴۰۳.xls'),1403);
assert.equal(importer.number('۱٬۲۳۴٫۵'),1234.5);
assert.deepEqual(data.uniqueValues(customer.records,'customerGroup'),['پروژه‌ای','همکاران']);
assert.equal(data.filterRows(customer.records,{fromYear:'1404',toYear:'1404',customerGroup:'همکاران'}).length,1);
assert.equal(data.filterRows(customer.records,{fromYear:'1405',toYear:'1405'}).length,0,'Unknown years must not leak through a selected year range');
assert.equal(data.totals(customer.records).amount,100);
assert.equal(data.totals([{kind:'customers',amount:null}]).amount,null,'Missing amounts must not be treated as zero');
assert.equal(data.matrixByYear(twoYearCustomers,'customerGroup').rows.find(row=>row.label==='همکاران').values[0],100);
assert.equal(data.matrixByYear(twoYearCustomers,'customerGroup').rows.find(row=>row.label==='همکاران').values[1],null,'No row is not a recorded zero');
assert.equal(data.availableDimensions(transactions.records).province,true);

// Private workbooks live in data/local (git-ignored, never published). Reconcile them when present.
const localReports=[
  {file:'sales-customers-1403.xls',kind:'customers',year:1403,records:524,totalColumn:3},
  {file:'sales-customers-1404.xls',kind:'customers',year:1404,records:588,totalColumn:3},
  {file:'sales-customers-1405.xls',kind:'customers',year:1405,records:414,totalColumn:3},
  {file:'sales-products-1403.xls',kind:'products',year:1403,records:664,totalColumn:6},
  {file:'sales-products-1404.xls',kind:'products',year:1404,records:565,totalColumn:6},
  {file:'sales-products-1405.xls',kind:'products',year:1405,records:546,totalColumn:6}
];
let reconciled=0;
for(const report of localReports){
  const reportPath=path.join(root,'data','local',report.file);
  if(!fs.existsSync(reportPath))continue;
  const workbook=XLSX.read(fs.readFileSync(reportPath),{type:'buffer',cellDates:true});
  const matrix=XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]],{header:1,raw:true,defval:null,blankrows:false});
  const parsed=importer.parseMatrix(matrix,report.file);
  assert.equal(parsed.kind,report.kind);assert.equal(parsed.fileYear,report.year);assert.equal(parsed.records.length,report.records);
  const amountKey=report.kind==='customers'?'amount':'netSales';
  const detailTotal=parsed.records.reduce((sum,row)=>sum+(typeof row[amountKey]==='number'?row[amountKey]:0),0);
  const sourceTotal=[...matrix].reverse().find(row=>row&&row.some(value=>value!==null&&value!==''))[report.totalColumn];
  assert.equal(detailTotal,sourceTotal,'Detail does not reconcile to the source total in '+report.file);
  reconciled++;
}
assert.ok(!fs.existsSync(path.join(root,'data','source-reports')),'Raw workbooks must not be part of the published tree');
assert.ok(fs.readFileSync(path.join(root,'.gitignore'),'utf8').includes('/data/local/'),'data/local must stay git-ignored');
const regionMembers=(()=>{const match=ceoJs.match(/const regionMembers = (\{[\s\S]*?\n    \});/);assert.ok(match,'CEO region map is present');return Function('return ('+match[1]+')')();})();
const provinces=Object.values(regionMembers).flat();
assert.equal(provinces.length,31);
assert.equal(new Set(provinces).size,31,'Every province must belong to exactly one region');
assert.equal(Object.keys(regionMembers).length,6);

for(const required of ['customerFiles','productFiles','transactionFiles','exportCsv','exportXlsx','filterGrid','provinceChart','matrixBrandProvince','matrixModelCustomer','dateFrom','dateTo','transaction-template.csv','forgetData'])assert.ok((html+analysisJs).includes(required),'Analysis page missing '+required);
assert.ok(!html.includes('xlsx.full.min.js')&&analysisJs.includes('ensureXlsx'),'SheetJS must be loaded on demand, not with the page');
assert.ok(analysisJs.includes('indexedDB')&&!analysisJs.includes('source-reports'),'Analysis page must use device storage, not published workbooks');
assert.ok(!/fetch\s*\(\s*['"`]https?:/i.test(analysisJs),'Workbook loading must not call an external host');
const pages={ 'index.html':portal, 'ceo-dashboard.html':ceo, 'sales-analysis.html':html, 'product-catalog.html':catalogHtml, 'sales-process.html':roadmap };
const nav=['./index.html','./ceo-dashboard.html','./sales-analysis.html','./product-catalog.html','./sales-process.html'];
for(const [name,page] of Object.entries(pages)){
  assert.ok(page.includes('class="ms-sitebar"')&&page.includes('class="ms-site-footer"'),name+' must carry the shared header and footer in static HTML');
  for(const href of nav)assert.ok(page.includes('href="'+href+'"'),name+' is missing nav link '+href);
  assert.ok(page.includes('aria-current="page"'),name+' does not mark the current page');
  assert.ok(page.includes('id="msShare"')&&page.includes('assets/share.2.js'),name+' must offer the shared QR share button');
  assert.ok(page.includes('assets/site-shell.2.css?v='),name+' must use the cache-busted shared stylesheet');
  assert.ok(page.includes('name="robots" content="noindex'),name+' must not be indexable');
  assert.ok(page.includes('name="description"'),name+' needs a description');
  assert.ok(page.includes('تهیه‌کنندگان: محمود قربانی و سهیل آقایانی'),name+' is missing the producer credit');
  assert.ok(!/<style[ >]/.test(page),name+' should not carry inline <style> blocks');
}
for(const required of ['ceo-dashboard.html','sales-analysis.html','product-catalog.html','sales-process.html'])assert.ok(portal.includes(required),'Portal page missing '+required);
assert.equal((shellCss.match(/@font-face/g)||[]).length,1,'Exactly one Estedad @font-face is allowed');
assert.ok(!/@font-face/.test(fs.readFileSync(path.join(root,'assets','ceo-dashboard.2.css'),'utf8')),'CEO css must not redeclare the font');
assert.ok(shellCss.includes('.ms-site-footer{'),'Shared producer footer styles are missing');
assert.ok(roadmap.includes('نقشهٔ فروش حضوری منطقه‌ای')&&roadmap.includes('نماینده')&&roadmap.includes('مرکز'),'Sales process page content is incomplete');
assert.ok(!/class="pill|show-changes|id="chg"|legend-changes/.test(roadmap),'Review markers must not appear on the sales process page');
assert.ok(portal.includes('class="hero-brand"')&&portal.includes('./assets/branding/maxsilver-logo.svg'),'Portal hero must use the supplied Max Silver wordmark');
assert.ok(portal.includes('alt="لوگوی مکث‌سیلور"'),'Hero logo must be accessible');
assert.ok(fs.existsSync(path.join(root,'assets','branding','maxsilver-logo.svg')),'The logo asset is missing');
assert.ok(!html.includes('localStorage'),'Sales data must not be persisted in localStorage');
assert.ok(readme.includes('تهیه‌کنندگان: محمود قربانی و سهیل آقایانی'),'README is missing the requested producer credit');
for(const [,link] of readme.matchAll(/\]\(([^)]+)\)/g))if(!/^https?:|^#/.test(link))assert.ok(fs.existsSync(path.join(root,link)),'README has a broken local link: '+link);
const catalog=JSON.parse(fs.readFileSync(path.join(root,'assets','catalog.json'),'utf8'));
assert.ok(catalog.items.length>300,'Catalog data is incomplete');
assert.ok(!/price|قیمت/i.test(JSON.stringify(Object.keys(catalog.items[0]))),'Catalog must not carry prices');
assert.ok(catalog.items.every(i=>i.id&&i.name&&i.src),'Every catalog item needs id, name and source');
assert.equal(new Set(catalog.items.map(i=>i.id)).size,catalog.items.length,'Catalog ids must be unique');
const referenced=new Set();
for(const file of ['index.html','ceo-dashboard.html','sales-analysis.html','product-catalog.html','assets/catalog.css','assets/catalog.js','brand-books.html','assets/brand-books.css','assets/brand-books.js','panel.html','assets/panel.css','assets/panel.js','assets/area-data.js','assets/proforma-math.js','assets/sync.js','assets/firebase-config.js','sales-process.html','service-worker.js','assets/ceo-dashboard.js','assets/sales-analysis.2.js','assets/share.2.js','assets/sales-process.2.js','assets/site-shell.2.css','assets/home.2.css','assets/ceo-dashboard.2.css','assets/sales-analysis.2.css','assets/sales-process.2.css','manifest.webmanifest'])for(const [,ref] of fs.readFileSync(path.join(root,file),'utf8').matchAll(/(?:\.\/)?((?:assets|data)\/[A-Za-z0-9_./-]+\.[a-z0-9]+)/g))referenced.add(ref);
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const orphans=walk(path.join(root,'assets')).map(f=>path.relative(root,f).replaceAll('\\','/')).filter(f=>!referenced.has(f));
assert.deepEqual(orphans,[],'Unreferenced files in assets/: '+orphans.join(', '));
const panelJs=fs.readFileSync(path.join(root,'assets','panel.js'),'utf8');
const panelRegions=(()=>{const match=panelJs.match(/var REGIONS = (\{[\s\S]*?\n  \});/);assert.ok(match,'Panel region map is present');return Function('return ('+match[1]+')')();})();
assert.deepEqual(panelRegions,regionMembers,'panel.js regions must match the CEO dashboard regions');
const areaData=(()=>{const box={};Function('window',fs.readFileSync(path.join(root,'assets','area-data.js'),'utf8'))(box);return box.MS_AREA;})();
const ceoRows=(()=>{const line=ceoJs.split(/\r?\n/).find(l=>l.trimStart().startsWith('const sourceRows ='));return Function('return '+line.replace(/^\s*const sourceRows =\s*/,'').replace(/;\s*$/,''))();})();
assert.deepEqual(areaData.rows,ceoRows,'assets/area-data.js is stale; run node tools/build_area_data.mjs');
assert.ok(fs.existsSync(path.join(root,'assets','iran-map.svg')),'The province map file is missing');
console.log(JSON.stringify({portal:'ok',privateReportsReconciled:reconciled,sourceReconciliation:'ok',customerRows:customer.records.length,productRows:products.records.length,transactionRegion:transactions.records[0].region,provinces:provinces.length,regions:Object.keys(regionMembers).length},null,2));
