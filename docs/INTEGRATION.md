# Shared-data protocol · version 1

## Portal admission

Regular customer and merchant accounts use one portal each. Membership existence
reserves a Google UID for Merchant, including disabled membership. Only verified
Google administrators may use both portals. Admission checks run before showing
the workspace; unauthorized sessions are signed out locally. Shared operational
reads remain scoped to assigned meal days. See [portal account policy](PORTAL-ACCESS.md).

Both applications use Firebase Web SDK and the same Standard database. There is no replication queue or new trusted server identity. Existing `admins/{uid}` remains the customer administrator authority; merchant membership does not make a person a customer administrator.

| Path | Reader / writer |
| --- | --- |
| `merchants/{id}` | Authenticated customers may get public restaurant details; only administrators list restaurants. Managers/owners edit details; only administrators toggle active state. |
| `merchantUsers/{uid}` | Verified Google identity reads its own mapping. Owners query their own restaurant's staff. Administrators provision owners; owners manage lower roles. No self-escalation or reassignment. |
| `merchantDays/{dayId}` | Customer administrator creates an immutable `{merchantId,date,createdAt,createdBy}` binding. Staff list only their own merchant's bindings. Customers may get a selected day's binding. |
| `merchants/{id}/catalog/{dishId}` | Merchant staff read; managers/owners edit. Name hash, price and active schema match customer dishes. Archive instead of delete. |
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

One restaurant assignment per meal date, one merchant membership per staff UID. Bindings cannot be reassigned or deleted. Customer administrators may control multiple merchants. No inventory/POS, tax accounting, merchant payment settlement, restaurant-to-restaurant order transfer or automatic acceptance is implemented. These would require separately reviewed data models and permissions.
