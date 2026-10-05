/**
 * Browser events the marketing surfaces announce to each other.
 *
 * A shared constant rather than one component importing another: FreeAudit should not depend
 * on the Founding Member popup, or on anything else that might one day want to know a visitor
 * has just been given a result. The publisher names the moment; whoever cares listens.
 */

/** Dispatched on `window` when the free audit finishes and a report is on screen. */
export const AUDIT_COMPLETE_EVENT = 'optmizly:audit-complete'

/**
 * Dispatched on `window` when the offer modal's CTA is taken while the visitor is already on
 * the pricing page.
 *
 * Needed because the modal's ordinary CTA is a link to /pricing?code=..., and on /pricing that
 * is a navigation to the page you are already on: the effect that reads the query string runs
 * once on mount, so the code would never be picked up. The modal announces the code instead
 * and the pricing page applies it in place.
 */
export const OFFER_APPLIED_EVENT = 'optmizly:offer-applied'
