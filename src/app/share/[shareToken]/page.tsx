import { getPublicSessionByToken } from "@/lib/actions/session";
import { notFound } from "next/navigation";
import { format } from "date-fns";

interface PublicSharePageProps {
  params: Promise<{
    shareToken: string;
  }>;
}

export default async function PublicSharePage({ params }: PublicSharePageProps) {
  const { shareToken } = await params;
  const session = await getPublicSessionByToken(shareToken);

  if (!session) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-8 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{session.name}</h1>
              {session.campaign && (
                <p className="text-sm font-medium text-indigo-600 mt-1 uppercase tracking-wider">
                  Campaign: {session.campaign.name}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {format(new Date(session.createdAt), "MMMM d, yyyy")}
              </p>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-8">
          <div className="prose prose-indigo max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Player Recap</h2>
            {session.playerRecap ? (
              <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {session.playerRecap}
              </div>
            ) : (
              <p className="text-gray-400 italic">No recap available for this session.</p>
            )}
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500">
            Powered by RPG Session Recorder & Summarizer
          </p>
        </div>
      </div>
    </div>
  );
}
