/**
 * Browser events the marketing surfaces announce to each other.
 *
 * A shared constant rather than one component importing another: FreeAudit should not depend
 * on the Founding Member popup, or on anything else that might one day want to know a visitor
 * has just been given a result. The publisher names the moment; whoever cares listens.
 */

/** Dispatched on `window` when the free audit finishes and a report is on screen. */
export const AUDIT_COMPLETE_EVENT = 'optmizly:audit-complete'
