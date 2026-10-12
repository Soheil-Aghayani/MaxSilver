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
const analysisJs=fs.readFileSync(path.join(root,'assets','sales-analysis.js'),'utf8');
const shellJs=fs.readFileSync(path.join(root,'assets','site-shell.js'),'utf8');
const portal=fs.readFileSync(path.join(root,'index.html'),'utf8');
const readme=fs.readFileSync(path.join(root,'README.md'),'utf8');
const crownSprite=fs.readFileSync(path.join(root,'assets','branding','maxsilver-crown-animation-sprite.png'));
const ceo=fs.readFileSync(path.join(root,'ceo-dashboard.html'),'utf8');
const roadmap=fs.readFileSync(path.join(root,'sales-process-v1.html'),'utf8');

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

const publishedReports=[
  {file:'sales-customers-1403.xls',kind:'customers',year:1403,records:524,totalColumn:3},
  {file:'sales-customers-1404.xls',kind:'customers',year:1404,records:588,totalColumn:3},
  {file:'sales-customers-1405.xls',kind:'customers',year:1405,records:414,totalColumn:3},
  {file:'sales-products-1403.xls',kind:'products',year:1403,records:664,totalColumn:6},
  {file:'sales-products-1404.xls',kind:'products',year:1404,records:565,totalColumn:6},
  {file:'sales-products-1405.xls',kind:'products',year:1405,records:546,totalColumn:6}
];
for(const report of publishedReports){
  const reportPath=path.join(root,'data','source-reports',report.file);
  assert.ok(fs.existsSync(reportPath),'Missing published source report '+report.file);
  const workbook=XLSX.read(fs.readFileSync(reportPath),{type:'buffer',cellDates:true});
  assert.equal(workbook.SheetNames.length,1,'Unexpected worksheet count in '+report.file);
  const matrix=XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]],{header:1,raw:true,defval:null,blankrows:false});
  const parsed=importer.parseMatrix(matrix,report.file);
  assert.equal(parsed.kind,report.kind,'Wrong source type detected for '+report.file);
  assert.equal(parsed.fileYear,report.year,'Wrong report year detected for '+report.file);
  assert.equal(parsed.records.length,report.records,'Unexpected detail-row count in '+report.file);
  const amountKey=report.kind==='customers'?'amount':'netSales';
  const detailTotal=parsed.records.reduce((sum,row)=>sum+(typeof row[amountKey]==='number'?row[amountKey]:0),0);
  const sourceTotal=[...matrix].reverse().find(row=>row&&row.some(value=>value!==null&&value!==''))[report.totalColumn];
  assert.equal(detailTotal,sourceTotal,'Detail does not reconcile to the source total in '+report.file);
}

const regionMembers=(()=>{const match=ceo.match(/const regionMembers = (\{[\s\S]*?\n    \});/);assert.ok(match,'CEO region map is present');return Function('return ('+match[1]+')')();})();
const provinces=Object.values(regionMembers).flat();
assert.equal(provinces.length,31);
assert.equal(new Set(provinces).size,31,'Every province must belong to exactly one region');
assert.equal(Object.keys(regionMembers).length,6);

for(const required of ['customerFiles','productFiles','transactionFiles','exportCsv','exportXlsx','filterGrid','provinceChart','matrixBrandProvince','matrixModelCustomer','dateFrom','dateTo','transaction-template.csv'])assert.ok((html+analysisJs).includes(required),'Analysis page missing '+required);
for(const required of ['ceo-dashboard.html','sales-analysis.html','sales-process-v1.html','نقشه راه فروش منطقه‌ای','گزارش‌های خام برای همه قابل‌دسترسی‌اند'])assert.ok(portal.includes(required),'Portal page missing '+required);
assert.ok(ceo.includes('assets/site-shell.js'),'CEO dashboard does not have shared navigation');
assert.ok(shellJs.includes("currentFile==='sales-process-v1.html'?'roadmap'"),'Sales roadmap route is not recognized by shared navigation');
assert.ok(shellJs.includes("href:'./sales-process-v1.html',label:'نقشه راه فروش'"),'Shared navigation is missing the sales roadmap');
assert.ok(shellJs.includes("footer.className='ms-site-footer'")&&shellJs.includes('تهیه‌کنندگان: محمود قربانی و سهیل آقایانی'),'Shared footer is missing the requested producer credit');
assert.ok(fs.readFileSync(path.join(root,'assets','site-shell.css'),'utf8').includes('.ms-site-footer{'),'Shared producer footer styles are missing');
assert.ok(roadmap.includes('rel="stylesheet" href="./assets/site-shell.css?v=')&&roadmap.includes('<script src="./assets/site-shell.js?v='),'Sales roadmap does not use versioned shared shell assets');
for(const page of [portal,ceo,html,roadmap])assert.ok(page.includes('assets/site-shell.css?v=')&&page.includes('assets/site-shell.js?v='),'A page is missing cache-busted shared shell assets');
assert.ok(roadmap.includes('نقشه راه فروش منطقه‌ای')&&roadmap.includes('مسیر موازی: توسعه شبکه همکاران'),'Sales roadmap content is incomplete');
assert.ok(roadmap.includes('@media (max-width: 760px)')&&roadmap.includes('grid-template-columns: minmax(0, 1fr)'),'Sales roadmap is missing its mobile layout');
assert.equal(crownSprite.toString('hex',0,8),'89504e470d0a1a0a','Generated crown sprite must be a PNG');
assert.equal(crownSprite[25],6,'Generated crown sprite must preserve its alpha channel');
assert.equal(crownSprite.readUInt32BE(16),crownSprite.readUInt32BE(20),'Crown sprite must use a square 2x2 frame sheet');
assert.ok(portal.includes('class="hero-brand"')&&portal.includes('./assets/branding/maxsilver-logo-source.png'),'Portal hero must use the supplied Max Silver wordmark');
assert.ok(portal.includes('alt="لوگوی مکث‌سیلور"')&&portal.includes('prefers-reduced-motion:reduce'),'Hero logo must be accessible and respect reduced-motion preferences');
assert.ok(!portal.includes('<span class="crown-sprite"></span>'),'Generated crown concept must not appear in the active portal markup');
assert.ok(analysisJs.includes('publishedReports')&&analysisJs.includes('fetch(new URL(report.path,location.href))'),'Analysis page should load the six same-site public source reports');
assert.ok(!/fetch\s*\(\s*['"`]https?:/i.test(analysisJs),'Raw workbook loading must not call an external host');
assert.ok(shellJs.includes('./assets/branding/maxsilver-logo-source.png'),'Shared navigation must use the provided Max Silver logo asset');
assert.ok(fs.existsSync(path.join(root,'assets','branding','maxsilver-logo-source.png')),'The public source logo is missing');
assert.ok(!html.includes('localStorage'),'Uploaded sales data must not be persisted by the page');
assert.ok(readme.includes('تهیه‌کنندگان: محمود قربانی و سهیل آقایانی'),'README is missing the requested producer credit');
for(const [,link] of readme.matchAll(/\]\(([^)]+)\)/g))if(!/^https?:|^#/.test(link))assert.ok(fs.existsSync(path.join(root,link)),'README has a broken local link: '+link);

console.log(JSON.stringify({portal:'ok',publicSourceReports:publishedReports.length,sourceReconciliation:'ok',customerRows:customer.records.length,productRows:products.records.length,transactionRegion:transactions.records[0].region,provinces:provinces.length,regions:Object.keys(regionMembers).length},null,2));
