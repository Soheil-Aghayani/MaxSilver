(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MaxSilverData=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const numeric=(value)=>typeof value==='number'&&Number.isFinite(value)?value:null;
  const amountFor=(row)=>row.kind==='products'?numeric(row.netSales):numeric(row.amount??row.netSales);
  const dims={
    year:{label:'سال',key:'year'},date:{label:'تاریخ',key:'date'},brand:{label:'برند',key:'brand'},model:{label:'مدل',key:'model'},category:{label:'دستهٔ کالا',key:'category'},
    customerType:{label:'نوع مشتری',key:'customerType'},customerGroup:{label:'گروه مشتری',key:'customerGroup'},channel:{label:'کانال فروش',key:'channel'},province:{label:'استان',key:'province'},region:{label:'منطقهٔ فروش',key:'region'},productCode:{label:'کد کالا',key:'productCode'},productName:{label:'عنوان کالا',key:'productName'},customerName:{label:'مشتری',key:'customerName'}
  };
  function uniqueValues(rows,key){return [...new Set(rows.map(row=>row[key]).filter(value=>value!==null&&value!==undefined&&String(value).trim()!==''))].sort((a,b)=>String(a).localeCompare(String(b),'fa'));}
  function filterRows(rows,filters){
    const list=Array.isArray(rows)?rows:[];const from=filters.fromYear?Number(filters.fromYear):null,to=filters.toYear?Number(filters.toYear):null;
    return list.filter(row=>{
      const year=Number(row.year)||null;if((from||to)&&!year)return false;if(from&&year&&year<from)return false;if(to&&year&&year>to)return false;
      const dateFrom=filters.dateFrom||'',dateTo=filters.dateTo||'',date=typeof row.date==='string'&&/^\d{4}-\d{2}-\d{2}/.test(row.date)?row.date.slice(0,10):'';if((dateFrom||dateTo)&&!date)return false;if(dateFrom&&date<dateFrom)return false;if(dateTo&&date>dateTo)return false;
      for(const key of ['brand','model','category','customerType','customerGroup','channel','province','region'])if(filters[key]&&String(row[key]??'')!==String(filters[key]))return false;
      if(filters.search){const needle=String(filters.search).toLocaleLowerCase();const text=[row.customerName,row.customerGroup,row.productName,row.productCode,row.customerCode,row.customerType,row.channel,row.province,row.region,row.brand,row.model,row.category,row.source&&row.source.file].filter(Boolean).join(' ').toLocaleLowerCase();if(!text.includes(needle))return false;}
      return true;
    });
  }
  function totals(rows){
    const list=Array.isArray(rows)?rows:[];let amount=0,hasAmount=false;const quantities=new Map();const customers=new Set();const products=new Set();
    for(const row of list){const value=amountFor(row);if(value!==null){amount+=value;hasAmount=true;}if(row.customerCode||row.customerId)customers.add(String(row.customerCode||row.customerId));if(row.productCode)products.add(String(row.productCode));if(numeric(row.quantity)!==null){const unit=String(row.unit||'واحد نامشخص');quantities.set(unit,(quantities.get(unit)||0)+row.quantity);}}
    return {records:list.length,amount:hasAmount?amount:null,customers:customers.size||null,products:products.size||null,quantities:[...quantities.entries()].map(([unit,value])=>({unit,value}))};
  }
  function sumBy(rows,key){const result=new Map();for(const row of rows){const label=row[key]===null||row[key]===undefined||String(row[key]).trim()===''?'نامشخص':String(row[key]);const amount=amountFor(row);if(amount===null)continue;const current=result.get(label)||{label,amount:0,records:0};current.amount+=amount;current.records++;result.set(label,current);}return [...result.values()].sort((a,b)=>b.amount-a.amount||a.label.localeCompare(b.label,'fa'));}
  function trendByYear(rows){const group=new Map();for(const row of rows){const year=row.year==null?'سال نامشخص':String(row.year);const value=amountFor(row);if(value===null)continue;group.set(year,(group.get(year)||0)+value);}return [...group.entries()].map(([year,amount])=>({year,amount})).sort((a,b)=>String(a.year).localeCompare(String(b.year),'fa'));}
  function trendByPeriod(rows){const dated=rows.some(row=>typeof row.date==='string'&&/^\d{4}-\d{2}-\d{2}/.test(row.date));if(!dated)return trendByYear(rows);const group=new Map();for(const row of rows){const period=typeof row.date==='string'&&/^\d{4}-\d{2}-\d{2}/.test(row.date)?row.date.slice(0,7):null;const value=amountFor(row);if(!period||value===null)continue;group.set(period,(group.get(period)||0)+value);}return [...group.entries()].map(([year,amount])=>({year,amount})).sort((a,b)=>a.year.localeCompare(b.year)).slice(-12);}
  function matrixByYear(rows,key){const years=uniqueValues(rows,'year').map(String).sort();const dimensions=sumBy(rows,key).map(item=>item.label);return {years,rows:dimensions.map(label=>({label,values:years.map(year=>{const matching=rows.filter(row=>String(row.year)===year&&(String(row[key]??'نامشخص')===label)&&amountFor(row)!==null);return matching.length?matching.reduce((sum,row)=>sum+amountFor(row),0):null;})}))};}
  function availableDimensions(rows){const available={};for(const [id,dimension] of Object.entries(dims)){available[id]=rows.some(row=>row[dimension.key]!==null&&row[dimension.key]!==undefined&&String(row[dimension.key]).trim()!=='');}return available;}
  function csvValue(value){const string=String(value==null?'':value);return /[",\r\n]/.test(string)?'"'+string.replace(/"/g,'""')+'"':string;}
  return {dims,amountFor,uniqueValues,filterRows,totals,sumBy,trendByYear,trendByPeriod,matrixByYear,availableDimensions,csvValue};
});
