import { Suspense } from "react";
import Sidebar from "../components/Sidebar";
import { UserProvider } from "../components/UserProvider";
import { getCurrentUser } from "@/lib/auth";
import styles from "../styles/dashboard.module.css";
import { getCommunities } from "@/lib/communities";

export const instant = false;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className={styles.shell} />}>
      <AuthedShell>{children}</AuthedShell>
    </Suspense>
  );
}

async function AuthedShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const communities = await getCommunities();
  return (
    <UserProvider user={user}>
      <div className={styles.shell}>
        <Sidebar communities={communities} />
        <div className={styles.main}>{children}</div>
      </div>
    </UserProvider>
  );
}
