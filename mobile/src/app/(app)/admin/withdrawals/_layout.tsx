import { Stack } from 'expo-router';

/**
 * Stack for the withdrawals section of the console.
 *
 * Present for the same reason every other section has one: it makes the route
 * name the bare folder name, which is what `admin/_layout.tsx` matches on. A
 * bare nested index would be named `withdrawals/index` under expo-router 6, and
 * the `name="withdrawals"` option there would silently match nothing.
 */
export default function WithdrawalsSectionLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
