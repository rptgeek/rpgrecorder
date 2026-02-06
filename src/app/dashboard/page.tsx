import { getCampaigns } from "@/lib/actions/campaign";
import { getSessions } from "@/lib/actions/session";
import CampaignList from "@/components/CampaignList";
import CreateCampaignForm from "@/components/CreateCampaignForm";
import { SearchBar } from "@/components/SearchBar";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authConfig);

  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/dashboard");
  }

  const campaigns = await getCampaigns();
  const allSessions = await getSessions();

  // Cast to any because the types might be slightly off in the IDE but Prisma returns these fields
  const typedCampaigns = campaigns as any[];
  const typedSessions = allSessions as any[];

  const unassignedSessions = typedSessions.filter((s) => !s.campaignId);

  return (
    <main className="container mx-auto py-8 px-4 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900">GM Dashboard</h1>
          <p className="text-gray-600">Manage your campaigns and review recorded sessions.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <SearchBar />
          <Link
            href="/sessions/new"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            Record New Session
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-3">
          <CampaignList 
            campaigns={typedCampaigns} 
            unassignedSessions={unassignedSessions} 
          />
        </div>
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <CreateCampaignForm />
          </div>
        </div>
      </div>
    </main>
  );
}
