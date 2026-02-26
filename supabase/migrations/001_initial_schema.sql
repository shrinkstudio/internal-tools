-- ============================================
-- Shrink Internal Tools - Initial Schema
-- ============================================

-- Settings (key-value store for global config)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Overhead items (monthly business costs)
CREATE TABLE overhead_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'subscription',
  monthly_cost DECIMAL(10,2) NOT NULL,
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Roles (team rate card)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  base_cost_day DECIMAL(10,2) NOT NULL,
  markup_pct DECIMAL(5,4) NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Service library (reusable services for scoping)
CREATE TABLE service_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phase TEXT NOT NULL,
  description TEXT,
  typical_effort_min DECIMAL(4,1),
  typical_effort_max DECIMAL(4,1),
  typical_team TEXT[],
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  current_version_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Project versions (snapshots of scoping data)
CREATE TABLE project_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  name TEXT,
  snapshot JSONB NOT NULL,
  total_investment DECIMAL(12,2),
  total_internal_cost DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, version_number)
);

-- Add FK from projects to project_versions
ALTER TABLE projects ADD CONSTRAINT fk_current_version
  FOREIGN KEY (current_version_id) REFERENCES project_versions(id);

-- ============================================
-- Seed Data
-- ============================================

-- Default setting
INSERT INTO settings (key, value) VALUES ('annual_billable_days', '220');

-- Overhead items
INSERT INTO overhead_items (name, category, monthly_cost, notes, sort_order) VALUES
  ('Figma',              'subscription', 154.00, 'Design tool',                1),
  ('Webflow',            'subscription', 124.00, 'Development platform',       2),
  ('ClickUp',            'subscription', 114.00, 'Project management',         3),
  ('Google Workspace',   'subscription',  30.00, 'Email & docs',              4),
  ('Slack',              'subscription',  45.00, 'Team communication',         5),
  ('LinkedIn',           'subscription',  79.00, 'Business development',       6),
  ('Claude.ai',          'subscription',  75.00, 'AI assistant',              7),
  ('OpenAI ChatGPT',     'subscription',  17.00, 'AI tools',                  8),
  ('Superscript',        'subscription',  27.00, 'Business insurance',         9),
  ('Relume',             'subscription',  28.00, 'Design resources',          10),
  ('Ben Salary',         'salary',       768.00, 'Director''s salary',        11),
  ('DocuSign',           'subscription',  12.00, 'Document signing',          12),
  ('Other Tools',        'subscription',  50.00, 'Icons8, Mobbin, etc.',      13),
  ('Work.Life Co-working','workspace',   450.00, 'Office space (variable)',   14);

-- Roles
INSERT INTO roles (title, base_cost_day, markup_pct, sort_order) VALUES
  ('Founder/Technical Director', 600.00, 0.4000, 1),
  ('Senior Developer',           560.00, 0.2000, 2),
  ('Project Manager',            250.00, 0.4000, 3),
  ('Senior Designer',            500.00, 0.3000, 4),
  ('Mid-Level Designer',         350.00, 0.3000, 5),
  ('Account Manager',            300.00, 0.3000, 6),
  ('Mid-Level Developer',        400.00, 0.3000, 7);

-- Service library: Discovery phase
INSERT INTO service_library (name, phase, typical_effort_min, typical_effort_max, typical_team, sort_order) VALUES
  ('Discovery Workshop',         'discovery', 1.0, 2.0, ARRAY['Founder/Technical Director', 'Project Manager'], 1),
  ('Stakeholder Interviews',     'discovery', 0.5, 1.0, ARRAY['Founder/Technical Director', 'Project Manager'], 2),
  ('User Research & Analysis',   'discovery', 2.0, 3.0, ARRAY['Founder/Technical Director', 'Senior Designer'], 3),
  ('Competitive Analysis',       'discovery', 1.0, 2.0, ARRAY['Founder/Technical Director', 'Senior Designer'], 4),
  ('Sitemap & IA Development',   'discovery', 1.0, 2.0, ARRAY['Founder/Technical Director'],                    5),
  ('Digital Strategy Document',  'discovery', 2.0, 3.0, ARRAY['Founder/Technical Director', 'Project Manager'], 6),
  ('Launch Strategy',            'discovery', 1.0, 2.0, ARRAY['Founder/Technical Director', 'Project Manager'], 7),
  ('Content Strategy',           'discovery', 1.0, 2.0, ARRAY['Founder/Technical Director'],                    8);

-- Service library: Development phase
INSERT INTO service_library (name, phase, typical_effort_min, typical_effort_max, typical_team, sort_order) VALUES
  ('Design System Setup',        'development', 2.0,  3.0,  ARRAY['Senior Designer'],                                 9),
  ('Wireframing (Low-fi)',       'development', 1.0,  3.0,  ARRAY['Senior Designer', 'Mid-Level Designer'],           10),
  ('UI Design (High-fi)',        'development', 5.0,  10.0, ARRAY['Senior Designer'],                                11),
  ('Design Revisions',           'development', 0.5,  2.0,  ARRAY['Senior Designer', 'Mid-Level Designer'],           12),
  ('Webflow Setup & Config',     'development', 0.5,  1.0,  ARRAY['Senior Developer'],                               13),
  ('CMS Structure & Build',      'development', 2.0,  4.0,  ARRAY['Senior Developer'],                               14),
  ('Front-end Development',      'development', NULL, NULL,  ARRAY['Senior Developer', 'Mid-Level Developer'],        15),
  ('Responsive (Mobile/Tablet)', 'development', 2.0,  3.0,  ARRAY['Senior Developer', 'Mid-Level Developer'],        16),
  ('Interactions & Animations',  'development', 1.0,  3.0,  ARRAY['Senior Developer'],                               17),
  ('Custom Code/Integrations',   'development', NULL, NULL,  ARRAY['Senior Developer'],                               18),
  ('Content Migration',          'development', 1.0,  5.0,  ARRAY['Project Manager', 'Mid-Level Developer'],          19),
  ('Accessibility (WCAG 2.1)',   'development', 1.0,  2.0,  ARRAY['Senior Developer'],                               20),
  ('Testing & QA',               'development', 1.0,  2.0,  ARRAY['Senior Developer', 'Project Manager'],            21),
  ('Client Training',            'development', 0.5,  1.0,  ARRAY['Founder/Technical Director', 'Project Manager'],  22);

-- Service library: Launch phase
INSERT INTO service_library (name, phase, typical_effort_min, typical_effort_max, typical_team, sort_order) VALUES
  ('Go-Live Deployment',         'launch', 0.5, 1.0, ARRAY['Senior Developer'],                               23),
  ('Post-Launch Monitoring',     'launch', 1.0, 2.0, ARRAY['Senior Developer', 'Mid-Level Developer'],        24),
  ('Performance Optimisation',   'launch', 1.0, 2.0, ARRAY['Senior Developer'],                               25);

-- Service library: Ongoing phase
INSERT INTO service_library (name, phase, typical_effort_min, typical_effort_max, typical_team, sort_order) VALUES
  ('Monthly Retainer Support',   'ongoing', NULL, NULL, ARRAY['Founder/Technical Director', 'Senior Developer', 'Senior Designer'], 26),
  ('Analytics & Reporting',      'ongoing', 1.0,  2.0,  ARRAY['Founder/Technical Director', 'Project Manager'],                    27);

-- ============================================
-- Row Level Security
-- ============================================

-- Enable RLS on all tables
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE overhead_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can do everything (internal tool)
CREATE POLICY "Authenticated users can read settings"
  ON settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update settings"
  ON settings FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users full access to overhead_items"
  ON overhead_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access to roles"
  ON roles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access to service_library"
  ON service_library FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access to projects"
  ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access to project_versions"
  ON project_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public read access to projects for /p/[slug] public proposal page
CREATE POLICY "Public can read projects by slug"
  ON projects FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read project_versions"
  ON project_versions FOR SELECT TO anon USING (true);
