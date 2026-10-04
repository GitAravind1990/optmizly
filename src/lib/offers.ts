/**
 * Discount codes, named once.
 *
 * The code string is read by three places that must agree: the endpoint that asks Dodo how
 * many places are left, the modal that offers it, and any copy that quotes it. A code typed
 * into two of the three is a code that stops working somewhere when it is renamed, and the
 * failure is silent — Dodo simply reports no such discount and the surface goes quiet.
 *
 * What is NOT here is the discount amount. That lives in Dodo, which owns the arithmetic, and
 * stating a percentage in the UI would be a second source of truth for a number customers can
 * check against their own invoice.
 */

/** The Founding Member offer: the two annual agency plans, twenty places, counted by Dodo. */
export const FOUNDING_CODE = 'FOUNDING50'
