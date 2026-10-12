(function(){
  'use strict';
  const importer=window.MaxSilverWorkbook,data=window.MaxSilverData,XLSX=window.XLSX;
  const state={rows:{customers:[],products:[],transactions:[]},active:'customers',filters:{},unit:{customers:'unknown',products:'unknown',transactions:'unknown'},search:'',page:0,sort:{key:'year',direction:'desc'},urlContext:{province:'',year:''},contextYearApplied:false,contextProvinceApplied:false};
  const pageStatus=document.getElementById('pageStatus');
  const statusText=(message,error)=>{pageStatus.textContent=message||'';pageStatus.classList.toggle('is-visible',Boolean(message));pageStatus.style.color=error?'#a12b20':'';};
  const fmtInt=value=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:0}).format(value);
  const fmtDecimal=value=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(value);
  const fmtYear=value=>new Intl.NumberFormat('fa-IR',{useGrouping:false,maximumFractionDigits:0}).format(Number(value));
  const amountLabel=()=>state.unit[state.active]==='unknown'?'واحد مبلغ نامشخص':state.unit[state.active]==='rial'?'ریال (برچسب انتخابی)':state.unit[state.active]==='toman'?'تومان (برچسب انتخابی)':'واحد انتخاب‌شده';
  const amountRaw=row=>data.amountFor(row);
  const loadedRows=()=>state.rows[state.active]||[];
  const text=value=>value===null||value===undefined||String(value).trim()===''?'—':String(value);
  const escHtml=value=>String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const setDataset=kind=>{if(!state.rows[kind].length)return;state.active=kind;state.filters={};state.page=0;state.search='';state.contextYearApplied=false;state.contextProvinceApplied=false;document.getElementById('tableSearch').value='';document.getElementById('amountUnit').value=state.unit[kind];document.querySelectorAll('.dataset-option').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.dataset===kind)));renderAll();};
  const yearInName=filename=>importer.yearFrom(filename);
  function parseContext(){const params=new URLSearchParams(location.search);state.urlContext.province=params.get('province')||'';state.urlContext.year=yearInName(params.get('year')||'')||'';}
  function createFilterField(label,key,options,disabled,hint,kind='select'){
    const wrap=document.createElement('div');wrap.className='filter-field';
    const id='filter-'+key,caption=document.createElement('label');caption.htmlFor=id;caption.textContent=label;wrap.appendChild(caption);
    let control;
    if(kind==='input'||kind==='date'){control=document.createElement('input');control.type=kind==='date'?'date':'search';control.autocomplete='off';control.placeholder=kind==='input'?(options||''):'';}
    else{control=document.createElement('select');const all=document.createElement('option');all.value='';all.textContent=key==='fromYear'?'از همهٔ سال‌ها':key==='toYear'?'تا همهٔ سال‌ها':'همه';control.appendChild(all);for(const option of options||[]){const node=document.createElement('option');node.value=String(option);node.textContent=key==='fromYear'||key==='toYear'?fmtYear(option):String(option);control.appendChild(node);}}
    control.id=id;control.dataset.filter=key;control.disabled=Boolean(disabled);control.value=state.filters[key]||'';control.addEventListener('change',()=>{state.filters[key]=control.value;state.page=0;renderAll();});control.addEventListener('input',()=>{if(kind==='input'){state.filters[key]=control.value;state.page=0;renderViews();}});wrap.appendChild(control);
    if(hint){const small=document.createElement('small');small.className='disabled-hint';small.textContent=hint;wrap.appendChild(small);}return wrap;
  }
  function renderFilters(){
    const rows=loadedRows(),available=data.availableDimensions(rows),grid=document.getElementById('filterGrid');grid.replaceChildren();
    const yearFilters={...state.filters,fromYear:'',toYear:'',search:''};const yearRows=data.filterRows(rows,yearFilters);
    const years=data.uniqueValues(yearRows,'year').filter(value=>value!==null).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
    const qYear=Number(state.urlContext.year);
    const fromKey='fromYear',toKey='toYear';
    grid.appendChild(createFilterField('از سال',fromKey,years,false,'','select'));
    grid.appendChild(createFilterField('تا سال',toKey,years,false,'','select'));
    if(qYear&&!state.contextYearApplied&&years.includes(qYear)){state.filters[fromKey]=String(qYear);state.filters[toKey]=String(qYear);state.contextYearApplied=true;grid.replaceChildren();grid.appendChild(createFilterField('از سال',fromKey,years,false,'','select'));grid.appendChild(createFilterField('تا سال',toKey,years,false,'','select'));}
    const queryLabel=state.active==='customers'?'جست‌وجوی مشتری یا کد':'جست‌وجوی نام یا کد کالا';
    grid.appendChild(createFilterField(queryLabel,'search',state.active==='customers'?'نام یا شناسه':'عنوان یا کد',false,'جست‌وجو در فیلدهای مجموعه','input'));
    const dateExists=available.date;
    grid.appendChild(createFilterField('از تاریخ','dateFrom','',!dateExists,dateExists?'تاریخ مطابق منبع':'این گزارش تاریخ روزانه ندارد.','date'));
    grid.appendChild(createFilterField('تا تاریخ','dateTo','',!dateExists,dateExists?'تاریخ مطابق منبع':'این گزارش تاریخ روزانه ندارد.','date'));
    const customerGroupKey=available.customerType?'customerType':'customerGroup';
    const groupLabel=available.customerType?'نوع مشتری':'گروه مشتری';
    const specs=[
      ['brand','برند','brand'],['model','مدل','model'],['category','دستهٔ کالا','category'],
      [customerGroupKey,groupLabel,customerGroupKey],['channel','کانال فروش','channel'],['province','استان','province'],['region','منطقهٔ فروش','region']
    ];
    const used=new Set();
    for(const [field,label,key] of specs){if(used.has(key))continue;used.add(key);const optionFilters={...state.filters,search:''};delete optionFilters[key];const optionRows=data.filterRows(rows,optionFilters);const options=available[key]?data.uniqueValues(optionRows,key):[];if(state.filters[key]&&!options.includes(state.filters[key]))state.filters[key]='';const missingHint=key==='province'&&state.urlContext.province?'استان از پیوند انتخاب شده؛ این گزارش ستون استان ندارد.':'ستون تأییدشده در فایل واردشده وجود ندارد.';if(key==='province'&&state.urlContext.province&&available.province&&!state.contextProvinceApplied){const match=options.find(value=>importer.norm(value)===importer.norm(state.urlContext.province));if(match)state.filters.province=match;state.contextProvinceApplied=true;}grid.appendChild(createFilterField(label,key,options,!available[key],available[key]?'':missingHint));}
    const context=document.getElementById('filtersTitle').closest('.filter-panel');
    let contextNote=document.getElementById('urlContextNote');
    if(!contextNote){contextNote=document.createElement('p');contextNote.id='urlContextNote';contextNote.className='panel-head-note';context.querySelector('.panel-head').insertAdjacentElement('afterend',contextNote);}
    const derivedRegion=rows.some(row=>row.regionDerived);
    if(state.urlContext.province){
      if(!available.province)contextNote.textContent='پیوند از داشبورد CEO با استان «'+state.urlContext.province+'» آمده است؛ این مجموعه ستون استان ندارد، پس استان روی این گزارش اعمال نشده. فایل تراکنشیِ دارای ستون استان را بارگذاری کنید.';
      else{const match=data.uniqueValues(rows,'province').find(value=>importer.norm(value)===importer.norm(state.urlContext.province));if(match){if(!state.contextProvinceApplied){state.filters.province=match;state.contextProvinceApplied=true;}contextNote.textContent='فیلتر استان از داشبورد CEO منتقل شد: '+match;}else contextNote.textContent='استان «'+state.urlContext.province+'» از پیوند آمده، اما در دادهٔ بارگذاری‌شده رکوردی برای آن استان نیست.';}
      if(derivedRegion)contextNote.textContent+=' منطقه از روی استان و نگاشت شش‌گانهٔ مصوب محاسبه شده است.';contextNote.hidden=false;
    }else if(derivedRegion){contextNote.textContent='منطقه از روی استان و نگاشت شش‌گانهٔ مصوب محاسبه شده است؛ فایل منبع ستون منطقه نداشت.';contextNote.hidden=false;}else{contextNote.textContent='';contextNote.hidden=true;}
    if(!rows.length){grid.querySelectorAll('select,input').forEach(control=>control.disabled=true);}
  }
  function amountText(value){return value===null||!Number.isFinite(value)?'—':fmtInt(value);}
  function renderKpis(rows){
    const grid=document.getElementById('kpiGrid');grid.replaceChildren();
    if(!rows.length){const emptyLabel=loadedRows().length?'موردی با فیلترهای فعلی پیدا نشد.':'داده موجود نیست';for(const label of ['جمع مبلغ خام','مشتریان یکتا / کدهای کالا','تعداد ردیف‌های منبع','سال‌های پوشش‌داده‌شده']){const card=document.createElement('article');card.className='kpi';card.innerHTML='<span>'+escHtml(label)+'</span><strong>'+emptyLabel+'</strong>';grid.appendChild(card);}return;}
    const summary=data.totals(rows), years=data.uniqueValues(rows,'year').filter(value=>value!==null);let primaryCountLabel='ردیف‌های منبع',primaryCount=summary.records,secondaryLabel='تعداد گروه‌های مشتری',secondaryCount=data.uniqueValues(rows,'customerGroup').length;
    if(state.active==='customers'){primaryCountLabel='مشتریان یکتا بر اساس کد';primaryCount=summary.customers??summary.records;secondaryLabel='گروه‌های مشتری';secondaryCount=data.uniqueValues(rows,'customerGroup').length;}
    if(state.active==='products'){primaryCountLabel='کد کالای یکتا';primaryCount=summary.products??summary.records;secondaryLabel='واحدهای اصلی موجود';secondaryCount=data.uniqueValues(rows,'unit').length;}
    if(state.active==='transactions'){primaryCountLabel='مشتریان یکتا با شناسه';primaryCount=summary.customers??null;secondaryLabel='قلم‌های کالای یکتا';secondaryCount=summary.products??null;}
    const cards=[
      {label:'جمع مبلغ ثبت‌شده · '+amountLabel(),value:summary.amount===null?'—':amountText(summary.amount),hint:'جمع فقط در مجموعه و فیلترهای فعال'},
      {label:primaryCountLabel,value:primaryCount===null?'—':fmtInt(primaryCount),hint:primaryCount===null?'شناسهٔ لازم در منبع وجود ندارد':'بر مبنای کدهای ثبت‌شده'},
      {label:secondaryLabel,value:secondaryCount===null?'—':fmtInt(secondaryCount),hint:state.active==='customers'&&!secondaryCount?'این ستون در منبع نیست':'مقدارهای متمایز در دادهٔ فعال'},
      {label:'ردیف‌های منبع · سال‌های موجود',value:fmtInt(summary.records)+' · '+fmtInt(years.length),hint:years.length?years.map(fmtYear).join('، '):'سال مشخص نشده'}
    ];
    if(state.active==='products'||state.active==='transactions'){
      const qtyText=summary.quantities.length?summary.quantities.slice(0,3).map(item=>fmtDecimal(item.value)+' '+item.unit).join(' · '):'در منبع موجود نیست';
      cards[2]={label:'مقدار ثبت‌شده به تفکیک واحد',value:qtyText,hint:'واحدهای متفاوت با هم جمع نشده‌اند'};
    }
    for(const item of cards){const card=document.createElement('article');card.className='kpi';card.innerHTML='<span>'+escHtml(item.label)+'</span><strong>'+escHtml(item.value)+'</strong><em>'+escHtml(item.hint)+'</em>';grid.appendChild(card);}
  }
  function visibleRows(){
    const filters={...state.filters};const searches=[filters.search,state.search].filter(Boolean).join(' ');filters.search=searches;
    let rows=data.filterRows(loadedRows(),filters);
    const {key,direction}=state.sort;rows=[...rows].sort((a,b)=>{const av=key==='amount'?amountRaw(a):(a[key]??(a.source&&a.source.file));const bv=key==='amount'?amountRaw(b):(b[key]??(b.source&&b.source.file));let result;if(typeof av==='number'&&typeof bv==='number')result=av-bv;else result=String(av??'').localeCompare(String(bv??''),'fa',{numeric:true});return direction==='asc'?result:-result;});
    return rows;
  }
  function renderYearTrend(rows){
    const holder=document.getElementById('yearTrend'),series=data.trendByPeriod(rows);holder.replaceChildren();const dated=series.some(item=>String(item.year).includes('-'));document.getElementById('trendTitle').textContent=dated?'روند ماهانهٔ مبلغ ثبت‌شده':'روند سالانهٔ مبلغ ثبت‌شده';document.getElementById('trendSubtitle').textContent=dated?'حداکثر ۱۲ ماه اخیر · تاریخ مطابق فایل منبع':'مبلغ خام ثبت‌شده در فایل';
    if(!series.length){holder.className='empty-chart';holder.textContent=rows.length?'مبلغ عددی قابل محاسبه در این فایل وجود ندارد.':'برای نمایش روند، ابتدا فایل بارگذاری کنید.';return;}
    holder.className='year-bars';const max=Math.max(1,...series.map(item=>item.amount));
    for(const item of series){const bar=document.createElement('div');bar.className='year-bar';const column=document.createElement('div');column.className='year-bar-column';const fill=document.createElement('div');fill.className='year-bar-fill';fill.style.height=Math.max(3,item.amount/max*92)+'%';fill.setAttribute('role','img');fill.setAttribute('aria-label',item.year+'، '+amountText(item.amount));const value=document.createElement('span');value.className='year-bar-value';value.textContent=compactAmount(item.amount);column.append(value,fill);const label=document.createElement('span');label.className='year-bar-label';label.textContent=/^14\d{2}$/.test(String(item.year))?fmtYear(item.year):item.year;bar.append(column,label);holder.appendChild(bar);}
  }
  function compactAmount(value){return new Intl.NumberFormat('fa-IR',{notation:'compact',maximumFractionDigits:1}).format(value);}
  function renderBreakdown(rows){
    const holder=document.getElementById('breakdownChart');holder.replaceChildren();let key,title;
    if(state.active==='customers'){key=rows.some(row=>row.customerGroup)?'customerGroup':'customerName';title=key==='customerGroup'?'مبلغ به تفکیک گروه مشتری':'بیشترین مشتریان';}
    else if(state.active==='products'){key='productName';title='بیشترین مبلغ به تفکیک عنوان کالا';}
    else {key=rows.some(row=>row.brand)?'brand':rows.some(row=>row.productName)?'productName':'province';title=key==='brand'?'مبلغ به تفکیک برند':'بیشترین مبلغ ثبت‌شده';}
    document.getElementById('breakdownTitle').textContent=title;
    const series=data.sumBy(rows,key).slice(0,8);document.getElementById('breakdownSubtitle').textContent='مبلغ خام · '+amountLabel();
    if(!series.length){holder.className='empty-chart';holder.textContent='دادهٔ کافی برای این نمودار موجود نیست.';return;}holder.className='bar-list';const max=Math.max(1,...series.map(item=>item.amount));
    for(const item of series){const row=document.createElement('div');row.className='bar-entry';const label=document.createElement('span');label.className='bar-entry-label';label.title=item.label;label.textContent=item.label;const track=document.createElement('span');track.className='bar-track';const fill=document.createElement('span');fill.className='bar-fill';fill.style.display='block';fill.style.width=(item.amount/max*100)+'%';track.appendChild(fill);const value=document.createElement('b');value.className='bar-entry-value';value.textContent=compactAmount(item.amount);row.append(label,track,value);holder.appendChild(row);}
  }
  function renderPairMatrix(holderId,titleId,rows,keyA,keyB,labelA,labelB){
    const holder=document.getElementById(holderId);holder.replaceChildren();document.getElementById(titleId).textContent='ماتریس '+labelA+' × '+labelB;
    const sourceRows=loadedRows(),hasA=sourceRows.some(row=>row[keyA]!==null&&row[keyA]!==undefined&&String(row[keyA]).trim()!==''),hasB=sourceRows.some(row=>row[keyB]!==null&&row[keyB]!==undefined&&String(row[keyB]).trim()!=='');
    if(!hasA||!hasB){holder.className='empty-chart';holder.textContent='برای این ماتریس، '+(!hasA?labelA:labelB)+' در فایل منبع ساختاریافته نیست؛ این مقدار حدس زده نمی‌شود.';return;}
    if(!rows.length){holder.className='empty-chart';holder.textContent='با فیلترهای فعلی ردیفی برای این ماتریس باقی نمانده است.';return;}
    const columnLabels=data.uniqueValues(rows,keyB).slice(0,8),rowLabels=data.sumBy(rows,keyA).slice(0,12).map(item=>item.label);
    const table=document.createElement('table');table.className='matrix';const thead=document.createElement('thead'),head=document.createElement('tr'),first=document.createElement('th');first.textContent=labelA;head.appendChild(first);for(const label of columnLabels){const th=document.createElement('th');th.textContent=label;head.appendChild(th);}thead.appendChild(head);table.appendChild(thead);
    const tbody=document.createElement('tbody');for(const rowLabel of rowLabels){const tr=document.createElement('tr'),name=document.createElement('th');name.textContent=rowLabel;tr.appendChild(name);for(const columnLabel of columnLabels){const matches=rows.filter(row=>String(row[keyA])===rowLabel&&String(row[keyB])===columnLabel&&amountRaw(row)!==null);const td=document.createElement('td');td.textContent=matches.length?fmtInt(matches.reduce((sum,row)=>sum+amountRaw(row),0)):'—';tr.appendChild(td);}tbody.appendChild(tr);}table.appendChild(tbody);holder.className='matrix-wrap';holder.appendChild(table);
  }
  function renderMatrices(rows){const secondKey=loadedRows().some(row=>row.customerType)?'customerType':'customerGroup';const secondLabel=secondKey==='customerType'?'نوع مشتری':'گروه مشتری';renderPairMatrix('matrixBrandProvince','matrixBrandTitle',rows,'brand','province','برند','استان');renderPairMatrix('matrixModelCustomer','matrixModelTitle',rows,'model',secondKey,'مدل',secondLabel);}
  function renderProvince(rows){
    const holder=document.getElementById('provinceChart');const title=document.getElementById('provinceChartTitle');const hasProvince=loadedRows().some(row=>row.province);title.textContent=hasProvince?'مبلغ ثبت‌شده به تفکیک استان':'فروش به تفکیک استان';
    if(!hasProvince){holder.className='empty-chart';holder.textContent=state.urlContext.province?'استان «'+state.urlContext.province+'» از پیوند CEO دریافت شد، اما در این داده ستون استان موجود نیست.':'فایل فعلی ستون استان ندارد؛ این بُعد ساختگی یا از نام‌ها حدس زده نمی‌شود.';return;}
    if(!rows.length){holder.className='empty-chart';holder.textContent='با فیلترهای فعلی رکورد استانی برای نمودار باقی نمانده است.';return;}
    holder.className='bar-list';holder.replaceChildren();const series=data.sumBy(rows,'province').slice(0,10),max=Math.max(1,...series.map(item=>item.amount));for(const item of series){const row=document.createElement('div');row.className='bar-entry';const label=document.createElement('span');label.className='bar-entry-label';label.textContent=item.label;const track=document.createElement('span');track.className='bar-track';const fill=document.createElement('span');fill.className='bar-fill';fill.style.display='block';fill.style.width=(item.amount/max*100)+'%';track.appendChild(fill);const value=document.createElement('b');value.className='bar-entry-value';value.textContent=compactAmount(item.amount);row.append(label,track,value);holder.appendChild(row);}
  }
  const columnsForKind={
    customers:[['year','سال'],['customerCode','کد مشتری'],['customerName','نام مشتری'],['customerGroup','گروه مشتری'],['province','استان'],['amount','مبلغ خام'],['source','فایل / ردیف']],
    products:[['year','سال'],['productCode','کد کالا'],['productName','عنوان کالا'],['unit','واحد'],['quantity','مقدار-اصلی'],['withdrawalQuantity','مقدار خروج-اصلی'],['netSales','خالص فروش خام'],['source','فایل / ردیف']],
    transactions:[['year','سال'],['date','تاریخ'],['orderId','سفارش'],['province','استان'],['region','منطقه'],['customerId','کد مشتری'],['customerType','نوع مشتری'],['customerGroup','گروه مشتری'],['channel','کانال'],['brand','برند'],['productCode','کد کالا'],['productName','عنوان کالا'],['model','مدل'],['category','دسته'],['quantity','مقدار'],['unit','واحد'],['netSales','مبلغ خام'],['source','فایل / ردیف']]
  };
  function cellValue(row,key){if(key==='source')return row.source?row.source.file+' · '+row.source.row:'—';if(key==='amount')return row.amount;if(key==='customerCode')return row.customerCode;if(key==='customerName')return row.customerName;if(key==='netSales')return row.netSales;return row[key];}
  function renderTable(rows){
    const thead=document.getElementById('tableHead'),tbody=document.getElementById('tableBody');thead.replaceChildren();tbody.replaceChildren();const total=rows.length,pageSize=100,pages=Math.max(1,Math.ceil(total/pageSize));state.page=Math.min(state.page,pages-1);const start=state.page*pageSize;const pageRows=rows.slice(start,start+pageSize);const cols=columnsForKind[state.active];
    const header=document.createElement('tr');for(const [key,label] of cols){const th=document.createElement('th'),button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-sort',state.sort.key===key?(state.sort.direction==='asc'?'ascending':'descending'):'none');button.addEventListener('click',()=>{const sortKey=key==='amount'?'amount':key;state.sort={key:sortKey,direction:state.sort.key===sortKey&&state.sort.direction==='desc'?'asc':'desc'};state.page=0;renderTable(visibleRows());});th.appendChild(button);header.appendChild(th);}thead.appendChild(header);
    if(!pageRows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=cols.length;td.className='empty-row';td.textContent=loadedRows().length?'با این فیلترها ردیفی پیدا نشد.':'گزارش در دسترس نیست؛ اتصال را بررسی و صفحه را دوباره بارگیری کنید.';tr.appendChild(td);tbody.appendChild(tr);}else{
      for(const row of pageRows){const tr=document.createElement('tr');for(const [key] of cols){const td=document.createElement('td');let value=cellValue(row,key);if(key==='source'){value=row.source?row.source.file+' · ردیف '+row.source.row:'—';}if(['amount','netSales','quantity','withdrawalQuantity'].includes(key))td.classList.add('number');if(key==='year'&&value!==null&&value!==undefined)td.textContent=fmtYear(value);else if(typeof value==='number')td.textContent=fmtDecimal(value);else td.textContent=text(value);tr.appendChild(td);}tbody.appendChild(tr);}
    }
    document.getElementById('tableCount').textContent=total?fmtInt(total)+' ردیف پس از فیلتر':'داده موجود نیست';document.getElementById('tablePageInfo').textContent=total?fmtInt(start+1)+' تا '+fmtInt(Math.min(start+pageSize,total))+' از '+fmtInt(total):'—';document.getElementById('prevPage').disabled=state.page<=0;document.getElementById('nextPage').disabled=state.page>=pages-1;document.getElementById('exportCsv').disabled=!total;document.getElementById('exportXlsx').disabled=!total;
  }
  function renderViews(){const filtered=visibleRows();renderKpis(filtered);renderYearTrend(filtered);renderBreakdown(filtered);renderMatrices(filtered);renderProvince(filtered);renderTable(filtered);}
  function renderAll(){renderFilters();renderViews();}
  function exportRows(){return visibleRows().map(row=>{const out={};for(const [key,label] of columnsForKind[state.active]){let value=cellValue(row,key);if(key==='source'&&row.source)value=row.source.file+' · '+row.source.row;out[label]=value==null?'':value;}return out;});}
  function downloadCsv(){const rows=exportRows();if(!rows.length)return;const keys=Object.keys(rows[0]);const csv='\ufeff'+[keys.map(data.csvValue).join(','),...rows.map(row=>keys.map(key=>data.csvValue(row[key])).join(','))].join('\r\n');downloadBlob(csv,'text/csv;charset=utf-8','maxsilver-'+state.active+'-filtered.csv');}
  function downloadBlob(content,type,name){const url=URL.createObjectURL(new Blob([content],{type}));const anchor=document.createElement('a');anchor.href=url;anchor.download=name;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function downloadXlsx(){const rows=exportRows();if(!rows.length)return;const sheet=XLSX.utils.json_to_sheet(rows);const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,sheet,'Filtered data');XLSX.writeFile(workbook,'maxsilver-'+state.active+'-filtered.xlsx');}
  const targetKind={customerFiles:'customers',productFiles:'products',transactionFiles:'transactions'};
  const publishedReports=[
    {path:'./data/source-reports/sales-customers-1403.xls',name:'sales-customers-1403.xls',kind:'customers'},
    {path:'./data/source-reports/sales-customers-1404.xls',name:'sales-customers-1404.xls',kind:'customers'},
    {path:'./data/source-reports/sales-customers-1405.xls',name:'sales-customers-1405.xls',kind:'customers'},
    {path:'./data/source-reports/sales-products-1403.xls',name:'sales-products-1403.xls',kind:'products'},
    {path:'./data/source-reports/sales-products-1404.xls',name:'sales-products-1404.xls',kind:'products'},
    {path:'./data/source-reports/sales-products-1405.xls',name:'sales-products-1405.xls',kind:'products'}
  ];
  async function loadPublishedReports(){
    statusText('در حال دریافت گزارش‌های خام منتشرشده…');
    const results=await Promise.allSettled(publishedReports.map(async report=>{
      const response=await fetch(new URL(report.path,location.href));
      if(!response.ok)throw new Error(report.name+' · HTTP '+response.status);
      const file=new File([await response.arrayBuffer()],report.name,{type:'application/vnd.ms-excel'});
      const parsed=await importer.parseFile(file,XLSX);
      if(parsed.kind!==report.kind)throw new Error(report.name+' · نوع گزارش با انتظار مطابقت ندارد.');
      return {report,records:parsed.records};
    }));
    const loaded={customers:[],products:[]},failures=[];
    for(const result of results){
      if(result.status==='fulfilled'){
        const {report,records}=result.value;
        loaded[report.kind].push(...records);
      }else failures.push(result.reason&&result.reason.message?result.reason.message:'خطا در دریافت فایل خام');
    }
    for(const kind of ['customers','products'])state.rows[kind]=loaded[kind];
    const statusFor={customers:document.getElementById('customerImportStatus'),products:document.getElementById('productImportStatus')};
    for(const kind of ['customers','products']){
      const count=state.rows[kind].length,files=publishedReports.filter(report=>report.kind===kind).filter(report=>state.rows[kind].some(row=>row.source.file===report.name)).length;
      statusFor[kind].textContent=count?fmtInt(files)+' گزارش · '+fmtInt(count)+' ردیف · سال‌های ۱۴۰۳ تا ۱۴۰۵':'گزارش بارگیری نشد.';
    }
    document.querySelectorAll('.dataset-option').forEach(button=>{button.disabled=!state.rows[button.dataset.dataset].length;});
    if(state.rows.customers.length)setDataset('customers');else if(state.rows.products.length)setDataset('products');else renderAll();
    if(failures.length){statusText('برخی گزارش‌ها بارگیری نشدند: '+failures.join(' ؛ ')+' . می‌توانید فایل خام را دانلود یا دوباره بارگیری کنید.',true);}
    else statusText('هر شش گزارش خام بارگیری شد. مجموعهٔ مشتری و کالا جداگانه تحلیل می‌شود.');
  }
  async function handleFiles(input){const target=targetKind[input.id];const status=document.getElementById(target==='customers'?'customerImportStatus':target==='products'?'productImportStatus':'transactionImportStatus');const files=[...(input.files||[])];if(!files.length)return;status.textContent='در حال خواندن فایل‌ها در همین مرورگر…';statusText('فایل‌ها در حال پردازش‌اند؛ هیچ داده‌ای ارسال نمی‌شود.');let added=0,issues=[];
    for(const file of files){try{const parsed=await importer.parseFile(file,XLSX);if(parsed.kind!==target){issues.push(file.name+': نوع گزارش با ورودی انتخاب‌شده مطابقت ندارد.');continue;}state.rows[target]=state.rows[target].filter(row=>row.source.file!==file.name).concat(parsed.records);added+=parsed.records.length;}catch(error){issues.push(file.name+': '+error.message);}}
    const count=state.rows[target].length;status.textContent=count?fmtInt(count)+' ردیف فعال · '+files.map(file=>file.name).join('، '):'فایل قابل استفاده وارد نشد.';statusText(issues.length?issues.join(' '):(added?fmtInt(added)+' ردیف از فایل(ها) خوانده شد.': 'فایل(ها) پردازش شدند.'),Boolean(issues.length));
    document.querySelectorAll('.dataset-option').forEach(button=>{button.disabled=!state.rows[button.dataset.dataset].length;});if(added){setDataset(target);}input.value='';
  }
  document.querySelectorAll('.dataset-option').forEach(button=>{button.disabled=true;button.addEventListener('click',()=>setDataset(button.dataset.dataset));});
  for(const id of ['customerFiles','productFiles','transactionFiles'])document.getElementById(id).addEventListener('change',event=>handleFiles(event.currentTarget));
  document.getElementById('amountUnit').addEventListener('change',event=>{state.unit[state.active]=event.target.value;renderAll();});
  document.getElementById('tableSearch').addEventListener('input',event=>{state.search=event.target.value;state.page=0;renderViews();});
  document.getElementById('exportCsv').addEventListener('click',downloadCsv);document.getElementById('exportXlsx').addEventListener('click',downloadXlsx);
  document.getElementById('prevPage').addEventListener('click',()=>{state.page=Math.max(0,state.page-1);renderTable(visibleRows());});document.getElementById('nextPage').addEventListener('click',()=>{state.page++;renderTable(visibleRows());});
  document.getElementById('clearFilters').addEventListener('click',()=>{state.filters={};state.search='';state.contextYearApplied=true;state.contextProvinceApplied=true;state.page=0;document.getElementById('tableSearch').value='';renderAll();});
  parseContext();renderAll();loadPublishedReports();
})();
