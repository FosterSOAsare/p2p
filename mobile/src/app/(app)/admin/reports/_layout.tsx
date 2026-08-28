import { Stack } from 'expo-router';

/**
 * Stack for the reports section of the console.
 *
 * Same reason as the other sections: without it the tab navigator above would
 * list every file here separately and turn them into tabs.
 */
export default function ReportsSectionLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
