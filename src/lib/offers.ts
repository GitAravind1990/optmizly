/**
 * The discount code, named once.
 *
 * Read by three places that must agree: the endpoint that asks Dodo how many places are left,
 * the modal that offers it, and any copy that quotes it. A code typed into two of the three
 * stops working somewhere the day it is renamed, and it fails silently — Dodo reports no such
 * discount, and the surface simply goes quiet.
 *
 * What is NOT here is the discount amount or the cap. Those live in Dodo, which owns the
 * arithmetic and the redemption count. Stating a percentage here would be a second source of
 * truth for a number the customer checks against their own invoice, and a hardcoded "N places
 * left" is a scarcity claim nothing verifies.
 *
 * **Replaced FOUNDING50 on 2026-10-04.** That code was restricted to the two annual agency
 * plans — a $490 commitment — which is no offer at all to someone arriving from a free audit
 * or a Product Hunt link. It had zero redemptions, so nothing was stranded by retiring it.
 */

/** The launch offer: every paid plan, monthly and annual. */
export const OFFER_CODE = 'PRODUCTHUNT'
