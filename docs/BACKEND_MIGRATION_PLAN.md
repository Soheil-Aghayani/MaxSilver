# Moving the portal's data to an Iranian server (ParsPack): audit and plan

Status: proposal, nothing built yet. Written after reading the code on 2026-10-17.
Goal: staff and partners use the portal in Iran **without a VPN**, and the data lives on a server we control.
Decision already taken: [Firebase stays swappable](../README.md); this plan makes that real.

## 1. What the audit found

Only **five files** talk to Firebase. Nothing else in the site knows it exists.

| File | What it does with Firebase |
|---|---|
| `assets/panel.js` (55 calls) | sign-in, account list, roles, proformas review and archive, commission, tickets (chat), public requests, profile look, notification settings, national ID |
| `assets/sync.js` (15) | saving proformas, remembered prices, sending a proforma as a ticket, sign-in box on other pages |
| `assets/customers.js` (15) | customers, groups, owner assignment, Excel import (batched writes) |
| `assets/notify.js` (11) | live listeners for new tickets / requests / commission, presence heartbeat |
| `assets/contact.js` (2) | public contact form (no sign-in) |

Plus `assets/firebase-config.js` and three vendored SDK files (about 500 KB: app, auth, firestore).

### What the app actually needs from a backend

1. **Email + password sign-in**, sign-out, "who am I" (`signInWithEmailAndPassword`, `onAuthStateChanged`). Staff accounts are created by an administrator; there is no self sign-up.
2. **Documents in 15 collections** (list in section 2), read by id, or by simple filters (`ownerUid == me`, `audience array-contains …`, `to == sales`).
3. **Atomic multi-document writes** (`batch`): ticket + first message; invoice update + archive copy + delete; commission results; customer import (hundreds of documents).
4. **Live updates** (`onSnapshot`): open chat thread and its messages, the other person's typing/online state, ticket and request counters used for notifications, commission approval changes.
5. **Access rules** enforced on the server (the 256-line `firestore.rules`). This is the security of the whole system.
6. No Cloud Functions, no Storage, no FCM, no transactions with reads, no offline persistence turned on. That is good news: the surface is small.

### Coupling that will need care

- Rules use `get()` of the caller's profile, `getAfter()` (first message validated against the ticket written in the same batch), `diff().affectedKeys()` (field-level permissions) and regex checks. Each must become explicit server code.
- Several writes rely on the client clock (`Date.now()`), not server timestamps. A server should stamp times itself.
- Document ids carry meaning: `invoices/{uid}_{docNo}`, `customers/{accountingCode}`, `commission_months/{year}_{mm}`. Keep them identical so exports and imports map one to one.
- `panel.js` is about 1,400 lines and mixes UI with data calls. This is the hardest file to separate.
- Notifications are client-side listeners plus the browser's local notification. They only work while the page is open. A server of our own can later send real Web Push to closed phones (a bonus, not part of the first move).

## 2. Data inventory and rules to port

| Collection | Who reads | Who writes | Notes |
|---|---|---|---|
| `users` | self, team viewers (manager, ceo, sales manager, hr) | admins create/role/code; hr name+phone+active; sales manager regions+cities; self only e-mail fields | role table also lives in `assets/roles.js` |
| `personal` | self, admins, hr | admins, hr | national ID (10 digits) and birthday format checks |
| `invoices` | owner, or the five "see all" roles | owner (not the `review` field); account manager sets `review` only; sales manager / management decide refusals | delete rules differ by role and review status |
| `invoice_archive` | owner or the "see all" roles | sales manager, manager, ceo create only | immutable |
| `customers` | "see all" roles, or the owner of that customer | managers + sales manager full; account manager and owner only five contact fields | keyed by accounting code |
| `customer_groups` | "see all" roles | managers + sales manager | never deleted |
| `commission_rates`, `commission_months` | finance, sales manager, manager, ceo | three-step flow: finance draft, sales manager reviewed, management approved | state machine with allowed fields per step |
| `commission_results`, `commission_month_results` | same, plus a specialist sees only approved results of their own regions | manager, ceo | |
| `tickets` + `messages` | members of the audience, and manager | any approved user creates; members update a few fields and their own receipt fields | messages immutable; audience at most 3 entries |
| `public_requests` | addressee role | **anyone, no sign-in** (size and shape validated); addressee closes it | needs anti-spam (rate limit) on the new server |
| `notify_prefs`, `profiles`, `presence`, `prices` | company members / owner | owner only, field whitelists | `profiles.photo` up to 45 KB |

## 3. Target architecture

```
phone / PC  ->  https://portal.<our-domain>   (ParsPack VPS, Iran)
                   |-- Nginx: HTTPS, the static site (same files as today)
                   |-- Backend: sign-in, access rules, API, live updates (WebSocket/SSE)
                   |-- Database: stored on the server's disk
                   `-- Backups: nightly to a second Iranian host + an offline copy
```

Two backend options. I recommend A.

**A. PocketBase (recommended).** One small program (Go + SQLite) that already provides users with e-mail/password, collections, per-collection access rules written as expressions, realtime subscriptions, batch API, an admin screen, backups. A JavaScript client exists and can be vendored like the Firebase files. Fits a single small VPS and one maintainer. Rules are expressions rather than Firestore's language, so every rule is rewritten and tested, but the machinery for them exists.
Limits to check on a test server: batch size for the 500-document customer import, rule expressiveness for `getAfter`-style checks (we can instead create ticket + first message through one small server hook), and role-specific field permissions (done with hooks or split collections).

**B. Custom server (Node or Python + PostgreSQL).** Maximum control, but we write sign-in, sessions, rules, realtime and backups ourselves. More code to secure and maintain. Only worth it if PocketBase hits a hard limit.

**Not recommended:** a live two-way mirror with Firebase. Reasons: two sources of truth create conflicts (two edits of one invoice number); Iranian servers frequently cannot call Google APIs, so the sync itself may fail; and if the Iranian server is down, users still cannot reach Firebase without a VPN, so the fallback protects little. Firebase stays only as a **cold archive**: a Firestore export (done once at cut-over) kept offline.

## 4. Plan in phases

Each phase can ship by itself and leaves the site working.

**Phase 0: decisions and test (a few days)**
- Confirm today's reality: do users really fail to reach Firebase without VPN, and does ParsPack's server reach it? Test from a ParsPack VPS with `curl`.
- Choose a domain name and TLS; confirm ParsPack plan, price, backup options, location. (I have not verified ParsPack's current plans or prices.)
- Decide sign-in method: keep e-mail + password, or add SMS one-time codes (fits the customer-panel milestone).

**Phase 1: one data layer in the app (safe, no visible change)**
- Add `assets/data.js` exposing a small interface (`signIn`, `signOut`, `onUser`, `get`, `list(filter)`, `set`, `update`, `delete`, `batch`, `subscribe`, `newId`) with a Firebase implementation behind it.
- Move the 100 direct calls in the five files onto that interface, one file at a time, in this order: `contact.js`, `notify.js`, `sync.js`, `customers.js`, `panel.js`.
- Verify every screen against the mock-Firebase test pages. Ship to GitHub Pages as normal.

**Phase 2: test server (about a week)**
- Create the smallest ParsPack VPS; install Nginx + PocketBase; HTTPS; nightly backup job.
- Create the 15 collections and port all rules. Write a rules test list taken from section 2 (for each role, each collection, each allowed and forbidden action) and run it against the server.
- Add the second implementation of the data layer (PocketBase) behind the same interface, selected by `firebase-config.js` (`backend: "firebase" | "own"`).

**Phase 3: migrate data and accounts**
- Export Firestore (all 15 collections) and import into the server with the same document ids.
- Staff accounts: Firebase password hashes will not carry over cleanly, so each person sets a new password (administrator sends a reset link) or uses an SMS code.
- Dry run on a copy; compare counts per collection and spot-check invoices and customers.

**Phase 4: pilot, then cut-over**
- Pilot with a few staff on the new server for 1 to 2 weeks while Firebase stays untouched.
- Cut-over weekend: freeze, final export/import, switch `backend` to `"own"`, announce in the updates list.
- Keep the Firebase project (Spark plan, free) read-only for a few months, then export and archive it.

**Phase 5: after the move**
- Web Push to closed phones (server sends it), SMS login, anti-spam on the public contact form, monitoring, a written restore drill (once per quarter, restore the backup on a spare machine).

## 5. Risks

| Risk | What reduces it |
|---|---|
| Rules ported wrongly, so someone sees data they should not | rules test list per role (section 2); security review before pilot |
| One maintainer for a server | boring stack, written runbook, backups with a tested restore, uptime alert |
| Server or provider down | second-host backup; restore runbook; a short outage page; keep time-to-restore under a few hours |
| Lost data from a bad migration | keep Firebase untouched until the pilot succeeds; count and spot checks |
| Password reset burden | send reset links in bulk; or SMS codes |
| Sanctions or provider changes | the data layer stays swappable, so moving host again is a config change |
| Spam on the public contact form | rate limit plus a simple honeypot field |

## 6. Rough effort (one developer, evenings)

Phase 1: 4 to 6 sessions. Phase 2: 4 to 6. Phase 3: 2. Phase 4: 2 plus the pilot. Phase 0 and 5 are small. These are estimates, not promises; Phase 2 may grow if PocketBase cannot express a rule.

## 7. Decisions needed from the owner

1. Backend: PocketBase (A) or custom (B)?
2. Domain name for the new address.
3. Sign-in: keep e-mail + password, or add SMS codes?
4. Backup target: which second host?
5. Who holds server access besides Soheil (a second admin for emergencies)?
