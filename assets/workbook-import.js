(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MaxSilverWorkbook=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const digitMap={'۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9','٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
  const asciiDigits=value=>String(value==null?'':value).replace(/[۰-۹٠-٩]/g,ch=>digitMap[ch]);
  const norm=value=>asciiDigits(value).replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\u200f\u200e]/g,' ').replace(/[ـ]/g,'').replace(/[\s\u00a0]+/g,' ').trim().toLowerCase();
  const number=value=>{
    if(value===null||value===undefined||value==='')return null;
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    let text=asciiDigits(value).trim().replace(/[٬,\s]/g,'').replace(/٫/g,'.').replace(/[−–]/g,'-');
    if(!text||text==='-'||text==='—')return null;
    const parsed=Number(text);return Number.isFinite(parsed)?parsed:null;
  };
  const yearFrom=value=>{const match=asciiDigits(value).match(/(?:^|\D)(14\d{2})(?:\D|$)/);return match?Number(match[1]):null;};
  const regionByProvince={
    'آذربایجان شرقی':'منطقه ۱','آذربایجان غربی':'منطقه ۱','اردبیل':'منطقه ۱','زنجان':'منطقه ۱','قزوین':'منطقه ۱','کردستان':'منطقه ۱','همدان':'منطقه ۱','کرمانشاه':'منطقه ۱',
    'اصفهان':'منطقه ۲','چهارمحال و بختیاری':'منطقه ۲','مرکزی':'منطقه ۲','لرستان':'منطقه ۲','ایلام':'منطقه ۲','خوزستان':'منطقه ۲','کهگیلویه و بویراحمد':'منطقه ۲','فارس':'منطقه ۲','بوشهر':'منطقه ۲',
    'گیلان':'منطقه ۳','مازندران':'منطقه ۳','گلستان':'منطقه ۳','سمنان':'منطقه ۳','تهران':'منطقه ۴','البرز':'منطقه ۴','قم':'منطقه ۴',
    'خراسان شمالی':'منطقه ۵','خراسان رضوی':'منطقه ۵','خراسان جنوبی':'منطقه ۵','سیستان و بلوچستان':'منطقه ۶','یزد':'منطقه ۶','کرمان':'منطقه ۶','هرمزگان':'منطقه ۶'
  };
  const aliases={
    year:['سال','سال شمسی','year','fiscal year'],date:['تاریخ','تاریخ فروش','تاریخ ثبت','date','sale date'],
    province:['استان','استان فروش','province'],region:['منطقه','منطقه فروش','region'],
    customerId:['شناسه مشتری','کد مشتری','customer id','customer_id','customer code'],customerName:['نام مشتری','مشتری','عنوان مشتری','customer','customer name'],
    customerType:['نوع مشتری','customer type','customer_type'],customerGroup:['گروه مشتری','گروه مشتریان','گروه مشترى','گروه مشتري','customer group','customer_group'],
    channel:['کانال','کانال فروش','channel','sales channel'],brand:['برند','brand'],productCode:['کد کالا','کد محصول','شناسه کالا','product code','product_code','sku'],
    productName:['نام کالا','عنوان کالا','عنوان محصول','شرح کالا','product name','product_name','item name'],model:['مدل','مدل محصول','model','product model'],
    category:['دسته بندی','دسته‌بندی','گروه کالا','طبقه کالا','category','product category'],quantity:['تعداد','مقدار','مقدار اصلی','مقدار-اصلی','quantity','qty'],
    unit:['واحد','واحد اصلی','واحد اندازه گیری','unit','unit of measure'],withdrawalQuantity:['مقدار خروج اصلی','مقدار خروج-اصلی','quantity out','withdrawal quantity'],
    averagePrice:['فی متوسط','فی متوسط ','average price','unit price'],netSales:['مبلغ فروش','مبلغ خالص فروش','خالص فروش','فروش','net sales','sales amount','amount','net_sales'],
    currency:['واحد پول','ارز','currency'],orderId:['شماره سفارش','شناسه سفارش','order id','order_id'],sourceFile:['فایل منبع','source file']
  };
  const aliasLookup=new Map();
  for(const [field,values] of Object.entries(aliases))for(const value of values)aliasLookup.set(norm(value),field);
  function fieldForHeader(value){const key=norm(value);if(aliasLookup.has(key))return aliasLookup.get(key);if(key==='كد'||key==='کد'||key==='code')return 'genericCode';if(key==='عنوان'||key==='نام')return 'genericTitle';return null;}
  function rowToObject(row,columns){const out={};for(const [index,field] of columns)if(field&&row[index]!==undefined)out[field]=row[index];return out;}
  function cleanCode(value){if(value===null||value===undefined)return '';const raw=String(value).trim();return raw.replace(/\.0+$/,'');}
  function isBlank(value){return value===null||value===undefined||String(value).trim()==='';}
  function detectKind(fields){
    const transactionDims=['province','region','customerId','customerType','customerGroup','channel','brand','model','category'];
    if(fields.has('netSales')&&fields.has('productCode')&&transactionDims.some(field=>fields.has(field)))return 'transactions';
    if(fields.has('customerGroup')&&fields.has('netSales'))return 'customers';
    if(fields.has('unit')&&(fields.has('quantity')||fields.has('withdrawalQuantity'))&&fields.has('netSales'))return 'products';
    return 'unknown';
  }
  function parseMatrix(matrix,filename){
    if(!Array.isArray(matrix)||!matrix.length)throw new Error('فایل خالی است یا برگهٔ انتخاب‌شده داده ندارد.');
    const maxHeaderSearch=Math.min(matrix.length,15);let headerIndex=-1,columns=[],bestScore=0;
    for(let r=0;r<maxHeaderSearch;r++){
      const candidate=(matrix[r]||[]).map((value,index)=>[index,fieldForHeader(value)]).filter(([,field])=>field);
      const score=new Set(candidate.map(([,field])=>field)).size;
      if(score>bestScore){bestScore=score;headerIndex=r;columns=candidate;}
    }
    if(headerIndex<0||bestScore<2)throw new Error('ردیف عنوان ستون‌ها تشخیص داده نشد.');
    const fields=new Set(columns.map(([,field])=>field));
    const kind=detectKind(fields);
    if(kind==='unknown')throw new Error('ساختار این فایل با گزارش مشتری، کالا یا طرح تراکنش استاندارد تطبیق ندارد.');
    const fileYear=yearFrom(filename);
    const records=[];let skippedNoCode=0,skippedBlank=0;
    for(let r=headerIndex+1;r<matrix.length;r++){
      const raw=rowToObject(matrix[r]||[],columns);
      if(Object.values(raw).every(isBlank)){skippedBlank++;continue;}
      const code=cleanCode(raw.genericCode??raw.customerId??raw.productCode);
      const title=raw.genericTitle??raw.customerName??raw.productName??'';
      // Summary/total lines in the source reports have no code. Skip them to avoid double counting.
      if(!code){skippedNoCode++;continue;}
      let year=number(raw.year);if(year&&year<10000)year=Math.trunc(year);else year=null;
      if(!year)year=fileYear;
      if(kind!=='transactions'&&!year)throw new Error('سال از ستون داده یا نام فایل پیدا نشد؛ سال شمسی (مثلاً ۱۴۰۴) را در نام فایل بگذارید.');
      const source={file:String(filename||''),sheet:'',row:r+1};
      if(kind==='customers'){
        records.push({kind,year,customerCode:code,customerName:String(title||''),customerGroup:isBlank(raw.customerGroup)?null:String(raw.customerGroup).trim(),province:raw.province?String(raw.province).trim():null,amount:number(raw.netSales),amountUnit:raw.currency?String(raw.currency).trim():null,source});
      }else if(kind==='products'){
        records.push({kind,year,productCode:code,productName:String(title||''),unit:isBlank(raw.unit)?null:String(raw.unit).trim(),quantity:number(raw.quantity),withdrawalQuantity:number(raw.withdrawalQuantity),averagePrice:number(raw.averagePrice),netSales:number(raw.netSales),amountUnit:raw.currency?String(raw.currency).trim():null,source});
      }else{
        const date=raw.date instanceof Date?raw.date.toISOString().slice(0,10):isBlank(raw.date)?null:String(raw.date).trim();
        const transactionYear=year||yearFrom(date);
        const province=isBlank(raw.province)?null:String(raw.province).trim();
        const providedRegion=isBlank(raw.region)?null:String(raw.region).trim();
        records.push({kind,year:transactionYear,date,orderId:isBlank(raw.orderId)?null:String(raw.orderId).trim(),customerId:isBlank(raw.customerId)?null:cleanCode(raw.customerId),customerName:isBlank(raw.customerName)?null:String(raw.customerName).trim(),customerType:isBlank(raw.customerType)?null:String(raw.customerType).trim(),customerGroup:isBlank(raw.customerGroup)?null:String(raw.customerGroup).trim(),channel:isBlank(raw.channel)?null:String(raw.channel).trim(),province,region:providedRegion||regionByProvince[province]||null,regionDerived:!providedRegion&&Boolean(regionByProvince[province]),brand:isBlank(raw.brand)?null:String(raw.brand).trim(),productCode:cleanCode(raw.productCode||raw.genericCode),productName:isBlank(raw.productName)?String(title||''):String(raw.productName).trim(),model:isBlank(raw.model)?null:String(raw.model).trim(),category:isBlank(raw.category)?null:String(raw.category).trim(),quantity:number(raw.quantity),unit:isBlank(raw.unit)?null:String(raw.unit).trim(),netSales:number(raw.netSales),amountUnit:raw.currency?String(raw.currency).trim():null,source});
      }
    }
    if(!records.length)throw new Error('هیچ ردیف دارای کد و اطلاعات قابل استفاده در فایل یافت نشد.');
    return {kind,records,headers:[...fields],headerIndex,skippedNoCode,skippedBlank,fileYear,sheetName:''};
  }
  async function parseFile(file,XLSX){
    if(!XLSX||typeof XLSX.read!=='function')throw new Error('کتابخانهٔ محلی خواندن Excel بارگذاری نشده است.');
    const buffer=await file.arrayBuffer();
    const workbook=XLSX.read(buffer,{type:'array',cellDates:true,codepage:65001});
    if(!workbook.SheetNames||!workbook.SheetNames.length)throw new Error('هیچ برگه‌ای در فایل پیدا نشد.');
    const sheet=workbook.Sheets[workbook.SheetNames[0]];
    const matrix=XLSX.utils.sheet_to_json(sheet,{header:1,raw:true,defval:null,blankrows:false});
    const parsed=parseMatrix(matrix,file.name);
    parsed.sheetName=workbook.SheetNames[0];
    for(const record of parsed.records)record.source.sheet=parsed.sheetName;
    return parsed;
  }
  return {asciiDigits,norm,number,yearFrom,fieldForHeader,parseMatrix,parseFile,regionByProvince};
});
