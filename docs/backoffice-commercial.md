# Backoffice commercial conditions

The lazy `commercial` feature at `/condiciones-comerciales` configures the existing Orders commercial policy. It is available to superadministrators and active business administrators with `orders.settings.manage`. Operators and other businesses cannot change it. UI selection uses business names; the server independently enforces the organization scope.

## Supported policy

- Enable/disable new purchases for the selected business.
- Configure a Colombian pickup address with a recipient and E.164 telephone.
- Configure up to 30 distinct Colombian cities and explicit fixed shipping fees.
- Choose included taxes or additional taxes with explicit per-variant rates and a shipping rate.
- Write purchase terms and a mandatory administrative reason.

Every write includes `expectedVersion`, using zero for the first policy and the current version afterward. History stores immutable accepted snapshots and is paged separately. Requests/responses use generated contracts, Zod Mini validation and scoped mappers. NgRx SignalStore excludes concurrent writes and freezes mutations after conflict or unknown outcome until explicit reconciliation. Late responses cannot overwrite a refreshed organization or restore data after denial.

New policies use `COP`, `CO` and `collector: platform`, reflecting the approved gateway split agreement. Configuring the policy never activates the actual payment provider. The platform commission remains `PETTLY_COMMISSION_PERCENT`, initially 10%, and is not an editable financial shortcut in Angular. Orders and quotes already accepted preserve their original policy and allocation.

Amounts are parsed exactly into integer minor units, including zero shipping fees. A decimal percentage becomes integer basis points without floating-point rounding. Included-price mode submits no extra tax rates. Pettly does not infer an applicable statutory tax rate; added-tax quotes without the required explicit rate fail. Historical policies in another currency are displayed read-only.

Variant options come from bounded pages of company products and display product name and SKU. Pagination counts candidate products, whose variants are expanded locally. Existing configured variants outside the current page remain recognizable as existing selections. Foreign organization/product relationships and malformed options are rejected.

## Manual checks

1. Select an authorized business and configure pickup or shipping before enabling purchases.
2. Save a fee such as `12500,50` COP; inspect the policy and history and confirm `1250050` minor units.
3. Choose included taxes and verify that no extra tax is added. For additional taxes select real company variants and explicit rates.
4. Open the same policy in two sessions; after one save the other must encounter a conflict and refresh before another attempt.
5. Confirm that a business operator and another company's administrator cannot configure it.
6. Verify that configuring a policy does not mark payments paid or permit a disabled gateway to charge.
