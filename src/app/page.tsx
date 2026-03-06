import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard-client";
import { Header } from "@/components/header";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Header user={session.user} />
      <DashboardClient />
    </div>
  );
}
