import { router } from 'expo-router';

/**
 * Land on `to` with the screens walked through to get here cleared away.
 *
 * For the end of a payment. Replacing only the callback screen leaves the
 * checkout — or the deal and its payment sheet — sitting underneath it, so Back
 * after a confirmed payment returns into the middle of a purchase that has
 * already completed. Worse, that sheet saw the browser dismissed and is showing
 * "Payment cancelled": backing out of a payment that worked told the buyer it
 * had failed, which invites paying twice.
 *
 * Popping to the root first means Back from the result goes home, which is
 * where someone who has just finished paying expects to end up.
 *
 * `canDismiss` is false when the deep link cold-started the app — there is
 * nothing behind the callback then, so the screen is simply replaced.
 */
export function landOn(to: string) {
  if (router.canDismiss()) {
    router.dismissAll();
    router.push(to as never);
  } else {
    router.replace(to as never);
  }
}
