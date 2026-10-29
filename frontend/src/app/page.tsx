import { getServerSession } from "@/lib/api";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await getServerSession();
  if (session) redirect("/dashboard");
  redirect("/login");
}
