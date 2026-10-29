# Customer administrator restaurant replacement

A customer administrator can replace a meal day's restaurant, including more than 15 minutes after the old cycle was closed. This is distinct from ordinary reopening, which retains its 15-minute deadline.

While `days/{id}.changing` is true, the kitchen release is hidden and fulfillment changes are blocked. The customer application cancels active orders and retains their remaining net funds as carry credit, using the existing financial ledger and credit-source protocol. The replacement is resumable and does not touch orders cancelled before the operation.

The old active fulfillment is copied exactly to the administrator-only replacement archive and removed atomically when the job completes. The new restaurant receives a fresh order list only after the customer administrator closes the new cycle. A prior restaurant's fulfillment cannot become the new restaurant's state.

The canonical configured Rules live in the customer application. Deploy its full Rules before releasing both portals. The integration copy here uses a primary-administrator placeholder. No new index or credential is needed. See the customer `docs/edit-meal-days.md` for the trusted-admin finalization model and recovery behavior.
