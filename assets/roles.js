// Role catalogue and the capability table of the portal. One place, read by role-gate.js, sync.js and panel.js.
// This is navigation and interface behaviour only. Real enforcement is firestore.rules, which carries the same table:
// keep the two in step (a role added or moved here must be added or moved there).
(function (w) {
  'use strict';
  var LABEL = {
    manager: 'مدیریت عمومی و توسعه',
    ceo: 'مدیرعامل و هیئت‌مدیره',
    sales_manager: 'مدیر فروش و توسعه بازار',
    visitor: 'کارشناس فروش و توسعه بازار',
    account_manager: 'اکانت منیجر',
    finance: 'مالی و حسابداری',
    operations: 'عملیات و لجستیک',
    production: 'تولید و تأمین',
    service: 'خدمات پس از فروش',
    marketing: 'بازاریابی و برند',
    hr: 'منابع انسانی'
  };
  // roles offered when an account is edited
  var ORDER = ['visitor', 'sales_manager', 'account_manager', 'finance', 'operations', 'production', 'service', 'marketing', 'hr', 'ceo', 'manager'];
  // values already stored on accounts that were merged into another role
  var ALIAS = { accounting: 'finance', it: 'manager' };
  // area -> roles that may enter it (canonical keys only)
  var AREA = {
    dashboard: ['manager', 'ceo', 'sales_manager', 'finance'],                          // CEO dashboard
    analysis: ['manager', 'ceo', 'sales_manager', 'account_manager', 'finance'],        // customer and product sales analysis
    brand: ['manager', 'ceo', 'sales_manager', 'account_manager', 'finance', 'operations', 'production', 'service', 'marketing', 'hr'],
    invoices: ['manager', 'ceo', 'sales_manager', 'account_manager', 'finance'],        // read every proforma, not only one's own
    team: ['manager', 'ceo', 'sales_manager', 'hr'],                                    // see the team list
    roleAdmin: ['manager', 'ceo'],                                                      // create accounts, set role and code
    people: ['manager', 'ceo', 'hr'],                                                   // name, phone, active flag of others
    userDelete: ['manager', 'ceo', 'hr'],                                               // remove an account (hr never one of management or the CEO)
    territory: ['manager', 'ceo', 'sales_manager'],                                     // provinces and cities of a specialist
    commission: ['manager', 'ceo', 'sales_manager', 'finance'],                         // see the rate table and every region's result
    commissionEdit: ['finance'],                                                        // enters the rate table (draft)
    commissionReview: ['sales_manager'],                                                // confirms regions and attribution
    commissionApprove: ['manager', 'ceo']                                               // approves rates and publishes the results
  };
  // profile fields that exist only for some roles (name, phone and the active flag belong to everyone)
  var FIELDS = {
    visitor: ['code', 'territory', 'proformas'],     // document code, the provinces they cover, and their own proforma figures
    sales_manager: ['code']             // issues proformas too, but covers no province of their own
  };
  function norm(role) { role = role || 'visitor'; return ALIAS[role] || role; }
  function can(role, area) { return (AREA[area] || []).indexOf(norm(role)) >= 0; }
  function label(role) { return LABEL[norm(role)] || LABEL.visitor; }
  function hasField(role, field) { return (FIELDS[norm(role)] || []).indexOf(field) >= 0; }
  w.MSRoles = { LABEL: LABEL, ORDER: ORDER, AREA: AREA, FIELDS: FIELDS, norm: norm, can: can, label: label, hasField: hasField };
})(window);
