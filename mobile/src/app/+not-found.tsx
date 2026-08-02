import { PlaceholderScreen } from '@/features/shared/ui/PlaceholderScreen';

/** Catch-all, mirroring the web's `<Route path="*" element={<NotFound />} />`. */
export default function NotFoundRoute() {
  return (
    <PlaceholderScreen
      title="Page not found"
      description="That screen doesn't exist. Head back and try again."
      webRoute="/*"
      backLabel="Go back"
    />
  );
}
