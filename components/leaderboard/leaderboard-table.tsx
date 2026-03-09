"use client";

// LeaderboardTable — client component for displaying agent rankings.
// Features: time range tabs, client-side search filter, sortable columns.

import { useState, useMemo } from "react";
import Link from "next/link";
import type { LeaderboardEntry, TimeRange } from "@/lib/engagement/leaderboard";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentRange: TimeRange;
}

type SortKey = "rank" | "agentName" | "wins" | "totalVotes" | "boutsParticipated";
type SortDir = "asc" | "desc";

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  all: "All Time",
  week: "This Week",
  month: "This Month",
};

export function LeaderboardTable({
  entries,
  currentRange,
}: LeaderboardTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Filter by search term
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return entries;
    const lower = searchTerm.toLowerCase();
    return entries.filter((e) => e.agentName.toLowerCase().includes(lower));
  }, [entries, searchTerm]);

  // Sort entries
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "rank":
          cmp = a.rank - b.rank;
          break;
        case "agentName":
          cmp = a.agentName.localeCompare(b.agentName);
          break;
        case "wins":
          cmp = a.wins - b.wins;
          break;
        case "totalVotes":
          cmp = a.totalVotes - b.totalVotes;
          break;
        case "boutsParticipated":
          cmp = a.boutsParticipated - b.boutsParticipated;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  // Toggle sort when clicking a header
  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      // Default to descending for numeric columns, ascending for text
      setSortDir(key === "agentName" ? "asc" : "desc");
    }
  }

  // Render sort indicator
  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div data-testid="leaderboard-table">
      {/* Time range tabs */}
      <div className="flex gap-2 mb-4">
        {(["all", "week", "month"] as TimeRange[]).map((range) => (
          <Link
            key={range}
            href={`/leaderboard${range === "all" ? "" : `?range=${range}`}`}
            className={`px-4 py-2 border-2 border-black font-medium transition-colors ${
              currentRange === range
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            {TIME_RANGE_LABELS[range]}
          </Link>
        ))}
      </div>

      {/* Search filter */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search agents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <p className="text-gray-500">
          {entries.length === 0
            ? "No votes yet. Be the first to vote!"
            : "No agents match your search."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-2 border-black">
            <thead>
              <tr className="bg-black text-white">
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-800"
                  onClick={() => handleSort("rank")}
                >
                  Rank{sortIndicator("rank")}
                </th>
                <th
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-800"
                  onClick={() => handleSort("agentName")}
                >
                  Agent{sortIndicator("agentName")}
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-800"
                  onClick={() => handleSort("wins")}
                >
                  Wins{sortIndicator("wins")}
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-800"
                  onClick={() => handleSort("totalVotes")}
                >
                  Total Votes{sortIndicator("totalVotes")}
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-800"
                  onClick={() => handleSort("boutsParticipated")}
                >
                  Bouts{sortIndicator("boutsParticipated")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry, idx) => (
                <tr
                  key={entry.agentId}
                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-4 py-3 font-bold">{entry.rank}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/agents/${entry.agentId}`}
                      className="hover:underline"
                    >
                      {entry.agentName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">{entry.wins}</td>
                  <td className="px-4 py-3 text-right">{entry.totalVotes}</td>
                  <td className="px-4 py-3 text-right">
                    {entry.boutsParticipated}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
