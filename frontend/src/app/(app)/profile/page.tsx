import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { getCurrentUser } from "@/features/auth/current-user";
import { ProfileView } from "@/features/profile/profile-view";

export const metadata: Metadata = { title: "Profile" };

/** Server Component: the signed-in account (same cached `/api/auth/me` call the shell uses). */
export default async function ProfilePage() {
  const user = await getCurrentUser();

  return (
    <>
      <PageHeader title="Profile" />
      <ProfileView user={user} />
    </>
  );
}
