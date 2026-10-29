import { getServerSession, getMatter } from "@/lib/api";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MatterView from "@/components/chat/MatterView";
import Link from "next/link";
import { Scale, ArrowLeft } from "lucide-react";

export default async function MatterPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  const { id } = await params;

  if (!session) {
    redirect("/login");
  }

  const matter = await getMatter(id);

  if (!matter) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card variant="elevated" padding="lg" className="w-full max-w-md text-center border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Matter Not Found</h2>
          <p className="text-xs text-slate-500 mb-6">You don&apos;t have access to this matter or it may have been deleted.</p>
          <Link href="/dashboard" className="block">
            <Button variant="default" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Return to Dashboard
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return <MatterView initialMatter={matter} session={session} />;
}
