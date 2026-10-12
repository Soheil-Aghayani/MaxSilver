import fs from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const root=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const importer=require(path.join(root,'assets','workbook-import.js'));
const data=require(path.join(root,'assets','sales-data.js'));
const html=fs.readFileSync(path.join(root,'sales-analysis.html'),'utf8');
const analysisJs=fs.readFileSync(path.join(root,'assets','sales-analysis.js'),'utf8');
const portal=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ceo=fs.readFileSync(path.join(root,'ceo-dashboard.html'),'utf8');

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

const regionMembers=(()=>{const match=ceo.match(/const regionMembers = (\{[\s\S]*?\n    \});/);assert.ok(match,'CEO region map is present');return Function('return ('+match[1]+')')();})();
const provinces=Object.values(regionMembers).flat();
assert.equal(provinces.length,31);
assert.equal(new Set(provinces).size,31,'Every province must belong to exactly one region');
assert.equal(Object.keys(regionMembers).length,6);

for(const required of ['customerFiles','productFiles','transactionFiles','exportCsv','exportXlsx','filterGrid','provinceChart','matrixBrandProvince','matrixModelCustomer','dateFrom','dateTo','transaction-template.csv'])assert.ok((html+analysisJs).includes(required),'Analysis page missing '+required);
for(const required of ['ceo-dashboard.html','sales-analysis.html','ورود محلی'])assert.ok(portal.includes(required),'Portal page missing '+required);
assert.ok(ceo.includes('assets/site-shell.js'),'CEO dashboard does not have shared navigation');
assert.ok(!html.includes('fetch('),'Raw workbooks must not be sent through network fetch');
assert.ok(!html.includes('localStorage'),'Uploaded sales data must not be persisted by the page');

console.log(JSON.stringify({portal:'ok',customerRows:customer.records.length,productRows:products.records.length,transactionRegion:transactions.records[0].region,provinces:provinces.length,regions:Object.keys(regionMembers).length},null,2));
