import { Redirect } from 'expo-router';

/** Entry point: everyone lands on the loading screen first. */
export default function PublicIndexRedirect() {
  return <Redirect href="/splash" />;
}
