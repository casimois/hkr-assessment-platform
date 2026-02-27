"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ResultRow = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  assessment: string;
  type: "scoring" | "open";
  project: string;
  status: "completed" | "in_progress" | "expired" | "pending";
  score: number | null;
  passed: boolean | null;
  date: string;
};

const FALLBACK_DATA: ResultRow[] = [
  {
    id: "1",
    candidateName: "Maria Santos",
    candidateEmail: "maria.santos@email.com",
    assessment: "English Proficiency",
    type: "scoring",
    project: "Client Onboarding",
    status: "completed",
    score: 85,
    passed: true,
    date: "Feb 27, 2026",
  },
  {
    id: "2",
    candidateName: "James Chen",
    candidateEmail: "james.chen@email.com",
    assessment: "Cultural Fit",
    type: "open",
    project: "Talent Pipeline",
    status: "completed",
    score: null,
    passed: null,
    date: "Feb 27, 2026",
  },
  {
    id: "3",
    candidateName: "Tom Wilson",
    candidateEmail: "tom.wilson@email.com",
    assessment: "English Proficiency",
    type: "scoring",
    project: "Client Onboarding",
    status: "completed",
    score: 54,
    passed: false,
    date: "Feb 26, 2026",
  },
  {
    id: "4",
    candidateName: "Aisha Patel",
    candidateEmail: "aisha.patel@email.com",
    assessment: "English Proficiency",
    type: "scoring",
    project: "Client Onboarding",
    status: "in_progress",
    score: null,
    passed: null,
    date: "Feb 27, 2026",
  },
  {
    id: "5",
    candidateName: "Lena Kovacs",
    candidateEmail: "lena.kovacs@email.com",
    assessment: "English Proficiency",
    type: "scoring",
    project: "Talent Pipeline",
    status: "expired",
    score: null,
    passed: null,
    date: "Feb 25, 2026",
  },
];

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  completed: { bg: "var(--success-light)", color: "var(--success)" },
  in_progress: { bg: "var(--accent-light)", color: "var(--accent)" },
  expired: { bg: "var(--cream)", color: "var(--navy)" },
  pending: { bg: "var(--cream)", color: "var(--text-mut)" },
};

const TYPE_STYLES: Record<string, { bg: string; color: string }> = {
  scoring: { bg: "var(--blue-light)", color: "var(--blue)" },
  open: { bg: "var(--purple-light)", color: "var(--purple)" },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ResultsPage() {
  const [results, setResults] = useState<ResultRow[]>(FALLBACK_DATA);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [passFilter, setPassFilter] = useState("all");

  useEffect(() => {
    async function fetchResults() {
      try {
        const { data, error } = await supabase
          .from("submissions")
          .select(
            "*, assessments(title, type, project_id, projects(name)), candidates(name, email)"
          )
          .order("created_at", { ascending: false });

        if (error || !data || data.length === 0) return;

        const mapped: ResultRow[] = data.map((row: Record<string, unknown>) => {
          const assessment = row.assessments as Record<string, unknown> | null;
          const candidate = row.candidates as Record<string, unknown> | null;
          const project = assessment?.projects as Record<string, unknown> | null;
          return {
            id: row.id as string,
            candidateName: (candidate?.name as string) ?? "Unknown",
            candidateEmail: (candidate?.email as string) ?? "",
            assessment: (assessment?.title as string) ?? "Untitled",
            type: (assessment?.type as "scoring" | "open") ?? "scoring",
            project: (project?.name as string) ?? "No Project",
            status: row.status as ResultRow["status"],
            score: row.score as number | null,
            passed: row.passed as boolean | null,
            date: new Date(row.created_at as string).toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric", year: "numeric" }
            ),
          };
        });

        setResults(mapped);
      } catch {
        // fallback data already set
      }
    }

    fetchResults();
  }, []);

  const projects = [...new Set(results.map((r) => r.project))];

  const filtered = results.filter((r) => {
    if (
      search &&
      !r.candidateEmail.toLowerCase().includes(search.toLowerCase()) &&
      !r.candidateName.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (projectFilter !== "all" && r.project !== projectFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (passFilter === "passed" && r.passed !== true) return false;
    if (passFilter === "failed" && r.passed !== false) return false;
    return true;
  });

  function handleExport() {
    const header = "Candidate,Email,Assessment,Type,Project,Status,Score,Passed,Date";
    const rows = filtered.map(
      (r) =>
        `"${r.candidateName}","${r.candidateEmail}","${r.assessment}","${r.type}","${r.project}","${r.status}",${r.score ?? ""},${r.passed ?? ""},${r.date}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "results-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="anim-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl" style={{ color: "var(--navy)" }}>
            Results
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-mut)" }}>
            View and export all assessment submissions.
          </p>
        </div>
        <button
          onClick={handleExport}
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap items-center gap-3 mb-6"
      >
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2.5 rounded-lg text-sm w-64 outline-none transition-colors"
          style={{
            background: "var(--white)",
            border: "1px solid var(--border-light)",
            color: "var(--text)",
          }}
        />
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
          style={{
            background: "var(--white)",
            border: "1px solid var(--border-light)",
            color: "var(--text-sec)",
          }}
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
          style={{
            background: "var(--white)",
            border: "1px solid var(--border-light)",
            color: "var(--text-sec)",
          }}
        >
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
          <option value="expired">Expired</option>
          <option value="pending">Pending</option>
        </select>
        <select
          value={passFilter}
          onChange={(e) => setPassFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
          style={{
            background: "var(--white)",
            border: "1px solid var(--border-light)",
            color: "var(--text-sec)",
          }}
        >
          <option value="all">Pass / Fail</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
        </select>
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
                {[
                  "Candidate",
                  "Assessment",
                  "Type",
                  "Project",
                  "Status",
                  "Score",
                  "Date",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-mut)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const statusStyle =
                  STATUS_STYLES[row.status] ?? STATUS_STYLES.pending;
                const typeStyle =
                  TYPE_STYLES[row.type] ?? TYPE_STYLES.scoring;

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
                          {getInitials(row.candidateName)}
                        </div>
                        <div>
                          <div
                            className="text-sm font-medium"
                            style={{ color: "var(--navy)" }}
                          >
                            {row.candidateName}
                          </div>
                          <div
                            className="text-xs"
                            style={{ color: "var(--text-mut)" }}
                          >
                            {row.candidateEmail}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Assessment */}
                    <td
                      className="px-5 py-4 text-sm font-medium"
                      style={{ color: "var(--text)" }}
                    >
                      {row.assessment}
                    </td>

                    {/* Type pill */}
                    <td className="px-5 py-4">
                      <span
                        className="inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                        style={{
                          background: typeStyle.bg,
                          color: typeStyle.color,
                        }}
                      >
                        {row.type}
                      </span>
                    </td>

                    {/* Project */}
                    <td
                      className="px-5 py-4 text-sm"
                      style={{ color: "var(--text-sec)" }}
                    >
                      {row.project}
                    </td>

                    {/* Status pill */}
                    <td className="px-5 py-4">
                      <span
                        className="inline-block px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: statusStyle.bg,
                          color: statusStyle.color,
                        }}
                      >
                        {formatStatus(row.status)}
                      </span>
                    </td>

                    {/* Score */}
                    <td className="px-5 py-4">
                      {row.score !== null ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-medium"
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              color:
                                row.passed
                                  ? "var(--success)"
                                  : "var(--danger)",
                            }}
                          >
                            {row.score}%
                          </span>
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
                            style={{
                              background: row.passed
                                ? "var(--success-light)"
                                : "var(--danger-light)",
                              color: row.passed
                                ? "var(--success)"
                                : "var(--danger)",
                            }}
                          >
                            {row.passed ? "Passed" : "Failed"}
                          </span>
                        </div>
                      ) : (
                        <span
                          className="text-xs"
                          style={{ color: "var(--text-mut)" }}
                        >
                          --
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td
                      className="px-5 py-4 text-sm"
                      style={{ color: "var(--text-mut)" }}
                    >
                      {row.date}
                    </td>

                    {/* View button */}
                    <td className="px-5 py-4">
                      <button
                        className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        style={{
                          background: "var(--cream)",
                          color: "var(--navy)",
                          border: "1px solid var(--border-light)",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "var(--border-light)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "var(--cream)")
                        }
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-sm"
                    style={{ color: "var(--text-mut)" }}
                  >
                    No results match your filters.
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
        Showing {filtered.length} of {results.length} submissions
      </div>
    </div>
  );
}
