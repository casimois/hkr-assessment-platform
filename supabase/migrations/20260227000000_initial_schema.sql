-- HKR Assessment Platform Database Schema

-- Enable pgcrypto for gen_random_bytes
create extension if not exists "pgcrypto";

-- Projects table
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text,
  team text,
  description text,
  lever_tag text,
  created_at timestamptz default now()
);

-- Assessments table
create table assessments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null check (type in ('scoring', 'open')) default 'scoring',
  status text not null check (status in ('active', 'draft', 'archived')) default 'draft',
  project_id uuid references projects(id) on delete set null,
  role text,
  time_limit integer not null default 20,
  pass_threshold integer default 70,
  sections jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Candidates table
create table candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  source text not null check (source in ('manual', 'link', 'lever')) default 'manual',
  created_at timestamptz default now()
);

-- Submissions table
create table submissions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  status text not null check (status in ('pending', 'in_progress', 'completed', 'expired')) default 'pending',
  answers jsonb default '{}'::jsonb,
  score numeric(5,2),
  passed boolean,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes
create index idx_submissions_token on submissions(token);
create index idx_submissions_assessment on submissions(assessment_id);
create index idx_submissions_candidate on submissions(candidate_id);
create index idx_assessments_project on assessments(project_id);
create index idx_candidates_email on candidates(email);

-- Updated at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger assessments_updated_at
  before update on assessments
  for each row execute function update_updated_at();

-- Seed data
insert into projects (id, name, client, team, description, lever_tag) values
  ('a1000000-0000-0000-0000-000000000001', 'Client Onboarding', 'Acme Corp', 'Recruiting', 'Standard candidate assessments', 'acme-onboard'),
  ('a1000000-0000-0000-0000-000000000002', 'Talent Pipeline', 'TechStart', 'Engineering', 'General screening', null);

insert into assessments (id, title, description, type, status, project_id, role, time_limit, pass_threshold, sections) values
  ('b1000000-0000-0000-0000-000000000001', 'English Proficiency Assessment', 'Evaluate written English skills for client-facing roles', 'scoring', 'active', 'a1000000-0000-0000-0000-000000000001', 'Project Manager', 20, 70, '[
    {"title": "Reading & Grammar", "questions": [
      {"id": "q1", "type": "multiple_choice", "text": "Which sentence is grammatically correct?", "points": 10, "weight": 1.0, "options": ["She don''t have any experience.", "She doesn''t have any experience.", "She don''t has any experience.", "She do not has any experience."], "correct": 1},
      {"id": "q2", "type": "fill_blank", "text": "Complete: \"The meeting was _____ due to unforeseen circumstances.\"", "points": 10, "weight": 1.0, "accepted_answers": ["cancelled", "postponed"]},
      {"id": "q3", "type": "ranking", "text": "Rank these email components in the correct order:", "points": 10, "weight": 1.5, "items": ["Subject line", "Greeting", "Body", "Closing", "Signature"]}
    ]},
    {"title": "Writing", "questions": [
      {"id": "q4", "type": "written", "text": "Write a professional email to a client informing them of a project delay. Include the reason, revised timeline, and mitigation steps.", "points": 20, "weight": 2.0, "min_words": 50, "max_words": 300}
    ]}
  ]'::jsonb),
  ('b1000000-0000-0000-0000-000000000002', 'Cultural Fit Interview', 'Assess cultural alignment and communication skills', 'open', 'active', 'a1000000-0000-0000-0000-000000000002', 'General', 30, null, '[
    {"title": "Values & Culture", "questions": [
      {"id": "q1", "type": "written", "text": "Describe a situation where you had to adapt to a new team culture. What was challenging and how did you handle it?", "points": 0, "weight": 1.0, "min_words": 100, "max_words": 500},
      {"id": "q2", "type": "written", "text": "What does ''teamwork'' mean to you? Give a specific example from your experience.", "points": 0, "weight": 1.0, "min_words": 100, "max_words": 500},
      {"id": "q3", "type": "written", "text": "How do you handle disagreements with colleagues?", "points": 0, "weight": 1.0, "min_words": 80, "max_words": 400}
    ]}
  ]'::jsonb),
  ('b1000000-0000-0000-0000-000000000003', 'Technical Assessment', 'Evaluate technical skills for developer roles', 'scoring', 'draft', 'a1000000-0000-0000-0000-000000000001', 'Developer', 45, 65, '[]'::jsonb);

insert into candidates (id, name, email, source) values
  ('c1000000-0000-0000-0000-000000000001', 'Maria Santos', 'maria.s@company.com', 'lever'),
  ('c1000000-0000-0000-0000-000000000002', 'James Chen', 'j.chen@email.com', 'manual'),
  ('c1000000-0000-0000-0000-000000000003', 'Tom Wilson', 't.wilson@mail.com', 'lever'),
  ('c1000000-0000-0000-0000-000000000004', 'Aisha Patel', 'a.patel@org.com', 'link'),
  ('c1000000-0000-0000-0000-000000000005', 'Lena Kovacs', 'lena.k@firm.io', 'lever');

insert into submissions (id, assessment_id, candidate_id, token, status, score, passed, answers, started_at, completed_at) values
  ('d1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'tok_maria_english', 'completed', 85.00, true, '{"q1": 1, "q2": "postponed", "q3": [0,1,2,3,4], "q4": "Dear Mr. Johnson,\n\nI hope this email finds you well. I''m writing to inform you about a schedule adjustment for the Phase 2 deliverables.\n\nDue to an unexpected dependency on the third-party API integration, we need to extend our timeline by approximately one week.\n\nTo mitigate the impact, our team has already begun working in parallel on Phase 3 components.\n\nBest regards,\nMaria Santos"}'::jsonb, now() - interval '2 hours', now() - interval '1 hour'),
  ('d1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'tok_james_cultural', 'completed', null, null, '{"q1": "In my previous role...", "q2": "Teamwork means...", "q3": "I handle disagreements..."}'::jsonb, now() - interval '3 hours', now() - interval '2 hours'),
  ('d1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 'tok_tom_english', 'completed', 54.00, false, '{"q1": 0, "q2": "delayed", "q3": [2,0,1,4,3], "q4": "Hi, there is a delay."}'::jsonb, now() - interval '1 day', now() - interval '23 hours'),
  ('d1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004', 'tok_aisha_english', 'in_progress', null, null, '{"q1": 1}'::jsonb, now() - interval '30 minutes', null),
  ('d1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000005', 'tok_lena_english', 'expired', null, null, '{}'::jsonb, null, null);

-- Row Level Security (permissive for now)
alter table projects enable row level security;
alter table assessments enable row level security;
alter table candidates enable row level security;
alter table submissions enable row level security;

create policy "Allow all for projects" on projects for all using (true) with check (true);
create policy "Allow all for assessments" on assessments for all using (true) with check (true);
create policy "Allow all for candidates" on candidates for all using (true) with check (true);
create policy "Allow all for submissions" on submissions for all using (true) with check (true);
