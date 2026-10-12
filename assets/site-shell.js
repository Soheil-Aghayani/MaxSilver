(function(){
  'use strict';
  const currentFile=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const page=currentFile==='ceo-dashboard.html'?'ceo':currentFile==='sales-analysis.html'?'analysis':'home';
  const links=[
    {id:'home',href:'./index.html',label:'درگاه مدیریت',icon:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'},
    {id:'ceo',href:'./ceo-dashboard.html',label:'داشبورد CEO',icon:'<path d="M3 3v18h18M7 14l4-4 4 3 6-7"/><path d="M17 6h4v4"/>'},
    {id:'analysis',href:'./sales-analysis.html',label:'تحلیل جزئیات فروش',icon:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 14v3m5-7v7m5-10v10"/>'}
  ];
  const nav=document.createElement('header');nav.className='ms-sitebar';nav.setAttribute('role','banner');
  const navItems=links.map(item=>'<li><a href="'+item.href+'"'+(page===item.id?' aria-current="page"':'')+'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+item.icon+'</svg><span>'+item.label+'</span></a></li>').join('');
  nav.innerHTML='<div class="ms-sitebar-inner"><a class="ms-brand" href="./index.html" aria-label="درگاه مدیریتی Max Silver"><img class="ms-brand-logo" src="./assets/branding/maxsilver-logo-source.png" alt="لوگوی MAX SILVER" width="300" height="48"><span class="ms-brand-copy"><strong>درگاه مدیریتی</strong></span></a><nav aria-label="ناوبری اصلی"><ul class="ms-nav-links">'+navItems+'</ul></nav></div>';
  document.body.classList.add('ms-portal-body');document.body.insertBefore(nav,document.body.firstChild);
  const provinceName=document.getElementById('selectedName');
  const details=document.querySelector('#provinceDetailsSlide .selected-row');
  if(provinceName&&details){
    const link=document.createElement('a');link.className='ms-analysis-cta';link.href='./sales-analysis.html';
    link.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19V5m0 14h16"/><path d="m7 15 4-4 3 2 5-6"/></svg><span>تحلیل فروش با فیلتر استان منتخب</span>';
    details.insertAdjacentElement('afterend',link);
    const updateLink=()=>{const name=(provinceName.textContent||'').trim();if(!name||name==='—')return;const yearButton=document.querySelector('.year-button.is-active');const year=yearButton?yearButton.dataset.year:'';const url=new URL('./sales-analysis.html',location.href);url.searchParams.set('province',name);if(year)url.searchParams.set('year',year);link.href=url.pathname+url.search;};
    new MutationObserver(updateLink).observe(provinceName,{childList:true,subtree:true,characterData:true});
    document.addEventListener('change',event=>{if(event.target&&event.target.id==='selectedProvince')setTimeout(updateLink,0);});
    document.addEventListener('click',event=>{if(event.target.closest('.year-button'))setTimeout(updateLink,0);});
    updateLink();
  }
})();
