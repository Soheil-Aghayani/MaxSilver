// Business planner: a guided first plan for a café, restaurant or fast-food. Three calm steps (what, how big and what you
// serve), then one suggested machine for each job. Each suggestion can be swapped for a similar one or removed, and
// the missing supporting items are added and labelled. The result goes into the proforma draft of the catalog.
(function () {
  'use strict';
  var root = document.getElementById('pl');
  if (!root) return;
  var VER = ((document.currentScript && document.currentScript.src.match(/v=(\d+)/)) || [])[1] || '';
  var faInt = new Intl.NumberFormat('fa-IR');
  var STATE_KEY = 'ms-planner-v1';
  // someone with no staff account sees the public version: no prices, and the result is a purchase request for sales (Chef Market sheet)
  var PUBLIC = (function () { try { return !localStorage.getItem('ms-role') || /[?&]public=1/.test(location.search); } catch (e) { return true; } })();
  var PUBRET = {};   // product ids taken out of use, published by sales management (public_config/retired)

  // ---- what we know how to plan
  // cats: catalog categories in order of preference. zone: where it sits in the kitchen. qty: [small, medium, large].
  var JOBS = {
    coffee:    { t: 'قهوه و نوشیدنی گرم', why: 'آب جوش، قهوه و چای برای تمام روز', cats: ['آب‌جوش و قهوه'], zone: 'drink', qty: [1, 1, 2] },
    blend:     { t: 'اسموتی و نوشیدنی سرد', why: 'میوه، یخ و شیک را در چند ثانیه مخلوط می‌کند', cats: ['مخلوط‌کن', 'پارچ مخلوط‌کن'], zone: 'drink', qty: [1, 1, 2] },
    juice:     { t: 'آبمیوهٔ تازه', why: 'آب‌پرتقال و آبمیوهٔ طبیعی در لحظه', cats: ['آب‌پرتقال‌گیر'], zone: 'drink', qty: [1, 1, 2] },
    ice:       { t: 'یخ برای نوشیدنی‌ها', why: 'یخ همیشه آماده، بدون خرید و نگهداری', cats: ['یخ‌ساز'], zone: 'cold', qty: [1, 1, 2] },
    fridge:    { t: 'نگهداری سرد مواد', why: 'یخچال یا فریزر برای مواد اولیه و آماده‌سازی', cats: ['یخچال و فریزر'], zone: 'cold', qty: [1, 2, 3] },
    cake:      { t: 'نمایش کیک و شیرینی', why: 'ویترین سرد که محصول را خوش‌رنگ و سالم نگه می‌دارد', cats: ['ویترین کیک'], zone: 'serve', qty: [1, 1, 2] },
    toast:     { t: 'صبحانه و ساندویچ گرم', why: 'نان و ساندویچ سریع و داغ برای مشتری', cats: ['توستر', 'ساندویچ‌ساز'], zone: 'cook', qty: [1, 1, 2] },
    waffle:    { t: 'وافل و دسر', why: 'دسر گرم با سرعت و ظاهر جذاب', cats: ['وافل‌ساز'], zone: 'cook', qty: [1, 1, 2] },
    table:     { t: 'میز کار آماده‌سازی', why: 'سطح تمیز و استیل برای برش، چیدن و بسته‌بندی', cats: ['میز کار'], zone: 'prep', qty: [1, 2, 3] },
    grill:     { t: 'پخت روی گریل', why: 'همبرگر، استیک و غذاهای گریلی', cats: ['گریل'], zone: 'cook', qty: [1, 1, 2] },
    burger:    { t: 'شکل‌دادن همبرگر', why: 'گوشت را هم‌اندازه و سریع پرس می‌کند', cats: ['همبرگرزن'], zone: 'prep', qty: [1, 1, 1] },
    fry:       { t: 'سرخ‌کردنی‌ها', why: 'مرغ سوخاری، سیب‌زمینی و پیش‌غذا', cats: ['سرخ‌کن'], zone: 'cook', qty: [1, 1, 2] },
    potato:    { t: 'نگهداری و پر کردن سیب‌زمینی', why: 'سیب‌زمینی سرخ‌شده داغ و آمادهٔ سرو می‌ماند', cats: ['شوت سیب‌زمینی'], zone: 'serve', qty: [1, 1, 1] },
    marinate:  { t: 'طعم‌دار کردن مرغ و گوشت', why: 'مرینه و آماده‌سازی سریع پیش از پخت', cats: ['مرینیتور و بردینگ'], zone: 'prep', qty: [1, 1, 2] },
    warm:      { t: 'گرم‌نگهداری و نمایش غذا', why: 'غذای آماده تا لحظهٔ سرو گرم می‌ماند', cats: ['گرمخانه و دیسپلی'], zone: 'serve', qty: [1, 1, 2] },
    bain:      { t: 'نگهداری غذای گرم', why: 'خورشت، پلو و غذاهای سرو روزانه', cats: ['بن‌ماری'], zone: 'serve', qty: [1, 2, 3] },
    stove:     { t: 'پخت غذا روی اجاق', why: 'خورش، سس و غذاهای اصلی منو', cats: ['اجاق'], zone: 'cook', qty: [1, 1, 2] },
    doner:     { t: 'کباب ترکی و دونر', why: 'کباب چرخان با ظاهر و سرعت سرو بالا', cats: ['کباب ترکی'], zone: 'cook', qty: [1, 1, 1] },
    pizza:     { t: 'پخت پیتزا', why: 'فر مخصوص با دمای بالا و پخت یکنواخت', cats: ['فر پیتزا'], zone: 'cook', qty: [1, 1, 2] },
    dough:     { t: 'ورز و آماده‌کردن خمیر', why: 'خمیر یکنواخت بدون خستگی دست', cats: ['خمیرگیر و همزن'], zone: 'prep', qty: [1, 1, 2] },
    sheeter:   { t: 'پهن‌کردن خمیر', why: 'گردهٔ هم‌اندازه برای پیتزا و نان', cats: ['خمیرپهن‌کن'], zone: 'prep', qty: [1, 1, 1] },
    topping:   { t: 'میز تاپینگ پیتزا', why: 'مواد دم‌دست و سرد برای چیدن سریع', cats: ['تاپینگ'], zone: 'prep', qty: [1, 1, 2] },
    pasta:     { t: 'پخت پاستا', why: 'پخت و آب‌کشی سریع برای هر سفارش', cats: ['پاستاپز'], zone: 'cook', qty: [1, 1, 1] },
    chop:      { t: 'خرد کردن و پوست‌کندن', why: 'سبزی و سیب‌زمینی را در دقیقه آماده می‌کند', cats: ['خردکن و پوست‌کن'], zone: 'prep', qty: [1, 1, 2] },
    oven:      { t: 'پخت نان و شیرینی', why: 'پخت یکنواخت چند سینی هم‌زمان', cats: ['فر کانوکشن'], zone: 'cook', qty: [1, 1, 2] },
    hood:      { t: 'تهویه و هود', why: 'دود، چربی و بخار پخت باید از فضا بیرون برود', cats: ['هود'], zone: 'safety', qty: [1, 1, 2] },
    oilFilter: { t: 'تصفیهٔ روغن', why: 'عمر روغن را بیشتر و طعم غذا را یکنواخت می‌کند', cats: ['تصفیه روغن'], zone: 'safety', qty: [1, 1, 1] },
    wash:      { t: 'سینک و شست‌وشو', why: 'شست‌وشوی دست و ظرف برای بهداشت و مجوز بهداشتی', cats: [], zone: 'safety', qty: [1, 1, 1] }
  };
  var ZONES = [['prep', 'آماده‌سازی'], ['cook', 'پخت'], ['serve', 'نگهداری و سرو'], ['drink', 'نوشیدنی'], ['cold', 'سرمایش'], ['safety', 'ایمنی و بهداشت']];
  var SIZES = [{ id: 0, t: 'کوچک', d: 'تا حدود ۲۰ مشتری هم‌زمان' }, { id: 1, t: 'متوسط', d: 'حدود ۲۰ تا ۵۰ مشتری' }, { id: 2, t: 'بزرگ', d: 'بیش از ۵۰ مشتری' }];
  var CONCEPTS = [
    { id: 'cafe', t: 'کافه', d: 'قهوه، نوشیدنی، شیرینی و صبحانهٔ سبک', sectors: ['کافه', 'قهوه و شکلات', 'صبحانه و میان‌وعده', 'شیرینی'],
      core: ['coffee', 'cake', 'fridge', 'table'],
      serve: [{ id: 'cold', t: 'نوشیدنی سرد و اسموتی', jobs: ['blend'] }, { id: 'juice', t: 'آبمیوهٔ تازه', jobs: ['juice'] },
        { id: 'breakfast', t: 'صبحانه و ساندویچ', jobs: ['toast'] }, { id: 'waffle', t: 'وافل و دسر', jobs: ['waffle'] }] },
    { id: 'fastfood', t: 'فست‌فود', d: 'برگر، مرغ سوخاری، ساندویچ و سیب‌زمینی', sectors: ['فست‌فود'],
      core: ['fridge', 'table'],
      serve: [{ id: 'burger', t: 'همبرگر', jobs: ['grill', 'burger', 'warm'] }, { id: 'chicken', t: 'مرغ سوخاری', jobs: ['marinate', 'fry', 'warm'] },
        { id: 'fries', t: 'سیب‌زمینی سرخ‌کرده', jobs: ['fry', 'potato'] }, { id: 'sandwich', t: 'ساندویچ', jobs: ['toast'] }, { id: 'drinks', t: 'نوشیدنی', jobs: ['blend', 'ice'] }] },
    { id: 'restaurant', t: 'رستوران', d: 'غذای گرم، کباب و منوی متنوع', sectors: ['رستوران', 'کباب', 'ایرانی', 'بین‌الملل'],
      core: ['fridge', 'table', 'chop'],
      serve: [{ id: 'grill', t: 'کباب و گریل', jobs: ['grill', 'doner'] }, { id: 'hot', t: 'غذای گرم و خورشت', jobs: ['stove', 'bain'] },
        { id: 'pasta', t: 'پاستا', jobs: ['pasta'] }, { id: 'fry', t: 'سرخ‌کردنی', jobs: ['fry'] }, { id: 'drinks', t: 'نوشیدنی', jobs: ['ice', 'blend'] }] },
    { id: 'pizza', t: 'پیتزا', d: 'پیتزا با فر مخصوص و خمیر تازه', sectors: ['فست‌فود', 'رستوران'],
      core: ['pizza', 'dough', 'topping', 'fridge'],
      serve: [{ id: 'sheet', t: 'خمیر هم‌اندازه و سریع', jobs: ['sheeter'] }, { id: 'pasta', t: 'پاستا', jobs: ['pasta'] }, { id: 'fry', t: 'پیش‌غذای سرخ‌شده', jobs: ['fry'] }, { id: 'drinks', t: 'نوشیدنی', jobs: ['ice', 'blend'] }] },
    { id: 'bakery', t: 'شیرینی و نانوایی', d: 'خمیر، پخت و ویترین', sectors: ['نانوایی', 'شیرینی'],
      core: ['oven', 'dough', 'cake', 'table'],
      serve: [{ id: 'sheet', t: 'نان و خمیر پهن', jobs: ['sheeter'] }, { id: 'breakfast', t: 'صبحانه', jobs: ['toast'] }, { id: 'coffee', t: 'قهوه و چای', jobs: ['coffee'] }] },
    { id: 'juice', t: 'آبمیوه و نوشیدنی', d: 'آبمیوه، اسموتی و نوشیدنی سرد', sectors: ['آبمیوه سنتی', 'کافه'],
      core: ['blend', 'ice', 'fridge'],
      serve: [{ id: 'fresh', t: 'آبمیوهٔ طبیعی', jobs: ['juice'] }, { id: 'coffee', t: 'قهوه و چای', jobs: ['coffee'] }, { id: 'cake', t: 'کیک و شیرینی', jobs: ['cake'] }] }
  ];
  var CONCEPT_ICON = {
    cafe: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M7 3v2M11 3v2"/>',
    fastfood: '<path d="M4 11a8 6 0 0 1 16 0zM3 14h18M5 17h14a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2z"/>',
    restaurant: '<path d="M5 3v8a2 2 0 0 0 2 2v8M9 3v6a2 2 0 0 1-2 2M17 3c-2 2-3 5-3 8h3v10"/>',
    pizza: '<path d="M12 3 3 19a22 22 0 0 0 18 0zM9 12h.01M14 10h.01M12 15h.01"/>',
    bakery: '<path d="M4 12a4 4 0 0 1 4-4h8a4 4 0 0 1 0 8v4H8v-4a4 4 0 0 1-4-4z"/>',
    juice: '<path d="M7 4h10l-1 16H8zM8 9h8M14 4l2-2"/>'
  };

  var S = { step: 0, q: 0, ans: {}, concept: '', size: 1, budget: 'mid', serve: [], pick: {}, removed: [], qty: {} };   // q: the question on screen; ans: which questions the visitor has answered
  var TIERS = {}, TIERS_ON = false;   // product id -> 'eco' | 'mid' | 'pro' (assets/product-tiers.json, optional)
  var TIER_RANK = { eco: 0, mid: 1, pro: 2 }, TIER_WORD = { 'اقتصادی': 'eco', 'متعادل': 'mid', 'حرفه‌ای': 'pro', 'حرفه ای': 'pro', eco: 'eco', mid: 'mid', pro: 'pro' };
  try { var saved = JSON.parse(localStorage.getItem(STATE_KEY) || 'null'); if (saved && saved.concept) S = Object.assign(S, saved); } catch (e) { /* ignore */ }
  function save() { try { localStorage.setItem(STATE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  var CAT = null, BY = {}, ready = false, failed = false;
  var nz = function (s) { return String(s || '').replace(/[‌\s]/g, ''); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function conceptOf(id) { return CONCEPTS.filter(function (c) { return c.id === id; })[0]; }
  var SEP = '<i class="ms-sep" aria-hidden="true"></i>';   // a coloured bar between a word and a number: a dot there reads as a Persian zero
  var BRAND = { 'max-silver': 'مکث‌سیلور', wintora: 'وینتورا', 'torbo-max': 'توربومکس' };

  // ---- the plan: jobs for the choices, then the gaps they imply
  function plan() {
    var c = conceptOf(S.concept), out = [], have = {};
    function add(id, kind, why) { if (have[id]) { if (kind === 'main' && have[id].kind === 'gap') have[id].kind = 'main'; return; } have[id] = { id: id, kind: kind, why: why || JOBS[id].why }; out.push(have[id]); }
    c.core.forEach(function (id) { add(id, 'main'); });
    S.serve.forEach(function (sid) { var s = c.serve.filter(function (x) { return x.id === sid; })[0]; if (s) s.jobs.forEach(function (id) { add(id, 'main'); }); });
    var cooks = ['fry', 'grill', 'stove', 'doner', 'pizza', 'oven'].some(function (j) { return have[j]; });
    if (cooks) add('hood', 'gap', 'پخت دود و بخار دارد؛ هود هم ایمنی است و هم شرط بازرسی');
    if (have.fry) add('oilFilter', 'gap', 'روغن سرخ‌کن را تمیز نگه می‌دارد و هزینهٔ روغن را کم می‌کند');
    if (['blend', 'juice', 'coffee', 'cold'].some(function (j) { return have[j]; }) && !have.ice) add('ice', 'gap', 'نوشیدنی سرد بدون یخ کامل نمی‌شود');
    if (!have.fridge) add('fridge', 'gap', 'مواد اولیه باید سرد نگه داشته شود');
    add('wash', 'gap');
    return out;
  }
  function tierDist(it) {
    if (!TIERS_ON) return 0;
    var r = TIER_RANK[TIERS[it.id]];
    return r == null ? 1 : Math.abs(r - TIER_RANK[S.budget]);
  }
  function sectorHit(it, secs) { return (it.sec || []).some(function (x) { return secs.indexOf(x) >= 0; }); }
  function candidates(job, cid) {
    var cats = JOBS[job].cats.map(nz), secs = conceptOf(cid || S.concept).sectors;
    var list = CAT.items.filter(function (it) { return cats.indexOf(nz(it.cat)) >= 0 && !(window.MSStatus && window.MSStatus.retired(it.id)) && !PUBRET[it.id]; });
    var fp = function (it) { return it.dims ? (it.dims.l || 0) * (it.dims.w || 0) : 0; };
    list.sort(function (a, b) {
      var ia = cats.indexOf(nz(a.cat)) - cats.indexOf(nz(b.cat));
      if (ia) return ia;
      return (sectorHit(a, secs) ? 0 : 1) - (sectorHit(b, secs) ? 0 : 1) || tierDist(a) - tierDist(b) || fp(a) - fp(b);
    });
    return list;
  }
  // neutral between brands: category first, then the business sector, then the budget level, then the size
  function pickFor(job, cid) {
    var cands = candidates(job, cid);
    if (!cands.length) return null;
    if (!cid && S.pick[job] && BY[S.pick[job]]) return BY[S.pick[job]];
    var secs = conceptOf(cid || S.concept).sectors, f = cands[0];
    var group = cands.filter(function (it) { return nz(it.cat) === nz(f.cat) && sectorHit(it, secs) === sectorHit(f, secs) && tierDist(it) === tierDist(f); });
    if (group.length < 3) group = cands.filter(function (it) { return nz(it.cat) === nz(f.cat) && tierDist(it) === tierDist(f); });
    if (!group.length) group = cands;
    var i = Math.min(group.length - 1, Math.floor(group.length * [0.15, 0.5, 0.85][cid ? 1 : S.size]));
    return group[i];
  }
  function qtyFor(job) { return S.qty[job] != null ? S.qty[job] : JOBS[job].qty[S.size]; }

  // ---- views
  // the questions come one at a time; the plan is built only after all of them are answered
  function qList() { return ['size'].concat(TIERS_ON ? ['budget'] : [], ['serve']); }
  function answered(k) { return k === 'serve' ? S.serve.length > 0 : !!(S.ans && S.ans[k]); }
  function firstOpen() { var l = qList(); for (var i = 0; i < l.length; i++) if (!answered(l[i])) return i; return -1; }
  var IC_BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
  var IC_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>';
  var IC_TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  // pos: how many steps are behind the visitor; the bar never reaches the end until the request is sent
  function progress(pos, label) {
    var total = qList().length + 2 + (PUBLIC ? 1 : 0), pct = Math.round(pos / total * 100);
    return '<div class="pl-top">' + (pos > 0 ? '<button type="button" class="pl-ic back" data-back aria-label="بازگشت" title="بازگشت">' + IC_BACK + '</button>' : '') +
      '<div class="pl-prog" role="progressbar" aria-label="پیشرفت" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div><span class="pl-pl">' + label + '</span></div>';
  }
  // 3D illustrations with transparent backgrounds (assets/art): the business icon in front, two typical machines behind it
  var ART = {
    cafe: ['cafe_category', 'espresso_machine', 'burr_grinder'],
    fastfood: ['fast_food_shawerma_category', 'vertical_shawarma_rotisserie', 'flatbread_griddle'],
    restaurant: ['restaurant_category', 'commercial_range', 'combi_oven'],
    pizza: ['pizza_category', 'pizza_oven', 'spiral_dough_mixer'],
    bakery: ['bakery_cakes_category', 'deck_oven', 'planetary_mixer'],
    juice: ['soft_drinks_cocktails_category', 'ice_machine', 'bar_blender']
  };
  var TINT = { cafe: '#fde8c8', fastfood: '#fddad3', restaurant: '#e1ecfb', pizza: '#fcd9cf', bakery: '#fdf0c4', juice: '#d9f3e4' };
  function stage(id) {
    var a = ART[id];
    if (!a) return '<span class="pl-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + CONCEPT_ICON[id] + '</svg></span>';
    // [image, left, width, rotation, depth]
    var pos = [[a[1], '0%', '36%', '-6deg', '20px'], [a[2], '64%', '36%', '6deg', '26px'], [a[0], '27%', '46%', '0deg', '72px']];
    return '<span class="pl-stage" aria-hidden="true">' + pos.map(function (q, i) {
      return '<span class="pl-pop' + (i === 2 ? ' main' : '') + '" style="--l:' + q[1] + ';--w:' + q[2] + ';--r:' + q[3] + ';--z:' + q[4] + ';--d:' + (i * 0.5) + 's"><i></i><img src="./assets/art/' + q[0] + '.webp" alt="" loading="lazy" decoding="async"></span>';
    }).join('') + '</span>';
  }
  function stepConcept() {
    return progress(0, 'انتخاب کسب‌وکار') + '<h1>چه کسب‌وکاری می‌خواهید راه بیندازید؟</h1><p class="pl-lead">فقط یک انتخاب. لازم نیست جزئیات فنی بدانید؛ ما قدم‌به‌قدم کمک می‌کنیم.</p>' +
      '<div class="pl-cards">' + CONCEPTS.map(function (c) {
        return '<button type="button" class="pl-card" data-concept="' + c.id + '" style="--tint:' + TINT[c.id] + '">' + stage(c.id) + '<b>' + c.t + '</b><small>' + c.d + '</small></button>';
      }).join('') + '</div>';
  }
  function stepQuestions() {
    var c = conceptOf(S.concept), l = qList(), n = l.length, k = l[S.q] || l[0], body = '';
    if (k === 'size') {
      body = '<h2 class="pl-q">اندازهٔ کار شما؟</h2><div class="pl-seg" role="radiogroup" aria-label="اندازه">' + SIZES.map(function (z) {
        return '<button type="button" role="radio" class="pl-opt" data-size="' + z.id + '" aria-checked="' + (!!S.ans.size && S.size === z.id) + '"><b>' + z.t + '</b><small>' + z.d + '</small></button>';
      }).join('') + '</div>';
    } else if (k === 'budget') {
      body = '<h2 class="pl-q">سطح بودجه؟</h2><div class="pl-seg" role="radiogroup" aria-label="سطح بودجه">' + [['eco', 'اقتصادی', 'ساده و مقرون‌به‌صرفه'], ['mid', 'متعادل', 'تعادل قیمت و کیفیت'], ['pro', 'حرفه‌ای', 'بالاترین دوام و ظرفیت']].map(function (b) {
        return '<button type="button" role="radio" class="pl-opt" data-budget="' + b[0] + '" aria-checked="' + (!!S.ans.budget && S.budget === b[0]) + '"><b>' + b[1] + '</b><small>' + b[2] + '</small></button>';
      }).join('') + '</div>';
    } else {
      body = '<h2 class="pl-q">چه چیزهایی سرو می‌کنید؟ <small>هر چند تا که می‌خواهید</small></h2><div class="pl-chips">' + c.serve.map(function (s) {
        return '<button type="button" class="pl-chip" data-serve="' + s.id + '" aria-pressed="' + (S.serve.indexOf(s.id) >= 0) + '">' + s.t + '</button>';
      }).join('') + '</div>' +
        (S.serve.length ? '<div class="pl-bar"><button type="button" class="pl-btn primary" data-plan>ساخت طرح پیشنهادی</button></div>' : '<p class="pl-note">حداقل یک مورد را انتخاب کنید.</p>');
    }
    return progress(1 + S.q, 'سؤال ' + faInt.format(S.q + 1) + ' از ' + faInt.format(n)) + '<p class="pl-kicker">' + esc(c.t) + '</p>' + body;
  }  function jobCard(j) {
    var p = pickFor(j.id), removed = S.removed.indexOf(j.id) >= 0, job = JOBS[j.id];
    var badge = j.kind === 'gap' ? '<span class="pl-gap">تکمیل‌کننده</span>' : '';
    if (removed) return '<li class="pl-job off"><div class="pl-jt"><b>' + job.t + '</b>' + badge + '</div><button type="button" class="pl-link" data-restore="' + j.id + '">برگرداندن</button></li>';
    if (!p) return '<li class="pl-job nocat"><div class="pl-jt"><b>' + job.t + '</b>' + badge + '</div><p class="pl-why">' + j.why + '</p><p class="pl-adv">برای این مورد با کارشناس مشورت کنید؛ در کاتالوگ فعلی نیست.</p>' +
      '<div class="pl-acts"><button type="button" class="pl-ic" data-remove="' + j.id + '" aria-label="حذف" title="حذف">' + ICO.trash + '</button></div></li>';
    var alts = candidates(j.id).length > 1;
    return '<li class="pl-job"><div class="pl-jt"><b>' + job.t + '</b>' + badge + '</div><p class="pl-why">' + j.why + '</p>' +
      '<div class="pl-prod"><button type="button" class="pl-img" data-info="' + esc(p.id) + '" aria-label="جزئیات ' + esc(p.name) + '">' + (p.img ? '<img src="' + esc(p.img) + '" alt="">' : '') + '</button>' +
      '<div class="pl-pn"><b>' + esc(p.name) + '</b><span>' + (BRAND[p.src] || '') + (p.dims ? SEP + faInt.format(p.dims.l) + '×' + faInt.format(p.dims.w) + ' سانتی‌متر' : '') + '</span></div></div>' +
      '<div class="pl-acts"><span class="pl-qty"><button type="button" data-q="' + j.id + '" data-d="-1" aria-label="کمتر">−</button><b>' + faInt.format(qtyFor(j.id)) + '</b><button type="button" data-q="' + j.id + '" data-d="1" aria-label="بیشتر">+</button></span>' +
      (alts ? '<button type="button" class="pl-ic" data-swap="' + j.id + '" aria-label="جایگزین" title="جایگزین مشابه">' + ICO.swap + '</button>' : '') +
      '<button type="button" class="pl-ic" data-remove="' + j.id + '" aria-label="حذف" title="حذف">' + ICO.trash + '</button></div></li>';
  }
  var ICO = {
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4m4 4H7"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>'
  };
  function stepPlan() {
    var c = conceptOf(S.concept), jobs = plan(), live = jobs.filter(function (j) { return S.removed.indexOf(j.id) < 0 && pickFor(j.id); });
    var machines = live.reduce(function (a, j) { return a + qtyFor(j.id); }, 0);
    var zones = ZONES.map(function (z) {
      var list = jobs.filter(function (j) { return JOBS[j.id].zone === z[0]; });
      return list.length ? '<section class="pl-zone"><h3>' + z[1] + '</h3><ul class="pl-jobs">' + list.map(jobCard).join('') + '</ul></section>' : '';
    }).join('');
    return progress(1 + qList().length, 'بررسی طرح') + '<h1>طرح پیشنهادی برای ' + c.t + ' ' + SIZES[S.size].t + '</h1>' +
      '<p class="pl-lead">برای هر کار یک دستگاه پیشنهاد شده. هرکدام را می‌توانید با نمونهٔ مشابه عوض یا حذف کنید. موارد «تکمیل‌کننده» چیزهایی است که معمولاً فراموش می‌شود.</p>' +
      '<div class="pl-sum"><span><b>' + faInt.format(live.length) + '</b> کار</span><span><b>' + faInt.format(machines) + '</b> دستگاه</span></div>' + zones +
      '<div class="pl-bar"><button type="button" class="pl-btn primary" ' + (PUBLIC ? 'data-request' : 'data-toinv') + (live.length ? '' : ' disabled') + '>' + (PUBLIC ? 'ارسال درخواست به کارشناس' : 'افزودن به پیش‌فاکتور') + '</button></div>' +
      '<p class="pl-note">' + (PUBLIC ? 'این طرح قیمت ندارد. پس از ثبت درخواست، کارشناس فروش با شما تماس می‌گیرد و قیمت و شرایط را اعلام می‌کند.' : 'قیمت و مشخصات فنی را بعد از نهایی‌شدن طرح، کارشناس فروش با شما مرور می‌کند.') + '</p>';
  }
  // ---- public side: the request form and, after sending, the Chef Market sheet
  var F = { self: true }, DONE = null, SENT = '', FORM_AT = 0, REQ_BUSY = false, ERR = {}, ERR_ALL = '';
  function field(name, label, o) {
    o = o || {};
    return '<label class="pl-f' + (o.wide ? ' wide' : '') + (ERR[name] ? ' bad' : '') + '">' + label + '<input type="' + (o.type || 'text') + '" name="' + name + '" value="' + esc(F[name] || '') + '" autocomplete="' + (o.ac || 'off') + '"' +
      (o.mode ? ' inputmode="' + o.mode + '"' : '') + (o.dir ? ' dir="' + o.dir + '"' : '') + (o.max ? ' maxlength="' + o.max + '"' : '') + '>' + (ERR[name] ? '<small class="pl-fe">' + esc(ERR[name]) + '</small>' : '') + '</label>';
  }
  function requestLines() {
    return plan().filter(function (j) { return S.removed.indexOf(j.id) < 0 && pickFor(j.id); }).map(function (j) {
      var p = pickFor(j.id);
      return { id: p.id, code: String(p.code || '').slice(0, 20), name: String(p.name || '').slice(0, 120), brand: BRAND[p.src] || '', qty: qtyFor(j.id) };
    });
  }
  function stepRequest() {
    var lines = requestLines(), c = conceptOf(S.concept);
    return progress(2 + qList().length, 'اطلاعات شما') + '<h1>ارسال درخواست به کارشناس</h1><p class="pl-lead">اطلاعات خود را بنویسید تا کارشناس فروش مکث‌سیلور با شما تماس بگیرد. در این برگه قیمتی نیست؛ قیمت و شرایط را کارشناس فروش اعلام می‌کند.</p>' +
      '<section class="pl-req"><h3>طرح شما: ' + esc(c.t) + ' ' + SIZES[S.size].t + '</h3><ul class="pl-rl">' + lines.map(function (l) { return '<li><b>' + esc(l.name) + '</b><span>' + (l.brand ? esc(l.brand) + SEP : '') + faInt.format(l.qty) + ' عدد</span></li>'; }).join('') + '</ul></section>' +
      '<form class="pl-form" novalidate autocomplete="on">' + (ERR_ALL ? '<p class="pl-err" role="alert">' + esc(ERR_ALL) + '</p>' : '') +
      '<h3>مشخصات خریدار</h3><div class="pl-grid">' +
      field('name', 'نام و نام خانوادگی', { ac: 'name', wide: true, max: 80 }) + field('phone', 'شمارهٔ موبایل', { ac: 'tel-national', mode: 'numeric', dir: 'ltr', max: 14 }) + field('nid', 'کد ملی', { mode: 'numeric', dir: 'ltr', max: 10 }) +
      field('city', 'شهر', { ac: 'address-level2', max: 40 }) + field('zip', 'کد پستی', { ac: 'postal-code', mode: 'numeric', dir: 'ltr', max: 10 }) + field('address', 'نشانی کامل', { ac: 'street-address', wide: true, max: 300 }) + '</div>' +
      '<h3>تحویل‌گیرنده</h3><div class="pl-seg" role="radiogroup" aria-label="تحویل‌گیرنده">' +
      '<button type="button" role="radio" class="pl-opt" data-recv="self" aria-checked="' + !!F.self + '"><b>خودم تحویل می‌گیرم</b></button>' +
      '<button type="button" role="radio" class="pl-opt" data-recv="other" aria-checked="' + !F.self + '"><b>شخص دیگری</b><small>مشخصات او را بنویسید</small></button></div>' +
      (F.self ? '' : '<div class="pl-grid">' + field('rName', 'نام و نام خانوادگی گیرنده', { wide: true, max: 80 }) + field('rNid', 'کد ملی گیرنده', { mode: 'numeric', dir: 'ltr', max: 10 }) + field('rPhone', 'موبایل گیرنده', { mode: 'numeric', dir: 'ltr', max: 14 }) + '</div>') +
      '<div class="pl-grid"><label class="pl-f wide">توضیح (اختیاری)<input type="text" name="note" value="' + esc(F.note || '') + '" maxlength="500" autocomplete="off"></label></div>' +
      '<input class="pl-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<label class="pl-agree' + (ERR.agree ? ' bad' : '') + '"><input type="checkbox" name="agree"' + (F.agree ? ' checked' : '') + '><span>' + 'شرایط و ضوابط و سیاست حریم خصوصی را خوانده‌ام و می‌پذیرم. ' + '<a href="./legal.html#terms" target="_blank" rel="noopener">شرایط و ضوابط</a>' + SEP + '<a href="./legal.html#privacy" target="_blank" rel="noopener">حریم خصوصی</a>' + '</span></label>' + (ERR.agree ? '<small class="pl-fe">' + esc(ERR.agree) + '</small>' : '') +
      '<p class="pl-note">اطلاعات شما فقط برای تماس و پیگیری خرید در اختیار کارشناس فروش قرار می‌گیرد.</p>' +
      '<div class="pl-bar"><button type="button" class="pl-btn primary" data-send' + (REQ_BUSY ? ' disabled' : '') + '>' + (REQ_BUSY ? 'در حال ارسال…' : 'ارسال درخواست') + '</button></div></form>';
  }
  function sheetHelpers() { var f = new Intl.NumberFormat('fa-IR'); return { esc: esc, faInt: f, fa: f, fa0: function (s) { return s; }, money: function () { return ''; }, numWords: function () { return ''; }, totals: function () { return {}; }, payPrint: function () { return ''; } }; }
  function stepDone() {
    var d = DONE, j = window.MSEvents ? window.MSEvents.toJ(new Date()) : null, date = j ? j.jy + '/' + (j.jm < 10 ? '0' : '') + j.jm + '/' + (j.jd < 10 ? '0' : '') + j.jd : '';
    var doc = { template: 'chefmarket', docNo: d.code, date: date, customer: d.customer.name, customerCity: d.customer.city, customerPhone: d.customer.phone, customerAddress: d.customer.address, unit: 'تومان', lines: d.lines };
    var sparks = ['#ffcc2a', '#eb1d36', '#2eb872', '#4c8dff', '#ffcc2a', '#eb1d36', '#2eb872', '#4c8dff', '#ffcc2a', '#2eb872'].map(function (c, i) { return '<i style="--a:' + (i * 36) + 'deg;--c:' + c + '"></i>'; }).join('');
    return '<div class="pl-done"><div class="pl-seal" aria-hidden="true"><svg viewBox="0 0 52 52"><circle class="c" cx="26" cy="26" r="24"/><path class="t" d="M15 27l8 8 15-17"/></svg>' + sparks + '</div>' +
      '<h1>درخواست شما ثبت شد</h1><p class="pl-lead">کارشناس فروش به‌زودی با شمارهٔ <b dir="ltr">' + esc(d.customer.phone) + '</b> تماس می‌گیرد.</p>' +
      '<div class="pl-codebox"><span>کد پیگیری شما</span><b dir="ltr" id="plCode">' + esc(d.code) + '</b><button type="button" class="pl-copy" data-copy aria-label="کپی کد پیگیری">' + IC_COPY + '<span>کپی</span></button></div>' +
      '<p class="pl-note">این کد را نگه دارید و هنگام تماس با فروش بگویید.</p></div>' +
      '<div class="pl-sheetbox">' + window.MSInvoice.html(doc, sheetHelpers(), 'chefmarket') + '</div>' +
      '<div class="pl-bar"><button type="button" class="pl-btn ghost" data-newplan>طرح تازه</button><button type="button" class="pl-btn primary" data-print>چاپ یا ذخیرهٔ PDF</button></div>';
  }
  function copyCode(btn) {
    var el = document.getElementById('plCode'), txt = el ? el.textContent : '';
    function done(ok) { var s = btn.querySelector('span'); btn.classList.toggle('ok', ok); btn.innerHTML = (ok ? IC_TICK : IC_COPY) + '<span>' + (ok ? 'کپی شد' : 'کپی نشد؛ کد را نگه دارید') + '</span>'; setTimeout(function () { btn.classList.remove('ok'); btn.innerHTML = IC_COPY + '<span>کپی</span>'; }, 2200); }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(function () { done(true); }, function () { fallback(); }); } else fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } ta.remove(); done(ok);
    }
  }  function readForm() {
    var form = root.querySelector('.pl-form'); if (!form) return;
    Array.prototype.forEach.call(form.querySelectorAll('input[name]'), function (i) { F[i.name] = i.type === 'checkbox' ? i.checked : i.value; });
  }
  function sendRequest() {
    readForm();
    var hp = root.querySelector('input[name=website]');
    if (REQ_BUSY) return;
    if ((hp && hp.value) || Date.now() - FORM_AT < 4000) { ERR_ALL = 'لطفاً چند ثانیه بعد دوباره تلاش کنید.'; ERR = {}; render(); return; }
    var last = 0; try { last = Number(localStorage.getItem('ms-req-last') || 0); } catch (e) { /* ignore */ }
    if (Date.now() - last < 120000) { ERR_ALL = 'درخواست قبلی شما تازه ثبت شده است؛ چند دقیقه صبر کنید.'; ERR = {}; render(); return; }
    var lines = requestLines(); if (!lines.length) { ERR_ALL = 'طرح شما کالایی ندارد.'; render(); return; }
    var r = window.MSRequests.check({ name: F.name, phone: F.phone, nid: F.nid, address: F.address, city: F.city, zip: F.zip, self: F.self, rName: F.rName, rNid: F.rNid, rPhone: F.rPhone, note: F.note, agree: F.agree });
    ERR = r.errors; ERR_ALL = r.ok ? '' : 'چند مورد را اصلاح کنید.';
    if (!r.ok) { render(); var bad = root.querySelector('.pl-f.bad input'); if (bad) bad.focus(); return; }
    var c = conceptOf(S.concept), serve = S.serve.map(function (sid) { var s = c.serve.filter(function (x) { return x.id === sid; })[0]; return s ? s.t : ''; }).filter(Boolean).join('، ').slice(0, 160);
    var payload = { customer: r.customer, receiver: r.receiver, lines: lines, plan: { concept: c.t, size: SIZES[S.size].t, serve: serve }, note: r.note, terms: r.terms, src: 'planner' };
    REQ_BUSY = true; render();
    window.MSRequests.submit(payload).then(function (code) {
      REQ_BUSY = false; DONE = { code: code, customer: r.customer, lines: lines }; F = { self: true };
      try { localStorage.setItem('ms-req-last', String(Date.now())); } catch (e) { /* ignore */ }
      render(); window.scrollTo(0, 0);
    }, function (e) { REQ_BUSY = false; ERR_ALL = window.MSRequests.errText(e); render(); window.scrollTo(0, 0); });
  }
  function render() {
    if (!ready) { root.innerHTML = failed ? '<p class="pl-note">کاتالوگ بارگذاری نشد؛ اتصال را بررسی و صفحه را دوباره باز کنید.</p>' : '<p class="pl-note">در حال آماده‌سازی…</p>'; return; }
    var open = firstOpen();
    if (S.concept && S.step >= 2 && open >= 0) { S.step = 1; S.q = open; }     // the plan waits until every question has an answer
    if (S.step === 1 && S.q >= qList().length) S.q = qList().length - 1;
    if (PUBLIC && DONE) root.innerHTML = stepDone();
    else if (PUBLIC && S.step === 3 && S.concept) root.innerHTML = stepRequest();
    else if (S.step === 2 && S.concept) root.innerHTML = stepPlan();
    else if (S.step === 1 && S.concept) root.innerHTML = stepQuestions();
    else root.innerHTML = stepConcept();
  }

  // ---- dialogs: similar alternatives and the details of one product
  var dlg = document.createElement('dialog');
  dlg.className = 'pl-dialog';
  document.body.appendChild(dlg);
  function swapDialog(job) {
    var cur = pickFor(job), list = candidates(job).filter(function (it) { return !cur || it.id !== cur.id; });
    var fp = function (it) { return it.dims ? (it.dims.l || 0) * (it.dims.w || 0) : 0; }, base = cur ? fp(cur) : 0;
    list.sort(function (a, b) { return Math.abs(fp(a) - base) - Math.abs(fp(b) - base); });
    list = list.slice(0, 8);
    dlg.innerHTML = '<div class="pl-dbar"><h2>جایگزین «' + JOBS[job].t + '»</h2><button type="button" class="pl-ic" data-close aria-label="بستن">' + ICO.close + '</button></div>' +
      '<p class="pl-note">نمونه‌های مشابه، نزدیک‌ترین اندازه اول:</p><ul class="pl-alts">' + list.map(function (it) {
        return '<li><button type="button" data-pickprod="' + esc(it.id) + '" data-job="' + job + '"><span class="pl-img">' + (it.img ? '<img src="' + esc(it.img) + '" alt="">' : '') + '</span>' +
          '<span class="pl-pn"><b>' + esc(it.name) + '</b><span>' + (BRAND[it.src] || '') + (it.dims ? SEP + faInt.format(it.dims.l) + '×' + faInt.format(it.dims.w) + ' سانتی‌متر' : '') + '</span></span></button></li>';
      }).join('') + '</ul>';
    if (!dlg.open) dlg.showModal();
  }
  function infoDialog(id) {
    var it = BY[id]; if (!it) return;
    dlg.innerHTML = '<div class="pl-dbar"><h2>' + esc(it.name) + '</h2><button type="button" class="pl-ic" data-close aria-label="بستن">' + ICO.close + '</button></div>' +
      (it.img ? '<img class="pl-big" src="' + esc(it.img) + '" alt="">' : '') +
      '<p class="pl-desc">' + esc((it.desc || '').slice(0, 420)) + (it.desc && it.desc.length > 420 ? '…' : '') + '</p>' +
      '<dl class="pl-specs">' + (it.dims ? '<div><dt>ابعاد (طول × عرض × ارتفاع)</dt><dd>' + faInt.format(it.dims.l) + ' × ' + faInt.format(it.dims.w) + ' × ' + faInt.format(it.dims.h) + ' سانتی‌متر</dd></div>' : '') +
      (it.wt ? '<div><dt>وزن</dt><dd>' + faInt.format(it.wt) + ' کیلوگرم</dd></div>' : '') +
      (it.specs || []).slice(0, 5).map(function (s) { return '<div><dt>' + esc(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd></div>'; }).join('') + '</dl>' +
      '<p class="pl-note">جزئیات فنی بیشتر را در کاتالوگ یا با کارشناس مرور کنید.</p>';
    if (!dlg.open) dlg.showModal();
  }

  // ---- put the plan into the proforma draft and open the catalog
  function toProforma() {
    var jobs = plan().filter(function (j) { return S.removed.indexOf(j.id) < 0 && pickFor(j.id); });
    var key = 'ms-proforma-v1', inv = null;
    try { inv = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { /* ignore */ }
    if (!inv || typeof inv !== 'object') inv = { lines: [], unit: 'تومان', docNo: '', issuer: '', customer: '', custCity: '', custPhone: '', custAddr: '', discount: 0, discMode: 'pct', tax: 10, pay: { mode: 'cash', cashVal: 50, cashUnit: 'pct', count: 1, cheques: [], custom: false } };
    inv.lines = inv.lines || [];
    jobs.forEach(function (j) {
      var p = pickFor(j.id), q = qtyFor(j.id), l = inv.lines.filter(function (x) { return x.id === p.id; })[0];
      if (l) l.qty = (l.qty || 0) + q; else inv.lines.push({ id: p.id, qty: q, price: 0 });
    });
    try { localStorage.setItem(key, JSON.stringify(inv)); } catch (e) { /* ignore */ }
    location.href = './product-catalog.html';
  }

  // a single-choice answer moves on by itself after a short moment, so the visitor sees what was chosen
  function nextQuestion(k) {
    setTimeout(function () { if (S.step === 1 && qList()[S.q] === k) { S.q++; save(); render(); window.scrollTo(0, 0); } }, 280);
  }
  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-concept]'))) { S.concept = t.getAttribute('data-concept'); S.serve = []; S.pick = {}; S.removed = []; S.qty = {}; S.ans = {}; S.q = 0; S.step = 1; save(); render(); window.scrollTo(0, 0); return; }
    if ((t = e.target.closest('[data-budget]'))) { S.budget = t.getAttribute('data-budget'); S.ans.budget = true; S.pick = {}; save(); render(); nextQuestion('budget'); return; }
    if ((t = e.target.closest('[data-size]'))) { S.size = Number(t.getAttribute('data-size')); S.ans.size = true; S.qty = {}; S.pick = {}; save(); render(); nextQuestion('size'); return; }
    if ((t = e.target.closest('[data-serve]'))) { var id = t.getAttribute('data-serve'), i = S.serve.indexOf(id); if (i >= 0) S.serve.splice(i, 1); else S.serve.push(id); save(); render(); return; }
    if (e.target.closest('[data-plan]')) { S.step = 2; save(); render(); window.scrollTo(0, 0); return; }
    if (e.target.closest('[data-back]')) {
      if (S.step === 1) { if (S.q > 0) S.q--; else S.step = 0; }
      else if (S.step === 2) { S.step = 1; S.q = qList().length - 1; }
      else S.step = Math.max(0, S.step - 1);
      save(); render(); window.scrollTo(0, 0); return;
    }
    if ((t = e.target.closest('[data-copy]'))) { copyCode(t); return; }
    if ((t = e.target.closest('[data-remove]'))) { S.removed.push(t.getAttribute('data-remove')); save(); render(); return; }
    if ((t = e.target.closest('[data-restore]'))) { S.removed = S.removed.filter(function (x) { return x !== t.getAttribute('data-restore'); }); save(); render(); return; }
    if ((t = e.target.closest('[data-q]'))) { var jb = t.getAttribute('data-q'), n = Math.max(1, Math.min(20, qtyFor(jb) + Number(t.getAttribute('data-d')))); S.qty[jb] = n; save(); render(); return; }
    if ((t = e.target.closest('[data-swap]'))) { swapDialog(t.getAttribute('data-swap')); return; }
    if ((t = e.target.closest('[data-pickprod]'))) { S.pick[t.getAttribute('data-job')] = t.getAttribute('data-pickprod'); save(); dlg.close(); render(); return; }
    if ((t = e.target.closest('[data-info]'))) { infoDialog(t.getAttribute('data-info')); return; }
    if (e.target.closest('[data-toinv]')) { toProforma(); return; }
    if (e.target.closest('[data-request]')) { S.step = 3; save(); ERR = {}; ERR_ALL = ''; FORM_AT = Date.now(); render(); window.scrollTo(0, 0); return; }
    if ((t = e.target.closest('[data-recv]'))) { readForm(); F.self = t.getAttribute('data-recv') === 'self'; ERR = {}; render(); return; }
    if (e.target.closest('[data-send]')) { sendRequest(); return; }
    if (e.target.closest('[data-print]')) { window.print(); return; }
    if (e.target.closest('[data-newplan]')) { DONE = null; S = { step: 0, q: 0, ans: {}, concept: '', size: 1, budget: 'mid', serve: [], pick: {}, removed: [], qty: {} }; save(); render(); window.scrollTo(0, 0); return; }
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
  });

  // the business cards lean toward the pointer (or the finger) so the products seem to stand out of the card
  root.addEventListener('pointermove', function (e) {
    var c = e.target.closest && e.target.closest('.pl-card');
    if (!c) return;
    var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    c.style.setProperty('--ry', (x * 12).toFixed(1) + 'deg'); c.style.setProperty('--rx', (-y * 9).toFixed(1) + 'deg');
  });
  root.addEventListener('pointerout', function (e) {
    var c = e.target.closest && e.target.closest('.pl-card');
    if (c && !c.contains(e.relatedTarget)) { c.style.removeProperty('--ry'); c.style.removeProperty('--rx'); }
  });
  // public: the retired product ids, so the public list never offers a code that is out of use
  function loadPubRet() {
    if (!PUBLIC || !window.firebase || !window.MS_FIREBASE) return Promise.resolve();
    var app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(window.MS_FIREBASE);
    return Promise.race([window.firebase.firestore(app).collection('public_config').doc('retired').get(), new Promise(function (ok) { setTimeout(ok, 4000); })]).then(function (s) {
      var ids = s && s.exists ? (s.data().ids || []) : []; PUBRET = {}; ids.forEach(function (id) { PUBRET[id] = true; });
    }, function () { /* offline or not published yet: nothing is hidden */ });
  }
  var q = VER ? '?v=' + VER : '';
  Promise.all([
    loadPubRet(),
    fetch('./assets/catalog.json' + q).then(function (r) { return r.json(); }),
    fetch('./assets/product-tiers.json' + q).then(function (r) { return r.ok ? r.json() : {}; }).then(null, function () { return {}; })
  ]).then(function (res) {
    res.shift();
    CAT = res[0]; CAT.items.forEach(function (it) { BY[it.id] = it; });
    var tj = res[1] || {}, map = tj.tiers || tj;
    Object.keys(map).forEach(function (id) { var w = TIER_WORD[map[id]]; if (BY[id] && w) TIERS[id] = w; });
    TIERS_ON = Object.keys(TIERS).length >= 20;   // a budget question only makes sense once enough products carry a level
    ready = true; render();
  }).then(null, function () { failed = true; render(); });
  render();
})();
