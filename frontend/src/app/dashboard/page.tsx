import { getServerSession, getMatters } from "@/lib/api";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const matters = await getMatters();

  return <DashboardClient session={session} matters={matters} />;
}
