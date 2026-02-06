import Link from "next/link";

interface Session {
  id: string;
  name: string;
  createdAt: Date;
}

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  sessions: Session[];
}

export default function CampaignList({ campaigns, unassignedSessions }: { campaigns: Campaign[], unassignedSessions: Session[] }) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-2xl font-bold mb-6">Campaigns</h2>
        {campaigns.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed">
            <p className="text-gray-500 italic">No campaigns found. Create one to get started!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="border rounded-lg p-6 bg-white shadow-sm flex flex-col">
                <h3 className="text-xl font-bold mb-2">{campaign.name}</h3>
                {campaign.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{campaign.description}</p>
                )}
                <div className="mt-auto">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Sessions:</h4>
                  {campaign.sessions.length > 0 ? (
                    <ul className="space-y-1">
                      {campaign.sessions.slice(0, 3).map((session) => (
                        <li key={session.id} className="text-sm">
                          <Link href={`/sessions/${session.id}`} className="text-blue-600 hover:underline">
                            {session.name}
                          </Link>
                          <span className="text-gray-400 text-xs ml-2">
                            {new Date(session.createdAt).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                      {campaign.sessions.length > 3 && (
                        <li className="text-xs text-gray-500 italic">
                          + {campaign.sessions.length - 3} more sessions
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No sessions yet</p>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <Link
                    href={`/campaigns/${campaign.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    View Campaign
                  </Link>
                  <Link
                    href={`/sessions/new?campaignId=${campaign.id}`}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded"
                  >
                    Add Session
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {unassignedSessions.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">Unassigned Sessions</h2>
          <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
            <ul className="divide-y">
              {unassignedSessions.map((session) => (
                <li key={session.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                  <div>
                    <Link href={`/sessions/${session.id}`} className="font-medium text-blue-600 hover:underline">
                      {session.name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      Recorded on {new Date(session.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    href={`/sessions/${session.id}/edit`}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Edit
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
