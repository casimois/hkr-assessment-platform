"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CandidateRow = {
  id: string;
  name: string;
  email: string;
  source: "lever" | "manual" | "link";
  testsCount: number;
  latestResult: string;
};

const FALLBACK_DATA: CandidateRow[] = [
  {
    id: "1",
    name: "Maria Santos",
    email: "maria.santos@email.com",
    source: "lever",
    testsCount: 2,
    latestResult: "English Proficiency \u2014 85%",
  },
  {
    id: "2",
    name: "James Chen",
    email: "james.chen@email.com",
    source: "manual",
    testsCount: 1,
    latestResult: "Cultural Fit \u2014 completed",
  },
  {
    id: "3",
    name: "Aisha Patel",
    email: "aisha.patel@email.com",
    source: "link",
    testsCount: 1,
    latestResult: "English Proficiency \u2014 in progress",
  },
  {
    id: "4",
    name: "Tom Wilson",
    email: "tom.wilson@email.com",
    source: "lever",
    testsCount: 1,
    latestResult: "English Proficiency \u2014 54%",
  },
  {
    id: "5",
    name: "Lena Kovacs",
    email: "lena.kovacs@email.com",
    source: "lever",
    testsCount: 1,
    latestResult: "English Proficiency \u2014 expired",
  },
];

const SOURCE_STYLES: Record<string, { bg: string; color: string }> = {
  lever: { bg: "var(--success-light)", color: "var(--success)" },
  link: { bg: "var(--blue-light)", color: "var(--blue)" },
  manual: { bg: "var(--accent-light)", color: "var(--accent)" },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateRow[]>(FALLBACK_DATA);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchCandidates() {
      try {
        const { data, error } = await supabase
          .from("candidates")
          .select(
            "*, submissions(id, score, status, assessments(title))"
          )
          .order("created_at", { ascending: false });

        if (error || !data || data.length === 0) return;

        const mapped: CandidateRow[] = data.map(
          (row: Record<string, unknown>) => {
            const submissions = (row.submissions ?? []) as Record<
              string,
              unknown
            >[];
            const latest = submissions[0] as
              | Record<string, unknown>
              | undefined;
            const latestAssessment = latest?.assessments as
              | Record<string, unknown>
              | undefined;

            let latestResult = "--";
            if (latest && latestAssessment) {
              const title = (latestAssessment.title as string) ?? "";
              const score = latest.score as number | null;
              const status = latest.status as string;
              if (score !== null) {
                latestResult = `${title} \u2014 ${score}%`;
              } else {
                latestResult = `${title} \u2014 ${status.replace(/_/g, " ")}`;
              }
            }

            return {
              id: row.id as string,
              name: (row.name as string) ?? "Unknown",
              email: (row.email as string) ?? "",
              source: (row.source as CandidateRow["source"]) ?? "manual",
              testsCount: submissions.length,
              latestResult,
            };
          }
        );

        setCandidates(mapped);
      } catch {
        // fallback data already set
      }
    }

    fetchCandidates();
  }, []);

  const filtered = candidates.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.email.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="anim-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl" style={{ color: "var(--navy)" }}>
            Candidates
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-mut)" }}>
            Manage candidates and send assessment invitations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => alert("Generate link functionality coming soon.")}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={{
              background: "var(--white)",
              color: "var(--navy)",
              border: "1px solid var(--border-light)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--cream)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--white)")
            }
          >
            Generate Link
          </button>
          <button
            onClick={() => alert("Invite candidate functionality coming soon.")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={{
              background: "var(--navy)",
              color: "var(--cream)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Invite
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search candidates by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2.5 rounded-lg text-sm w-80 outline-none transition-colors"
          style={{
            background: "var(--white)",
            border: "1px solid var(--border-light)",
            color: "var(--text)",
          }}
        />
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--white)",
          border: "1px solid var(--border-light)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border-light)",
                }}
              >
                {["Candidate", "Source", "Tests", "Latest Result"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider"
                      style={{ color: "var(--text-mut)" }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const sourceStyle =
                  SOURCE_STYLES[row.source] ?? SOURCE_STYLES.manual;

                return (
                  <tr
                    key={row.id}
                    className="transition-colors"
                    style={{
                      borderBottom: "1px solid var(--border-light)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--cream)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {/* Candidate */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center rounded-full text-xs font-bold shrink-0"
                          style={{
                            width: 34,
                            height: 34,
                            background: "var(--cream)",
                            color: "var(--navy)",
                          }}
                        >
                          {getInitials(row.name)}
                        </div>
                        <div>
                          <div
                            className="text-sm font-medium"
                            style={{ color: "var(--navy)" }}
                          >
                            {row.name}
                          </div>
                          <div
                            className="text-xs"
                            style={{ color: "var(--text-mut)" }}
                          >
                            {row.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Source pill */}
                    <td className="px-5 py-4">
                      <span
                        className="inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                        style={{
                          background: sourceStyle.bg,
                          color: sourceStyle.color,
                        }}
                      >
                        {row.source}
                      </span>
                    </td>

                    {/* Tests count */}
                    <td
                      className="px-5 py-4 text-sm"
                      style={{ color: "var(--text-sec)" }}
                    >
                      {row.testsCount}
                    </td>

                    {/* Latest result */}
                    <td
                      className="px-5 py-4 text-sm"
                      style={{ color: "var(--text-sec)" }}
                    >
                      {row.latestResult}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-sm"
                    style={{ color: "var(--text-mut)" }}
                  >
                    No candidates match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer count */}
      <div
        className="mt-4 text-xs"
        style={{ color: "var(--text-mut)" }}
      >
        Showing {filtered.length} of {candidates.length} candidates
      </div>
    </div>
  );
}
