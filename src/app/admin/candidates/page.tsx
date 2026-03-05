"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { getAccessibleProjectIds } from "@/lib/access";
import InviteModal from "@/components/admin/InviteModal";
import GenerateLinkModal from "@/components/admin/GenerateLinkModal";

type SubmissionInfo = {
  id: string;
  assessmentTitle: string;
  status: string;
  score: number | null;
};

type CandidateRow = {
  id: string;
  name: string;
  email: string;
  source: "lever" | "manual" | "link";
  submissions: SubmissionInfo[];
  latestStatus: string;
};

type AssessmentOption = { id: string; title: string };

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function CandidatesPage() {
  const { profile } = useAuth();
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // If user role, get accessible project IDs first
        let accessibleIds: string[] | null = null;
        if (profile?.role === 'user') {
          const { data: projects } = await supabase.from('projects').select('*');
          accessibleIds = getAccessibleProjectIds(projects ?? [], profile);
        }

        const [candResult, assessResult] = await Promise.all([
          supabase
            .from("candidates")
            .select("*, submissions(id, score, status, assessment_id, assessments(title, project_id))")
            .order("created_at", { ascending: false }),
          supabase.from("assessments").select("id, title").eq("status", "active"),
        ]);

        if (!candResult.error && candResult.data && candResult.data.length > 0) {
          let candidateData = candResult.data;

          // Filter candidates: only those with at least one submission in accessible projects
          if (accessibleIds) {
            candidateData = candidateData.filter((row: Record<string, unknown>) => {
              const submissions = (row.submissions ?? []) as Record<string, unknown>[];
              return submissions.some(s => {
                const assessment = s.assessments as Record<string, unknown> | null;
                return assessment?.project_id && accessibleIds!.includes(assessment.project_id as string);
              });
            });
          }

          const mapped: CandidateRow[] = candidateData.map((row: Record<string, unknown>) => {
            const rawSubs = (row.submissions ?? []) as Record<string, unknown>[];
            const subs: SubmissionInfo[] = rawSubs.map(s => {
              const assessment = s.assessments as Record<string, unknown> | undefined;
              return {
                id: s.id as string,
                assessmentTitle: (assessment?.title as string) ?? 'Unknown',
                status: (s.status as string) ?? 'pending',
                score: (s.score as number | null) ?? null,
              };
            });
            const latest = subs[0];
            return {
              id: row.id as string,
              name: (row.name as string) ?? "Unknown",
              email: (row.email as string) ?? "",
              source: (row.source as CandidateRow["source"]) ?? "manual",
              submissions: subs,
              latestStatus: latest?.status ?? '--',
            };
          });
          setCandidates(mapped);
        }

        if (!assessResult.error && assessResult.data) {
          setAssessments(assessResult.data as AssessmentOption[]);
        }
      } catch {
        // fallback data already set
      }
    }
    fetchData();
  }, [profile]);

  const filtered = candidates.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.email.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
  });

  const reload = () => window.location.reload();

  return (
    <div className="anim-up">
      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-secondary" onClick={() => setLinkOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          Generate Link
        </button>
        <button className="btn btn-primary" onClick={() => setInviteOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Invite
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 24 }}>
        <input
          className="form-input"
          type="text"
          placeholder="Search candidates by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                {["Candidate", "Source", "Assessments", "Status", "Latest Score"].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '14px 20px', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-mut)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const latest = row.submissions[0];
                const statusPill = (status: string) => {
                  const map: Record<string, { cls: string; label: string }> = {
                    completed: { cls: 'pill pill-success', label: 'Completed' },
                    in_progress: { cls: 'pill pill-accent', label: 'In Progress' },
                    pending: { cls: 'pill pill-navy', label: 'Pending' },
                    expired: { cls: 'pill pill-danger', label: 'Expired' },
                  };
                  const s = map[status] ?? { cls: 'pill pill-navy', label: status };
                  return <span className={s.cls}>{s.label}</span>;
                };
                return (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--cream)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--cream)', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{getInitials(row.name)}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{row.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-mut)' }}>{row.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span className="pill pill-navy" style={{ textTransform: 'capitalize' }}>{row.source}</span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {row.submissions.length === 0 ? (
                      <span style={{ fontSize: 13, color: 'var(--text-mut)' }}>--</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {row.submissions.slice(0, 3).map(sub => (
                          <div key={sub.id} style={{ fontSize: 13, color: 'var(--text-sec)' }}>
                            {sub.assessmentTitle}
                          </div>
                        ))}
                        {row.submissions.length > 3 && (
                          <div style={{ fontSize: 11, color: 'var(--text-mut)' }}>+{row.submissions.length - 3} more</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {latest ? statusPill(latest.status) : <span style={{ fontSize: 13, color: 'var(--text-mut)' }}>--</span>}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {latest?.score !== null && latest?.score !== undefined ? (
                      <span style={{ fontSize: 14, fontWeight: 600, color: latest.score >= 70 ? 'var(--success)' : 'var(--danger)' }}>{latest.score}%</span>
                    ) : (
                      <span style={{ fontSize: 13, color: 'var(--text-mut)' }}>--</span>
                    )}
                  </td>
                </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 20px', textAlign: 'center', fontSize: 14, color: 'var(--text-mut)' }}>
                    {search ? 'No candidates match your search.' : (
                      <>
                        <p style={{ marginBottom: 16 }}>No candidates yet. Use Invite or Generate Link to add your first candidate.</p>
                        <button className="btn btn-primary btn-sm" onClick={() => setInviteOpen(true)}>Invite Candidate</button>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-mut)' }}>
        Showing {filtered.length} of {candidates.length} candidates
      </div>

      {/* Modals */}
      <InviteModal isOpen={inviteOpen} onClose={() => { setInviteOpen(false); reload(); }} assessments={assessments} />
      <GenerateLinkModal isOpen={linkOpen} onClose={() => { setLinkOpen(false); reload(); }} assessments={assessments} />
    </div>
  );
}
