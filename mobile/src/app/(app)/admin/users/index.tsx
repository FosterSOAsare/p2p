import { PlaceholderScreen } from '@/features/shared/ui/PlaceholderScreen';

export default function AdminUsersRoute() {
  return (
    <PlaceholderScreen
      title="Users"
      description="Search users, inspect accounts and suspend where needed."
      webRoute="/admin/users"
      backLabel="Back to admin"
    />
  );
}
