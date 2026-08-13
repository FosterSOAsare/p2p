/**
 * Things that must be torn down on logout, registered by whoever owns them.
 *
 * This exists to keep heavy modules out of the startup bundle. `AuthContext`
 * loads on launch, so anything it imports loads on launch too — importing the
 * chat socket directly would drag `socket.io-client` into the first bundle the
 * phone has to fetch and parse, for a feature most sessions never open.
 *
 * Inverting it fixes that: the socket registers itself the first time it
 * actually connects, and logout just runs whatever registered. Nothing is
 * loaded that wasn't going to be loaded anyway.
 */

type Teardown = () => void;

const callbacks = new Set<Teardown>();

/** Returns an unregister function, so a caller can drop out cleanly. */
export function registerTeardown(fn: Teardown): () => void {
  callbacks.add(fn);
  return () => callbacks.delete(fn);
}

/** Run every registered teardown. One throwing must not skip the rest. */
export function runTeardown() {
  callbacks.forEach((fn) => {
    try {
      fn();
    } catch {
      // A failed teardown must never block signing out.
    }
  });
}
