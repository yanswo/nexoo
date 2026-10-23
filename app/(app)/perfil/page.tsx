import { getProfileData } from "@/lib/profile";
import ProfileView from "./ProfileView";

export default async function ProfilePage() {
  const profile = await getProfileData();
  if (!profile) return null;
  return <ProfileView profile={profile} />;
}
