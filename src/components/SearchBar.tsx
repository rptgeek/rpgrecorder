"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useDebounce } from "@/lib/hooks/useDebounce"; // We'll need to create this

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function performSearch() {
      if (debouncedQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }

    performSearch();
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-md" ref={searchRef}>
      <div className="relative">
        <input
          type="text"
          placeholder="Search transcripts..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
        />
        <div className="absolute left-3 top-2.5 text-gray-400">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {isSearching && (
          <div className="absolute right-3 top-2.5">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border rounded-lg shadow-xl max-h-96 overflow-y-auto">
          {results.map((session: any) => (
            <Link
              key={session.id}
              href={`/sessions/${session.id}`}
              className="block p-4 hover:bg-gray-50 border-b last:border-b-0"
              onClick={() => setIsOpen(false)}
            >
              <div className="font-semibold text-blue-600">{session.name}</div>
              {session.snippet && (
                <div 
                  className="text-sm text-gray-600 line-clamp-2 mt-1"
                  dangerouslySetInnerHTML={{ __html: session.snippet }}
                />
              )}
            </Link>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && !isSearching && results.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border rounded-lg shadow-xl p-4 text-center text-gray-500">
          No results found for "{query}"
        </div>
      )}
    </div>
  );
}
