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

  var S = { step: 0, concept: '', size: 1, budget: 'mid', serve: [], pick: {}, removed: [], qty: {} };
  var TIERS = {}, TIERS_ON = false;   // product id -> 'eco' | 'mid' | 'pro' (assets/product-tiers.json, optional)
  var TIER_RANK = { eco: 0, mid: 1, pro: 2 }, TIER_WORD = { 'اقتصادی': 'eco', 'متعادل': 'mid', 'حرفه‌ای': 'pro', 'حرفه ای': 'pro', eco: 'eco', mid: 'mid', pro: 'pro' };
  try { var saved = JSON.parse(localStorage.getItem(STATE_KEY) || 'null'); if (saved && saved.concept) S = Object.assign(S, saved); } catch (e) { /* ignore */ }
  function save() { try { localStorage.setItem(STATE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  var CAT = null, BY = {}, ready = false, failed = false;
  var nz = function (s) { return String(s || '').replace(/[‌\s]/g, ''); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function conceptOf(id) { return CONCEPTS.filter(function (c) { return c.id === id; })[0]; }
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
    var list = CAT.items.filter(function (it) { return cats.indexOf(nz(it.cat)) >= 0; });
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
  function dots() {
    return '<ol class="pl-steps" aria-label="مراحل">' + ['چه می‌خواهید', 'اندازه و منو', 'طرح پیشنهادی'].map(function (t, i) {
      return '<li class="' + (i === S.step ? 'on' : (i < S.step ? 'done' : '')) + '"><span>' + faInt.format(i + 1) + '</span>' + t + '</li>';
    }).join('') + '</ol>';
  }
  var HERO = { cafe: ['cake', 'coffee', 'blend'], fastfood: ['fry', 'grill', 'burger'], restaurant: ['bain', 'stove', 'doner'],
    pizza: ['dough', 'pizza', 'topping'], bakery: ['oven', 'cake', 'dough'], juice: ['ice', 'juice', 'blend'] };
  var TINT = { cafe: '#fde8c8', fastfood: '#fddad3', restaurant: '#e1ecfb', pizza: '#fcd9cf', bakery: '#fdf0c4', juice: '#d9f3e4' };
  function stage(id) {
    var imgs = (HERO[id] || []).map(function (j) { var p = CAT ? pickFor(j, id) : null; return p && p.img ? p.img : ''; }).filter(Boolean);
    if (!imgs.length) return '<span class="pl-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + CONCEPT_ICON[id] + '</svg></span>';
    var pos = [['0', '4%', '-7deg', '34px'], ['1', '30%', '0deg', '64px'], ['2', '58%', '7deg', '30px']];
    return '<span class="pl-stage" aria-hidden="true">' + imgs.slice(0, 3).map(function (src, i) {
      var q = pos[imgs.length === 3 ? i : (imgs.length === 2 ? [1, 2][i] : 1)];
      return '<span class="pl-pop" style="--l:' + q[1] + ';--r:' + q[2] + ';--z:' + q[3] + ';--d:' + (i * 0.4) + 's"><i></i><img src="' + esc(src) + '" alt=""></span>';
    }).join('') + '</span>';
  }
  function stepConcept() {
    return dots() + '<h1>چه کسب‌وکاری می‌خواهید راه بیندازید؟</h1><p class="pl-lead">فقط یک انتخاب. لازم نیست جزئیات فنی بدانید؛ ما قدم‌به‌قدم کمک می‌کنیم.</p>' +
      '<div class="pl-cards">' + CONCEPTS.map(function (c) {
        return '<button type="button" class="pl-card" data-concept="' + c.id + '" style="--tint:' + TINT[c.id] + '">' + stage(c.id) + '<b>' + c.t + '</b><small>' + c.d + '</small></button>';
      }).join('') + '</div>';
  }
  function stepQuestions() {
    var c = conceptOf(S.concept);
    return dots() + '<h1>' + c.t + '؛ دو سؤال کوتاه</h1>' +
      '<h2 class="pl-q">اندازهٔ کار شما؟</h2><div class="pl-seg" role="radiogroup" aria-label="اندازه">' + SIZES.map(function (z) {
        return '<button type="button" role="radio" class="pl-opt" data-size="' + z.id + '" aria-checked="' + (S.size === z.id) + '"><b>' + z.t + '</b><small>' + z.d + '</small></button>';
      }).join('') + '</div>' +
      (TIERS_ON ? '<h2 class="pl-q">سطح بودجه؟</h2><div class="pl-seg" role="radiogroup" aria-label="سطح بودجه">' + [['eco', 'اقتصادی', 'ساده و مقرون‌به‌صرفه'], ['mid', 'متعادل', 'تعادل قیمت و کیفیت'], ['pro', 'حرفه‌ای', 'بالاترین دوام و ظرفیت']].map(function (b) {
        return '<button type="button" role="radio" class="pl-opt" data-budget="' + b[0] + '" aria-checked="' + (S.budget === b[0]) + '"><b>' + b[1] + '</b><small>' + b[2] + '</small></button>';
      }).join('') + '</div>' : '') +
      '<h2 class="pl-q">چه چیزهایی سرو می‌کنید؟ <small>هر چند تا که می‌خواهید</small></h2><div class="pl-chips">' + c.serve.map(function (s) {
        return '<button type="button" class="pl-chip" data-serve="' + s.id + '" aria-pressed="' + (S.serve.indexOf(s.id) >= 0) + '">' + s.t + '</button>';
      }).join('') + '</div>' +
      '<div class="pl-nav"><button type="button" class="pl-btn ghost" data-back>بازگشت</button><button type="button" class="pl-btn primary" data-plan>ساخت طرح پیشنهادی</button></div>';
  }
  function jobCard(j) {
    var p = pickFor(j.id), removed = S.removed.indexOf(j.id) >= 0, job = JOBS[j.id];
    var badge = j.kind === 'gap' ? '<span class="pl-gap">تکمیل‌کننده</span>' : '';
    if (removed) return '<li class="pl-job off"><div class="pl-jt"><b>' + job.t + '</b>' + badge + '</div><button type="button" class="pl-link" data-restore="' + j.id + '">برگرداندن</button></li>';
    if (!p) return '<li class="pl-job nocat"><div class="pl-jt"><b>' + job.t + '</b>' + badge + '</div><p class="pl-why">' + j.why + '</p><p class="pl-adv">برای این مورد با کارشناس مشورت کنید؛ در کاتالوگ فعلی نیست.</p>' +
      '<div class="pl-acts"><button type="button" class="pl-ic" data-remove="' + j.id + '" aria-label="حذف" title="حذف">' + ICO.trash + '</button></div></li>';
    var alts = candidates(j.id).length > 1;
    return '<li class="pl-job"><div class="pl-jt"><b>' + job.t + '</b>' + badge + '</div><p class="pl-why">' + j.why + '</p>' +
      '<div class="pl-prod"><button type="button" class="pl-img" data-info="' + esc(p.id) + '" aria-label="جزئیات ' + esc(p.name) + '">' + (p.img ? '<img src="' + esc(p.img) + '" alt="">' : '') + '</button>' +
      '<div class="pl-pn"><b>' + esc(p.name) + '</b><span>' + (BRAND[p.src] || '') + (p.dims ? ' · ' + faInt.format(p.dims.l) + '×' + faInt.format(p.dims.w) + ' سانتی‌متر' : '') + '</span></div></div>' +
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
    return dots() + '<h1>طرح پیشنهادی برای ' + c.t + ' ' + SIZES[S.size].t + '</h1>' +
      '<p class="pl-lead">برای هر کار یک دستگاه پیشنهاد شده. هرکدام را می‌توانید با نمونهٔ مشابه عوض یا حذف کنید. موارد «تکمیل‌کننده» چیزهایی است که معمولاً فراموش می‌شود.</p>' +
      '<div class="pl-sum"><span><b>' + faInt.format(live.length) + '</b> کار</span><span><b>' + faInt.format(machines) + '</b> دستگاه</span></div>' + zones +
      '<div class="pl-bar"><button type="button" class="pl-btn ghost" data-back>تغییر انتخاب‌ها</button><button type="button" class="pl-btn primary" data-toinv' + (live.length ? '' : ' disabled') + '>افزودن به پیش‌فاکتور</button></div>' +
      '<p class="pl-note">قیمت و مشخصات فنی را بعد از نهایی‌شدن طرح، کارشناس فروش با شما مرور می‌کند.</p>';
  }
  function render() {
    if (!ready) { root.innerHTML = failed ? '<p class="pl-note">کاتالوگ بارگذاری نشد؛ اتصال را بررسی و صفحه را دوباره باز کنید.</p>' : '<p class="pl-note">در حال آماده‌سازی…</p>'; return; }
    if (S.step === 2 && S.concept) root.innerHTML = stepPlan();
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
          '<span class="pl-pn"><b>' + esc(it.name) + '</b><span>' + (BRAND[it.src] || '') + (it.dims ? ' · ' + faInt.format(it.dims.l) + '×' + faInt.format(it.dims.w) + ' سانتی‌متر' : '') + '</span></span></button></li>';
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

  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-concept]'))) { S.concept = t.getAttribute('data-concept'); S.serve = []; S.pick = {}; S.removed = []; S.qty = {}; S.step = 1; save(); render(); window.scrollTo(0, 0); return; }
    if ((t = e.target.closest('[data-budget]'))) { S.budget = t.getAttribute('data-budget'); S.pick = {}; save(); render(); return; }
    if ((t = e.target.closest('[data-size]'))) { S.size = Number(t.getAttribute('data-size')); S.qty = {}; S.pick = {}; save(); render(); return; }
    if ((t = e.target.closest('[data-serve]'))) { var id = t.getAttribute('data-serve'), i = S.serve.indexOf(id); if (i >= 0) S.serve.splice(i, 1); else S.serve.push(id); save(); render(); return; }
    if (e.target.closest('[data-plan]')) { S.step = 2; save(); render(); window.scrollTo(0, 0); return; }
    if (e.target.closest('[data-back]')) { S.step = Math.max(0, S.step - 1); save(); render(); window.scrollTo(0, 0); return; }
    if ((t = e.target.closest('[data-remove]'))) { S.removed.push(t.getAttribute('data-remove')); save(); render(); return; }
    if ((t = e.target.closest('[data-restore]'))) { S.removed = S.removed.filter(function (x) { return x !== t.getAttribute('data-restore'); }); save(); render(); return; }
    if ((t = e.target.closest('[data-q]'))) { var jb = t.getAttribute('data-q'), n = Math.max(1, Math.min(20, qtyFor(jb) + Number(t.getAttribute('data-d')))); S.qty[jb] = n; save(); render(); return; }
    if ((t = e.target.closest('[data-swap]'))) { swapDialog(t.getAttribute('data-swap')); return; }
    if ((t = e.target.closest('[data-pickprod]'))) { S.pick[t.getAttribute('data-job')] = t.getAttribute('data-pickprod'); save(); dlg.close(); render(); return; }
    if ((t = e.target.closest('[data-info]'))) { infoDialog(t.getAttribute('data-info')); return; }
    if (e.target.closest('[data-toinv]')) { toProforma(); return; }
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
  var q = VER ? '?v=' + VER : '';
  Promise.all([
    fetch('./assets/catalog.json' + q).then(function (r) { return r.json(); }),
    fetch('./assets/product-tiers.json' + q).then(function (r) { return r.ok ? r.json() : {}; }).then(null, function () { return {}; })
  ]).then(function (res) {
    CAT = res[0]; CAT.items.forEach(function (it) { BY[it.id] = it; });
    var tj = res[1] || {}, map = tj.tiers || tj;
    Object.keys(map).forEach(function (id) { var w = TIER_WORD[map[id]]; if (BY[id] && w) TIERS[id] = w; });
    TIERS_ON = Object.keys(TIERS).length >= 20;   // a budget question only makes sense once enough products carry a level
    ready = true; render();
  }).then(null, function () { failed = true; render(); });
  render();
})();
