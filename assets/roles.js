// Role catalogue and the capability table of the portal. One place, read by role-gate.js, sync.js and panel.js.
// This is navigation and interface behaviour only. Real enforcement is firestore.rules, which carries the same table:
// keep the two in step (a role added or moved here must be added or moved there).
(function (w) {
  'use strict';
  var LABEL = {
    manager: 'مدیر (عمومی)',
    ceo: 'مدیرعامل',
    sales_manager: 'مدیر فروش و توسعه بازار',
    visitor: 'کارشناس فروش و توسعه بازار',
    accounting: 'حسابداری و اکانت منیجر',
    finance: 'مالی',
    operations: 'عملیات و لجستیک',
    production: 'تولید و تأمین',
    service: 'خدمات پس از فروش',
    marketing: 'بازاریابی و برند',
    hr: 'منابع انسانی',
    it: 'فناوری و توسعه'
  };
  var ORDER = ['visitor', 'sales_manager', 'accounting', 'finance', 'operations', 'production', 'service', 'marketing', 'hr', 'ceo', 'it', 'manager'];
  // area -> roles that may enter it
  var AREA = {
    dashboard: ['manager', 'ceo', 'sales_manager', 'finance', 'it'],                     // CEO dashboard
    analysis: ['manager', 'ceo', 'sales_manager', 'accounting', 'finance', 'it'],       // customer and product sales analysis
    brand: ['manager', 'ceo', 'sales_manager', 'accounting', 'finance', 'operations', 'production', 'service', 'marketing', 'hr', 'it'],
    invoices: ['manager', 'ceo', 'sales_manager', 'accounting', 'it'],                  // read every proforma, not only one's own
    team: ['manager', 'ceo', 'sales_manager', 'hr', 'it'],                              // see the team list
    roleAdmin: ['manager', 'ceo', 'it'],                                                // create accounts, set role and code
    people: ['manager', 'ceo', 'hr', 'it'],                                             // name, phone, active flag of others
    territory: ['manager', 'ceo', 'sales_manager', 'it'],                               // provinces and cities of a specialist
    commission: ['manager', 'ceo', 'sales_manager', 'finance', 'it'],                   // see the rate table and every region's result
    commissionEdit: ['finance'],                                                        // enters and calculates the rate table (draft)
    commissionReview: ['sales_manager'],                                                // confirms regions and attribution
    commissionApprove: ['manager', 'ceo']                                               // approves rates and publishes the results
  };
  function can(role, area) { return (AREA[area] || []).indexOf(role) >= 0; }
  function label(role) { return LABEL[role] || LABEL.visitor; }
  w.MSRoles = { LABEL: LABEL, ORDER: ORDER, AREA: AREA, can: can, label: label };
})(window);
