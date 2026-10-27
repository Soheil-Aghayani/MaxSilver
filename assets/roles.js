// Role catalogue and the capability table of the portal. One place, read by role-gate.js, sync.js and panel.js.
// This is navigation and interface behaviour only. Real enforcement is firestore.rules, which carries the same table:
// keep the two in step (a role added or moved here must be added or moved there).
(function (w) {
  'use strict';
  var LABEL = {
    manager: 'تکنولوژی ارتباطات سازمانی',
    ceo: 'مدیریت',
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
    pricesEdit: ['manager', 'ceo', 'sales_manager'],                                    // edits the list prices of the catalog (everyone signed in sees them)
    bankPick: ['finance'],                                                              // chooses the bank account on an approved pre-invoice
    pricesAudit: ['manager', 'ceo', 'sales_manager', 'finance'],                         // opens the prices page: finance downloads the audit template; the others also edit and upload it
    crm: ['manager', 'ceo', 'sales_manager', 'visitor', 'account_manager'],                                // purchase requests from the public planner: follow-up and decisions (a visitor sees the ones given to them)
    academy: ['manager', 'ceo', 'sales_manager', 'visitor', 'account_manager', 'finance', 'operations', 'production', 'service', 'marketing', 'hr'],   // training: every signed-in role; the page shows each role only its own track
    hiring: ['manager', 'ceo', 'hr'],                                                    // the employment form: print, PDF, Word with fillable boxes (human resources and management)
    salesProcess: ['manager', 'ceo', 'sales_manager', 'visitor', 'account_manager'],         // the nine-step sales process map (sales roles and management)
    fairs: ['manager', 'ceo', 'sales_manager', 'marketing'],                            // upcoming exhibitions (management, sales manager, marketing)
    occasions: ['manager', 'ceo', 'sales_manager', 'visitor', 'marketing'],              // seasonal campaign tiles and pages (Halloween, Yalda...): staff only, never for people without an account
    events: ['manager', 'ceo', 'sales_manager', 'visitor', 'marketing'],                           // occasions calendar and its bell reminders
    warehouse: ['operations', 'account_manager', 'manager', 'ceo', 'sales_manager', 'production'],   // live inventory: who sees it
    warehouseEdit: ['operations', 'manager'],                                           // enters stock by hand or from the Excel template
    warehouseClaim: ['account_manager'],                                                // claims (reserves) and releases stock for an order
    bankAccounts: ['account_manager', 'finance', 'manager', 'ceo', 'sales_manager'],   // bank accounts on pre-invoices: who sees them
    bankEdit: ['account_manager'],                                                      // adds and edits them (only the account manager)
    features: ['manager'],                                                              // switches parts of the site on and off (technology lead only)
    roadmapEdit: ['manager'],                                                           // loads or replaces the roadmap (the owner, or people he names on «دسترسی‌ها»)
    competitorsEdit: ['manager'],                                                       // loads or replaces the competitor file (same)
    assistant: ['manager', 'ceo', 'sales_manager', 'account_manager', 'finance', 'operations', 'hr'],   // the catalog assistant (asks about products)
    roadmap: ['manager', 'ceo', 'sales_manager'],                                       // the milestone timeline (management, CEO, sales manager)
    siteUpdate: ['manager'],                                                            // uploads a zip that updates the portal pages on the host (technology lead only)
    backup: ['manager', 'ceo'],                                                         // downloads a backup of the database (management only)
    competitors: ['manager', 'ceo', 'sales_manager'],                                   // competitor analysis (staff only)
    advertising: ['manager', 'ceo', 'sales_manager', 'marketing'],                      // advertising strategy tree
    invoices: ['manager', 'ceo', 'sales_manager', 'account_manager', 'finance'],        // read every proforma, not only one's own
    team: ['manager', 'ceo', 'sales_manager', 'hr'],                                    // see the team list
    roleAdmin: ['manager'],                                                             // gives anyone authority: create accounts, set role and code, name the price editors, load or replace data files (roadmap, competitors)
    people: ['manager', 'ceo', 'hr'],                                                   // name, phone, active flag of others
    userDelete: ['manager', 'ceo', 'hr'],                                               // remove an account (hr never one of management or the CEO)
    territory: ['manager', 'ceo', 'sales_manager'],                                     // provinces and cities of a specialist
    commission: ['manager', 'ceo', 'sales_manager', 'finance'],                         // see the rate table and every region's result
    commissionEdit: ['finance'],                                                        // enters the rate table (draft)
    commissionReview: ['sales_manager'],                                                // confirms regions and attribution
    commissionApprove: ['manager', 'ceo'],                                              // approves rates and publishes the results
    customers: ['manager', 'ceo', 'sales_manager', 'account_manager', 'finance', 'visitor'],   // the customer database page (visitors see only their own)
    customerAll: ['manager', 'ceo', 'sales_manager', 'account_manager', 'finance'],            // every customer, not only one's own
    customerEdit: ['manager', 'ceo', 'sales_manager', 'account_manager'],                     // contact details and notes of any customer
    customerAssign: ['manager', 'ceo', 'sales_manager'],                                      // group and customer owners, and the import
    customerImport: ['manager', 'ceo', 'sales_manager'],
    invoiceCreate: ['manager', 'ceo', 'sales_manager', 'visitor', 'account_manager', 'finance', 'operations', 'production', 'service', 'marketing'],   // makes a pre-invoice (not human resources); the screen hides it, the database rules still let any approved account save one
    invoiceReview: ['account_manager'],                                                 // approves a proforma or refuses it with a written reason
    jobEdit: ['manager', 'ceo', 'hr', 'sales_manager'],                                   // job descriptions: edit those of others (hr, management; the sales manager only salespeople)
    invoiceDecide: ['manager', 'ceo', 'sales_manager']                                  // accepts or declines a refusal (accepting archives the proforma)
  };
  // two letters that open every document number, so the kind of issuer is known before the name is read
  var CODE = { manager: 'IT', ceo: 'CE', sales_manager: 'SM', visitor: 'SE', account_manager: 'AM', finance: 'FN', operations: 'OP', production: 'PR', service: 'SV', marketing: 'MK', hr: 'HR' };
  // profile fields that exist only for some roles (name, phone and the active flag belong to everyone)
  var FIELDS = {
    visitor: ['code', 'territory', 'proformas'],     // document code, the provinces they cover, and their own proforma figures
    sales_manager: ['code']             // issues proformas too, but covers no province of their own
  };
  function norm(role) { role = role || 'visitor'; return ALIAS[role] || role; }
  function can(role, area) { return (AREA[area] || []).indexOf(norm(role)) >= 0; }
  function label(role) { return LABEL[norm(role)] || LABEL.visitor; }
  function hasField(role, field) { return (FIELDS[norm(role)] || []).indexOf(field) >= 0; }
  function codeOf(role) { return CODE[norm(role)] || 'XX'; }
  w.MSRoles = { LABEL: LABEL, ORDER: ORDER, AREA: AREA, FIELDS: FIELDS, CODE: CODE, norm: norm, can: can, label: label, hasField: hasField, codeOf: codeOf };
})(window);
