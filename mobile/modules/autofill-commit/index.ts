import { requireOptionalNativeModule } from 'expo';

/**
 * Android's "was that form submitted?" signal, which autofill needs before it
 * will offer to save a password. See the Kotlin module for why this has to
 * exist at all.
 *
 * `requireOptionalNativeModule` rather than `requireNativeModule`: this ships
 * on Android only, and the app also runs under Expo Go and on web, where the
 * native side is simply absent. Demanding it would throw at import time on
 * those targets — the failure mode that has already cost this project one
 * crashed build. Missing means the calls below quietly do nothing.
 */
const native = requireOptionalNativeModule<{
  commit(): boolean;
  cancel(): boolean;
}>('AutofillCommit');

/**
 * Call on a successful sign-in or sign-up, before navigating away and while the
 * credential fields are still mounted. Returns whether Android took the signal.
 */
export function commitAutofill(): boolean {
  try {
    return native?.commit() ?? false;
  } catch {
    // Autofill is a convenience — never let it break signing in.
    return false;
  }
}

/**
 * Call on a failed sign-in, so a rejected password is not left in the session
 * to be offered for saving later.
 */
export function cancelAutofill(): boolean {
  try {
    return native?.cancel() ?? false;
  } catch {
    return false;
  }
}
