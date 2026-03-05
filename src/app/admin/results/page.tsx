"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { getAccessibleProjectIds } from "@/lib/access";

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
  rawDate: number;
};

type SortKey = "score" | "date";
type SortDir = "asc" | "desc";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatStatus(s: string) { return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()); }

export default function ResultsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [results, setResults] = useState<ResultRow[]>([]);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [passFilter, setPassFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    async function fetchResults() {
      try {
        const { data, error } = await supabase
          .from("submissions")
          .select("*, assessments(title, type, project_id, projects(name)), candidates(name, email)")
          .order("created_at", { ascending: false });
        if (error || !data || data.length === 0) return;

        // Scope by accessible projects for 'user' role
        let scopedData = data;
        if (profile?.role === 'user') {
          const { data: projects } = await supabase.from('projects').select('*');
          const accessibleIds = getAccessibleProjectIds(projects ?? [], profile);
          scopedData = data.filter((row: Record<string, unknown>) => {
            const assessment = row.assessments as Record<string, unknown> | null;
            return assessment?.project_id && accessibleIds.includes(assessment.project_id as string);
          });
        }

        setResults(scopedData.map((row: Record<string, unknown>) => {
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
            date: new Date(row.created_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            rawDate: new Date(row.created_at as string).getTime(),
          };
        }));
      } catch { /* fallback */ }
    }
    fetchResults();
  }, [profile]);

  const projects = [...new Set(results.map(r => r.project))];

  const filtered = results.filter(r => {
    if (search && !r.candidateEmail.toLowerCase().includes(search.toLowerCase()) && !r.candidateName.toLowerCase().includes(search.toLowerCase())) return false;
    if (projectFilter !== "all" && r.project !== projectFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (passFilter === "passed" && (r.type === 'open' || r.passed !== true)) return false;
    if (passFilter === "failed" && (r.type === 'open' || r.passed !== false)) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "score") {
      const aScore = a.score ?? -1;
      const bScore = b.score ?? -1;
      return sortDir === "asc" ? aScore - bScore : bScore - aScore;
    }
    return sortDir === "asc" ? a.rawDate - b.rawDate : b.rawDate - a.rawDate;
  });

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
  }

  function handleExport() {
    const header = "Candidate,Email,Assessment,Type,Project,Status,Score,Passed,Date";
    const rows = filtered.map(r => `"${r.candidateName}","${r.candidateEmail}","${r.assessment}","${r.type}","${r.project}","${r.status}",${r.score ?? ""},${r.passed ?? ""},${r.date}`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "results-export.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function statusPillCls(s: string) {
    if (s === 'completed') return 'pill pill-success';
    if (s === 'in_progress') return 'pill pill-accent';
    if (s === 'expired') return 'pill pill-danger';
    return 'pill pill-navy';
  }

  const thStyle: React.CSSProperties = { textAlign: 'left', padding: '14px 20px', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-mut)', whiteSpace: 'nowrap' };
  const sortableThStyle: React.CSSProperties = { ...thStyle, cursor: 'pointer', userSelect: 'none' };

  function sortArrow(key: SortKey) {
    if (sortBy !== key) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div className="anim-up">
      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <button className="btn btn-primary" onClick={handleExport}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <input className="form-input" type="text" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 260 }} />
        <select className="form-select" style={{ width: 'auto', minWidth: 130, padding: '8px 36px 8px 14px', fontSize: 13 }} value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
          <option value="all">All Projects</option>
          {projects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto', minWidth: 130, padding: '8px 36px 8px 14px', fontSize: 13 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
          <option value="expired">Expired</option>
          <option value="pending">Pending</option>
        </select>
        <select className="form-select" style={{ width: 'auto', minWidth: 120, padding: '8px 36px 8px 14px', fontSize: 13 }} value={passFilter} onChange={e => setPassFilter(e.target.value)}>
          <option value="all">Pass / Fail</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 800 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                <th style={thStyle}>Candidate</th>
                <th style={thStyle}>Assessment</th>
                <th style={thStyle}>Project</th>
                <th style={thStyle}>Status</th>
                <th style={sortableThStyle} onClick={() => toggleSort("score")}>Score{sortArrow("score")}</th>
                <th style={sortableThStyle} onClick={() => toggleSort("date")}>Date{sortArrow("date")}</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--cream)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--cream)', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{getInitials(row.candidateName)}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{row.candidateName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-mut)' }}>{row.candidateEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{row.assessment}</td>
                  <td style={{ padding: '16px 20px', fontSize: 14, color: 'var(--text-sec)' }}>{row.project}</td>
                  <td style={{ padding: '16px 20px' }}><span className={statusPillCls(row.status)}>{formatStatus(row.status)}</span></td>
                  <td style={{ padding: '16px 20px' }}>
                    {row.type === 'open' ? (
                      <span style={{ fontSize: 13, color: 'var(--text-mut)' }}>—</span>
                    ) : row.score !== null ? (
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: row.passed ? 'var(--success)' : 'var(--danger)' }}>{row.score}%</span>
                    ) : (
                      <span style={{ fontSize: 13, color: 'var(--text-mut)' }}>--</span>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-mut)' }}>{row.date}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => router.push(`/admin/results/${row.id}`)}>View</button>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '48px 20px', textAlign: 'center', fontSize: 14, color: 'var(--text-mut)' }}>No results match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-mut)' }}>Showing {filtered.length} of {results.length} submissions</div>
    </div>
  );
}
