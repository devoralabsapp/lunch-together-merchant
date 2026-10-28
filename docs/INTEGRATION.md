# Shared-data protocol · version 1

## Portal admission

Regular customer and merchant accounts use one portal each. Membership existence
reserves a Google UID for Merchant, including disabled membership. Only verified
Google administrators may use both portals. Admission checks run before showing
the workspace; unapproved users see registration/status only; unauthorized operational sessions are refused. Shared operational
reads remain scoped to assigned meal days. See [portal account policy](PORTAL-ACCESS.md).

Both applications use Firebase Web SDK and the same Standard database. There is no replication queue or new trusted server identity. Existing `admins/{uid}` remains the customer administrator authority; merchant membership does not make a person a customer administrator.

| Path | Reader / writer |
| --- | --- |
| `merchants/{id}` | Authenticated customers may get public restaurant details; administrators list all restaurants; approved owners query their own ownerId. Managers/owners edit details; only administrators toggle active state. |
| `merchantUsers/{uid}` | Verified Google identity reads its own root mapping. Administrator approval writes an accountOnly marker; legacy mappings remain supported. Root identity reserves the operational portal. |
| `merchantDays/{dayId}` | Customer administrator creates an immutable `{merchantId,date,createdAt,createdBy}` binding. Staff list only their own merchant's bindings. Customers may get a selected day's binding. |
| `merchantCatalogs/{businessId}` and nested `dishes`, `imports` | Shared by immutable ownerId; live assigned staff read, owners/managers edit initialized dishes, owner/admin migrate. See shared catalog contract. |
| `merchantCatalogAccess/{businessId}~{uid}` | Self-owned branch witness; every operation revalidates actual membership and business. No stored role authority. |
| `merchants/{id}/catalog/{dishId}` | Legacy per-branch source retained for migration; new UI writes the shared catalog. |
| `merchants/{id}/offers/{date}` and nested `dishes` | Staff/admin read; owner/manager/admin publish independent of customer date assignment. Child writes require paired header revision. |
| `days/{dayId}` and `dishes/{dishId}` | Existing schema. Merchant managers/owners write menus only for bound days; new days must be `auto`, and existing opening/closing status cannot be changed by merchant roles. |
| `days/{dayId}/orders/{orderId}` | Existing customer ownership, financial validation and shared visibility remain unchanged. The merchant UI projects only preparation fields. No merchant payment authority is added. |
| `merchantFulfillments/{dayId}` | Authenticated customers read. Merchant roles update ordered steps with a paired immutable event. Manager/owner acknowledgment is required after changed operational instructions. |
| `merchants/{id}/events/{eventId}` | Merchant staff/admin read. Append-only bounded activity. Status writes require a new, matching status event in the same transaction. |

Daily menu publication detects changed revisions and atomically updates active dishes and menu count. The customer application keeps its existing refresh cycle (up to 30 seconds), plus manual refresh. Merchant menus/orders and customer preparation statuses use Firestore listeners. Old days without a binding work as before.

## Operational fingerprint

SHA-256 of UTF-8 JSON containing rows sorted by order ID:

```text
[[id, dish, quantity, price, note, cancelled], ...]
```

Include canceled orders so cancellation changes the acknowledgment. Exclude update timestamps and payment metadata. This is a UI change signal and trusted-merchant acknowledgment, not bank evidence, a transaction lock or proof that no customer changed an order concurrently. New customer changes can arrive after a kitchen acknowledgment; both UIs display that a new acknowledgment is needed. The existing customer cutoff/lock still governs order edits.

## Restaurant snapshots

```json
{"version":1,"date":"2026-10-28","generatedAt":"2026-10-28T02:00:00.000Z","rows":[{"dish":"Sample rice","quantity":2,"unitPrice":40000,"note":"Less rice"}]}
```

No customer identity, UID, paid flag, credit balance or refund history is exported. The existing seven-day capability share links remain snapshots and keep their current revocation rules. The live merchant workflow uses authenticated shared collections instead of parsing those links.

## Deliberate first-version boundaries

One restaurant assignment per meal date. Owners can create multiple stores; staff can hold different per-store roles. Bindings cannot be reassigned or deleted. Customer administrators may control multiple merchants. No inventory/POS, tax accounting, merchant payment settlement, restaurant-to-restaurant order transfer or automatic acceptance is implemented. These would require separately reviewed data models and permissions.

## Approval and branch extension

See [approval and branches](APPROVAL-AND-BRANCHES.md). merchantApplications/{uid} stores self-owned pending applications; merchantApprovalEvents/{id} stores administrator-only immutable paired verdicts. merchantStoreUsers/{merchantId}~{uid} grants access at each store. merchants/{id}/menus/{date}/dishes/{id} holds private per-branch menus. Managers publish an explicit selection as a dated offer; if assigned, it also updates the customer menu atomically. Private branch menus stay independent; shared catalog dishes belong to the restaurant business. Existing financial authorization and legacy grants remain unchanged.

The store directory adds optional archived:boolean to merchants (true requires active=false). Owners/admins archive/restore; hard deletion remains denied. Private branch menus accept 0..60 items; customer published menus retain 1..60. Customer-admin linked creation is an atomic day/menu/binding/audit snapshot. See [store and meal-day flow](STORES-AND-MEAL-DAYS.md).

See [shared catalog and published menus](SHARED-CATALOG-AND-MENUS.md) for the canonical model, automatic legacy import and offer-first customer selection. Private branch menus remain independent.

## Reusable branch menu update

Daily menu now has one Branch menu panel with Publish menu. The latest published menu is reused every day from its effective date until changed. The separate shared-menu panel is removed. See [reusable branch menu](REUSABLE-BRANCH-MENU.md) for current behavior and compatibility.
