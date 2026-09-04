package expo.modules.autofillcommit

import android.os.Build
import android.view.autofill.AutofillManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Tells Android that a credential form was submitted, so the autofill service
 * can offer to save it.
 *
 * Annotating the fields with `autoComplete` is only half of autofill. Android
 * shows "Save password?" when the autofill *session* is committed, which it
 * does by itself when an Activity finishes. React Native is a single Activity:
 * signing in swaps a JS screen, the Activity never finishes, and Android just
 * sees the fields quietly disappear — so nothing is ever offered for saving.
 * Neither React Native nor Expo exposes a way to say "that form was submitted".
 *
 * This is that missing signal, and nothing more.
 *
 * `commit()` needs API 26; below that the whole autofill framework is absent,
 * and the guard returns false rather than throwing. The app's minSdk is lower
 * than 26, so that branch is real, not defensive padding.
 */
class AutofillCommitModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AutofillCommit")

    /**
     * Commit the session — call after a sign-in or sign-up succeeds, while the
     * fields are still on screen. Returns whether the signal was actually sent,
     * so the JS side can tell "not supported" from "sent".
     */
    Function("commit") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return@Function false
      val activity = appContext.currentActivity ?: return@Function false
      val manager = activity.getSystemService(AutofillManager::class.java) ?: return@Function false
      // Only meaningful while a session is live; a no-op otherwise, never a throw.
      if (!manager.isEnabled) return@Function false
      manager.commit()
      true
    }

    /**
     * Abandon the session instead. For a failed sign-in: without this the
     * rejected password stays in the session and can be offered for saving
     * later, which would save the wrong one.
     */
    Function("cancel") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return@Function false
      val activity = appContext.currentActivity ?: return@Function false
      val manager = activity.getSystemService(AutofillManager::class.java) ?: return@Function false
      if (!manager.isEnabled) return@Function false
      manager.cancel()
      true
    }
  }
}
