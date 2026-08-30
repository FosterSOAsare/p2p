import { env } from "../../shared/config/env";
import { ApiError } from "../../shared/lib/errors";

/**
 * Where the provider sends the buyer back to after a hosted crypto payment.
 *
 * This used to be hard-coded to `WEB_ORIGIN`, which quietly made the rail
 * web-only. NOWPayments assigns a payment id only when the buyer picks a coin
 * on its page, and hands it back as `NP_id` on that redirect — so a phone,
 * whose redirect went to a web address it never sees, had no way to learn the
 * id. Its only remaining route to settlement was the IPN webhook, which cannot
 * reach a server running on localhost. The result was the worst kind of
 * failure: the buyer pays, and the deal sits on "waiting" indefinitely.
 *
 * So the client says where to come back to, and this decides whether to believe
 * it.
 *
 * That makes it a redirect target on a payment flow, which is exactly the shape
 * of an open-redirect bug, so it is allowlisted rather than trusted: either the
 * app's own deep-link scheme, or an http(s) URL on the same origin as the web
 * app. Anything else is refused outright rather than quietly falling back,
 * because silently sending someone somewhere other than where the caller asked
 * is how this kind of bug hides.
 */

/**
 * The mobile app's deep-link scheme — must match `scheme` in mobile/app.json.
 *
 * Worth knowing that a mismatch here is silent in the worst way: the redirect
 * after paying is simply refused, so the buyer pays and the deal never settles.
 * If the app's scheme changes, this has to change with it.
 *
 * Exported because the Joi schema needs the same value, and it having its own
 * copy is not hypothetical — the rename from `p2pm` shipped here and missed
 * there, leaving validation to reject the scheme this file would have accepted.
 */
export const APP_SCHEME = "veritrust";

function sameOrigin(a: URL, b: URL): boolean {
  return a.protocol === b.protocol && a.host === b.host;
}

/**
 * Validate a client-supplied return URL, or fall back to the web callback.
 *
 * `escrowId` and `orderRef` are appended by the caller, not here — this only
 * decides whether the base is somewhere we are willing to send a paying buyer.
 */
export function resolveReturnUrl(candidate: string | undefined, fallback: string): string {
  if (!candidate) return fallback;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw ApiError.badRequest("Invalid return URL");
  }

  // Expo's `Linking.createURL` produces `veritrust://…` in a build and
  // `exp://<host>/--/…` under Expo Go, so both are accepted. `exp` is
  // development-only and carries no host of ours, which is why it is gated on
  // NODE_ENV rather than allowed outright.
  if (url.protocol === `${APP_SCHEME}:`) return candidate;
  if (url.protocol === "exp:" && env.NODE_ENV !== "production") return candidate;

  if (url.protocol === "http:" || url.protocol === "https:") {
    try {
      if (sameOrigin(url, new URL(env.WEB_ORIGIN))) return candidate;
    } catch {
      // A malformed WEB_ORIGIN shouldn't widen what we accept.
    }
  }

  throw ApiError.badRequest("Return URL is not an allowed destination");
}
