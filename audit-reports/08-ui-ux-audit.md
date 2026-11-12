# UI / UX audit

Date: 2026-11-11. Source-based review only. Visual screenshots, authenticated task timings, screen-reader execution, device interaction and measured contrast were not available to this reviewer. **UI design score: NOT ASSESSED. User experience score: NOT ASSESSED** for the rendered product. The source exposes concrete usability defects (below), but cannot establish appearance or task completion across viewports. See report 03 for page-by-page inventory and source evidence.

## Existing design foundation

`Frontend/src/styles/tokens.css:1` defines gold branding, neutral canvas, semantic statuses, radius, shadow, motion and stacking tokens. `styles/typography.css:5` defines Cairo display and IBM Plex Sans Arabic body families with a scale. `components/layout/AppLayout.tsx:26` fixes RTL direction; desktop sidebar uses right margin and content has responsive padding. Shared Button/Input/Table/Modal/Drawer/EmptyState/ErrorState/Loading components exist. Lucide is the primary icon source.

The actual pages mix tokens with literal gold hex values, zinc utilities, many 10–12px labels and repeated inline dialogs/toasts. This is **VERIFIED IN CODE**, not a claim of visually measured inconsistency. Arabic and EGP are extensively hardcoded; no locale-switching/message-catalog layer was found in the inspected routing/provider/dependency structure. RTL support is intentional; bidirectional Arabic/English behavior is **not verified**. Use logical spacing and direction-aware icons before adding English.

## Confirmed functional UX defects

| Concern | Evidence | Product consequence / improvement |
|---|---|---|
| Success does not mean saved | MemberCreatePage :234–243, PaymentsListPage :986/:1035, RegisterPage :47 | Users may record fictitious collections or assume accounts exist. Show success only after persistence and identify partial completion. |
| Renewal loses context | MemberDetailPage :427, MembersListPage :653, SubscriptionRenewPage :81/:190 | Staff select a member then hit an unusable renewal form. Carry concrete subscription identity end to end. |
| Financial UI lies by omission | SubscriptionRenewPage :197; PaymentsListPage :177 | Discount/payment selections are dropped; zero daily revenue can be replaced by historical total. Use canonical financial responses and label scope/date explicitly. |
| Search promise exceeds behavior | GlobalSearchModal :25/:70/:118 | “Member/subscription/transaction” search only matches menu labels; advertised arrow-key selection is absent. Either rename to page navigation or implement actual entity search. |
| Failures resemble empty business state | AttendancePage :140; TrainerDashboardPage :51; ReportsPage :62/:291 | Staff cannot distinguish no attendance/revenue from unavailable data. Show panel-specific errors and retries with last-updated time. |
| User actions conflict with role | ProfilePage :78/:117; Backend/src/routes/user.routes.ts:27 | Receptionist/trainer cannot save own profile/password through admin endpoints. Provide self-service operations; do not hide all profile access. |
| Modal keyboard support incomplete | Modal.tsx :65; Drawer.tsx :75 | No focus trap or return-focus; Drawer lacks dialog semantics. Raw clickable spans in pages are not keyboard links. |
| Input error semantics incomplete | Input.tsx :40/:100 | Label-derived duplicate IDs and unlinked validation text. Generate stable unique IDs and programmatic error descriptions. |
| Fake live trainer relationships | TrainerDetailPage :45/:117/:965 | Staff see sample members under real trainers and local-only transfer success. Remove samples from operational context and connect assignments. |
| Excessive repeated decisions | PaymentCreatePage :55, member list renew links | Selecting from capped lists and reselecting member/subscription slows reception. Carry context and use server-backed search. |

## Ten priority task journeys

Steps below describe source-visible interaction stages, not measured click counts.

| Task | Current path / friction | Target workflow and acceptance |
|---|---|---|
| Register member | Members → new → personal/photo/plan/payment fields → save; three requests can partially fail silently | Required identity first, optional sale as explicit second section; show member/subscription/payment identifiers, safe retry for failed stage, no duplicate creation |
| Sell subscription | Subscription new → find member → select plan → dates/payment → confirm → list; payment separate | Keep member context; validate plan, effective price, start date and outstanding balance on server; receipt and next action after completion |
| Renew membership | Member/list Renew links omit usable subscription id; route-specific flow collects ignored money fields | One Renew action loads correct subscription; show current expiry and effective renewal period; persist discount/payment or omit those controls |
| Check in member | Attendance search uses first match with limit 1, preview then check-in; manual variant exists | Exact code scan first; ambiguous names/phones require selection; clear expired/frozen/inside states and recovery action; no silent failure-as-empty |
| Record payment | Payments new loads first 50 subscriptions, selects due balance, amount/method, submit | Global member/subscription lookup with outstanding balance; persisted receipt; idempotent retry; full ledger refresh |
| Book training session | No dedicated scheduling/booking route in router inventory | Treat as missing product workflow; define trainer availability, member entitlement, slot/capacity and cancellation before adding calendar UI |
| Find expired member | Member list/search status filters exist; real list API | Confirm definition of expired versus inactive; filter persists in URL, total count server-derived, renew action retains member context |
| View daily revenue | Payments page period controls disconnected and today fallback wrong; reports has real date queries | Server daily aggregate, explicit gym timezone/day cutoff, refunds/net/gross separation, drill-down matching total |
| Search member | MemberSearchPage uses real member API, global header search only routes | Clarify navigation versus member lookup; keyboard result selection, debounced cancelable requests, phone/code normalization |
| Manage staff permissions | Users table → action menu → role modal → save; real API | Show role capability description, permitted transition and confirmation; server hierarchy enforcement; audit event and refreshed session after changes |

## Responsive verification matrix

| Width | Source-level accommodations | Remaining required execution |
|---|---|---|
| 320px | Single-column responsive grids, horizontal table wrappers, mobile sidebar | NOT VERIFIED: no page overflow, sticky action reachability, modal scrolling, keyboard-obscured fields |
| 375px | `sm:` upgrades delayed until larger width | NOT VERIFIED: Arabic labels, amount inputs and header controls |
| 425px | Same mobile patterns | NOT VERIFIED: quick-actions fixed width, toast wrapping and form summaries |
| 768px | `md:` layouts and padding | NOT VERIFIED: tablet portrait/landscape, table density and drawer coverage |
| 1024px | Desktop sidebar activates at `lg:` with main margin | NOT VERIFIED: available width after 256px sidebar, dashboard cards and filter rows |
| 1440px | Content `max-w-7xl`, multi-column dashboards | NOT VERIFIED: line lengths, alignment, hierarchy and unused space |

For each width execute login, member create, subscription create/renew, payment receipt, member search, attendance, user-role modal and error state. Include 200% zoom, long Arabic names, English email/IDs, touch target checks, reduced motion and keyboard-only traversal. Capture screenshots only from isolated fixture data and record browser/version; no visual pass should be inferred from CSS class names.

## Unified design-system proposal

Retain existing gold/neutral identity and shared components. First consolidate behavior, then refine visuals.

1. **Semantic foundation:** one token source for surface/text/border/action/status/focus; use dark readable gold for small text and validate all foreground/background pairs. Standardize 4px spacing scale and 8/12/16px radii. Reserve large shadows for overlays.
2. **Typography:** Cairo headings, Arabic body font with readable 14–16px form/body text and 12px minimum secondary labels where practical. Use tabular digits for financial columns; keep phone, email and reference strings directionally isolated. Actual sizes must be validated at target breakpoints.
3. **FormField:** unique id, associated label, hint/error IDs, required semantics, aria-invalid and inline validation. Use SettingsPage's React Hook Form/Zod pattern where it improves validation; do not rewrite working forms solely for uniformity.
4. **Dialog/Drawer:** shared accessible focus lifecycle, Escape, correct name/description, scroll locking that survives nested overlays, destructive-action confirmation, disabled submit during in-flight request, failure feedback inside dialog.
5. **AsyncPanel/DataTable:** loading, empty, unavailable, stale and retry states; server pagination/sorting/filtering; filter state in URL; permission-aware row actions; mobile summary cards only when table scanning is impractical.
6. **Money/Date fields:** display gym currency/timezone, immutable server price breakdown, explicit discounts and outstanding balance; no UI-derived financial totals from truncated lists. Distinguish planned renewal from money actually collected.
7. **Search and navigation:** one role-aware menu model for Sidebar, global navigation search and quick actions; separate searchable business entities; actual keyboard combobox interaction and accurate help copy.
8. **Feedback:** consistent live-region toast for transient notices plus persistent inline errors for failed saves. Confirmation must state actual persisted operation; an info toast must never simulate refund, transfer or saved profile photo.
9. **Localization:** extract strings and date/number formatters, retain RTL defaults, use logical spacing properties and test mixed-direction strings. English and multi-currency are planned capabilities, not current verified features.

## Release-level UX acceptance gates

* Every success message corresponds to a confirmed mutation, with integration evidence.
* No operational sample members, plans, histories, credential prefills or simulated registration ship in production paths.
* All essential workflows usable by keyboard and at the six requested widths; report screenshots and failures.
* No unauthorized action is presented as available; backend still enforces authorization.
* Errors do not appear as zero revenue, no attendees or empty history.
* Renewal and payment journeys preserve member/subscription context and reconcile displayed amounts with persisted values.
* Profile/receipt/avatar behavior is explicit about persistence, printing and download capability.

Actual aesthetic scoring, contrast measurement, mobile pass/fail, assistive-technology compatibility and task-time benchmarks remain **NOT ASSESSED** until browser validation is completed.
