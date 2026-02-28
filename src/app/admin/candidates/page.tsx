"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import InviteModal from "@/components/admin/InviteModal";
import GenerateLinkModal from "@/components/admin/GenerateLinkModal";

type CandidateRow = {
  id: string;
  name: string;
  email: string;
  source: "lever" | "manual" | "link";
  testsCount: number;
  latestResult: string;
};

type AssessmentOption = { id: string; title: string };

const FALLBACK_DATA: CandidateRow[] = [
  { id: "1", name: "Maria Santos", email: "maria.santos@email.com", source: "lever", testsCount: 2, latestResult: "English Proficiency \u2014 85%" },
  { id: "2", name: "James Chen", email: "james.chen@email.com", source: "manual", testsCount: 1, latestResult: "Cultural Fit \u2014 completed" },
  { id: "3", name: "Aisha Patel", email: "aisha.patel@email.com", source: "link", testsCount: 1, latestResult: "English Proficiency \u2014 in progress" },
  { id: "4", name: "Tom Wilson", email: "tom.wilson@email.com", source: "lever", testsCount: 1, latestResult: "English Proficiency \u2014 54%" },
  { id: "5", name: "Lena Kovacs", email: "lena.kovacs@email.com", source: "lever", testsCount: 1, latestResult: "English Proficiency \u2014 expired" },
];

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateRow[]>(FALLBACK_DATA);
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [candResult, assessResult] = await Promise.all([
          supabase
            .from("candidates")
            .select("*, submissions(id, score, status, assessments(title))")
            .order("created_at", { ascending: false }),
          supabase.from("assessments").select("id, title").eq("status", "active"),
        ]);

        if (!candResult.error && candResult.data && candResult.data.length > 0) {
          const mapped: CandidateRow[] = candResult.data.map((row: Record<string, unknown>) => {
            const submissions = (row.submissions ?? []) as Record<string, unknown>[];
            const latest = submissions[0] as Record<string, unknown> | undefined;
            const latestAssessment = latest?.assessments as Record<string, unknown> | undefined;
            let latestResult = "--";
            if (latest && latestAssessment) {
              const title = (latestAssessment.title as string) ?? "";
              const score = latest.score as number | null;
              const status = latest.status as string;
              if (score !== null) latestResult = `${title} \u2014 ${score}%`;
              else latestResult = `${title} \u2014 ${status.replace(/_/g, " ")}`;
            }
            return {
              id: row.id as string,
              name: (row.name as string) ?? "Unknown",
              email: (row.email as string) ?? "",
              source: (row.source as CandidateRow["source"]) ?? "manual",
              testsCount: submissions.length,
              latestResult,
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
  }, []);

  const filtered = candidates.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.email.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
  });

  const reload = () => window.location.reload();

  return (
    <div className="anim-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, color: 'var(--navy)', marginBottom: 4 }}>Candidates</h1>
          <p style={{ fontSize: 14, color: 'var(--text-mut)' }}>Manage candidates and send assessment invitations.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => setLinkOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            Generate Link
          </button>
          <button className="btn btn-primary" onClick={() => setInviteOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Invite
          </button>
        </div>
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
                {["Candidate", "Source", "Tests", "Latest Result"].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '14px 20px', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-mut)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
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
                    <span className={row.source === 'lever' ? 'pill pill-success' : row.source === 'link' ? 'pill pill-blue' : 'pill pill-accent'} style={{ textTransform: 'capitalize' }}>{row.source}</span>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: 14, color: 'var(--text-sec)' }}>{row.testsCount}</td>
                  <td style={{ padding: '16px 20px', fontSize: 14, color: 'var(--text-sec)' }}>{row.latestResult}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '48px 20px', textAlign: 'center', fontSize: 14, color: 'var(--text-mut)' }}>No candidates match your search.</td>
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
