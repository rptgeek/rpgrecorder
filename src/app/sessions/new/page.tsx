"use client";

import { useState, useEffect, Suspense } from "react";
import { createSession } from "@/lib/actions/session";
import { getCampaigns } from "@/lib/actions/campaign";
import { useRouter, useSearchParams } from "next/navigation";

function NewSessionForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function loadCampaigns() {
      try {
        const data = await getCampaigns();
        setCampaigns(data);
        
        const cid = searchParams.get("campaignId");
        if (cid) {
          setCampaignId(cid);
        }
      } catch (err) {
        console.error("Failed to load campaigns", err);
      }
    }
    loadCampaigns();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    try {
      const session = await createSession({
        name,
        description,
        campaignId: campaignId || undefined,
      });
      router.push(`/sessions/${session.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create session");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-xl shadow-md border">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Session Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Session 42: The Dragon's Lair"
          className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Campaign (Optional)</label>
        <select
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">No Campaign</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {isPending ? "Initializing..." : "Create Session & Start Recording"}
      </button>
    </form>
  );
}

export default function NewSessionPage() {
  return (
    <main className="container mx-auto py-10 px-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-900">Start New Recording Session</h1>
      <Suspense fallback={<div>Loading form...</div>}>
        <NewSessionForm />
      </Suspense>
    </main>
  );
}
