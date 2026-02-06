"use client";

import React, { useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PDFRecap } from "./PDFRecap";
import { Button } from "./ui/button"; // Assuming a Button component exists or I'll use standard button
import { Copy, Download, Share2, Check } from "lucide-react";

interface ExportControlsProps {
  sessionName: string;
  campaignName?: string;
  date: string;
  playerRecap: string;
  shareToken: string | null;
}

export default function ExportControls({
  sessionName,
  campaignName,
  date,
  playerRecap,
  shareToken,
}: ExportControlsProps) {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(playerRecap);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleCopyLink = async () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/share/${shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      <button
        onClick={handleCopyText}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        {copiedText ? (
          <>
            <Check className="w-4 h-4 text-green-500" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            <span>Copy Text</span>
          </>
        )}
      </button>

      <PDFDownloadLink
        document={
          <PDFRecap
            sessionName={sessionName}
            campaignName={campaignName}
            date={date}
            playerRecap={playerRecap}
          />
        }
        fileName={`${sessionName.replace(/\s+/g, "_")}_Recap.pdf`}
      >
        {({ loading }) => (
          <button
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{loading ? "Preparing PDF..." : "Download PDF"}</span>
          </button>
        )}
      </PDFDownloadLink>

      {shareToken && (
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {copiedLink ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              <span>Link Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>Copy Share Link</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
