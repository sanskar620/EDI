-- =============================================
-- COURSES SYSTEM TABLES + MOCK DATA
-- Run this in Supabase SQL Editor
-- =============================================

-- Drop existing tables (clean slate)
DROP TABLE IF EXISTS course_enrollments CASCADE;
DROP TABLE IF EXISTS course_materials CASCADE;
DROP TABLE IF EXISTS courses CASCADE;

-- 1. Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT NOT NULL DEFAULT 'General',
  trainer_id INTEGER REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create course_materials table
CREATE TABLE IF NOT EXISTS course_materials (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  material_type TEXT NOT NULL CHECK (material_type IN ('VIDEO','PDF','QUIZ','DOCUMENT','LINK')),
  content_url TEXT,
  quiz_data JSONB,
  description TEXT,
  duration_seconds INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  progress REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ENROLLED' CHECK (status IN ('ENROLLED','IN_PROGRESS','COMPLETED')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(course_id, user_id)
);

-- 4. Enable RLS (but allow all for now)
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on courses" ON courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on course_materials" ON course_materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on course_enrollments" ON course_enrollments FOR ALL USING (true) WITH CHECK (true);

-- 5. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE courses;
ALTER PUBLICATION supabase_realtime ADD TABLE course_materials;
ALTER PUBLICATION supabase_realtime ADD TABLE course_enrollments;

-- =============================================
-- MOCK DATA
-- =============================================

-- Get a trainer ID (first trainer found)
DO $$
DECLARE
  v_trainer_id INTEGER;
  v_course1_id INTEGER;
  v_course2_id INTEGER;
  v_course3_id INTEGER;
  v_trainee_ids INTEGER[];
BEGIN
  -- Find a trainer
  SELECT id INTO v_trainer_id FROM users WHERE role = 'TRAINER' LIMIT 1;
  IF v_trainer_id IS NULL THEN
    RAISE NOTICE 'No trainer found, using id=1';
    v_trainer_id := 1;
  END IF;

  -- Course 1: AL&M Course
  INSERT INTO courses (title, description, topic, trainer_id, status, created_at, updated_at)
  VALUES (
    'AL&M - Anti Money Laundering',
    'Comprehensive course covering Anti-Money Laundering regulations, KYC procedures, suspicious transaction reporting, and compliance frameworks. Essential for all financial sector employees.',
    'Compliance',
    v_trainer_id,
    'PUBLISHED',
    now(),
    now()
  ) RETURNING id INTO v_course1_id;

  -- Course 1 Materials
  INSERT INTO course_materials (course_id, title, material_type, content_url, description, duration_seconds, order_index) VALUES
  (v_course1_id, 'Introduction to AML', 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4', 'Overview of Anti-Money Laundering concepts and why they matter', 600, 1),
  (v_course1_id, 'KYC Procedures Deep Dive', 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4', 'Know Your Customer procedures and documentation requirements', 900, 2),
  (v_course1_id, 'AML Compliance Guidelines', 'PDF', 'https://example.com/aml-guidelines.pdf', 'Official AML compliance documentation and reference guide', NULL, 3),
  (v_course1_id, 'Suspicious Transaction Reporting', 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4', 'How to identify and report suspicious transactions', 720, 4);

  -- Course 1 Quiz
  INSERT INTO course_materials (course_id, title, material_type, quiz_data, description, order_index) VALUES
  (v_course1_id, 'AML Assessment', 'QUIZ', '{
    "questions": [
      {"id": 1, "question": "What does AML stand for?", "options": ["Anti-Money Laundering", "Advanced Money Lending", "Automated Money Logistics", "Asset Management Law"], "correct": 0},
      {"id": 2, "question": "What is the primary purpose of KYC?", "options": ["Marketing", "Customer verification and identity", "Loan processing", "Tax collection"], "correct": 1},
      {"id": 3, "question": "Which is a red flag for money laundering?", "options": ["Regular salary deposits", "Large unexplained cash transactions", "Mortgage payments", "Utility payments"], "correct": 1},
      {"id": 4, "question": "Who should you report suspicious transactions to?", "options": ["Media", "Compliance officer / FIU", "The customer", "Social media"], "correct": 1},
      {"id": 5, "question": "What is the threshold for cash transaction reporting in India?", "options": ["₹1 lakh", "₹5 lakhs", "₹10 lakhs", "₹50 lakhs"], "correct": 2}
    ]
  }'::jsonb, 'Test your understanding of AML concepts', 5);

  -- Course 2: Cybersecurity
  INSERT INTO courses (title, description, topic, trainer_id, status, created_at, updated_at)
  VALUES (
    'Cybersecurity Fundamentals',
    'Learn essential cybersecurity practices including password management, phishing detection, data protection, and incident response. Mandatory for all employees handling sensitive data.',
    'Technology',
    v_trainer_id,
    'PUBLISHED',
    now(),
    now()
  ) RETURNING id INTO v_course2_id;

  -- Course 2 Materials
  INSERT INTO course_materials (course_id, title, material_type, content_url, description, duration_seconds, order_index) VALUES
  (v_course2_id, 'Cybersecurity Basics', 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4', 'Introduction to cybersecurity threats and best practices', 480, 1),
  (v_course2_id, 'Phishing Attack Prevention', 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4', 'How to identify and avoid phishing emails and websites', 600, 2),
  (v_course2_id, 'Password Security Best Practices', 'PDF', 'https://example.com/password-guide.pdf', 'Guide to creating and managing strong passwords', NULL, 3),
  (v_course2_id, 'Data Protection & Privacy', 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4', 'Understanding data protection laws and privacy regulations', 540, 4),
  (v_course2_id, 'Incident Response Procedures', 'DOCUMENT', 'https://example.com/incident-response.pdf', 'Step-by-step guide for reporting security incidents', NULL, 5);

  -- Course 2 Quiz
  INSERT INTO course_materials (course_id, title, material_type, quiz_data, description, order_index) VALUES
  (v_course2_id, 'Cybersecurity Quiz', 'QUIZ', '{
    "questions": [
      {"id": 1, "question": "What is phishing?", "options": ["A type of fishing", "Fraudulent attempt to steal sensitive info", "A software update", "A network protocol"], "correct": 1},
      {"id": 2, "question": "Which is the strongest password?", "options": ["password123", "MyName2024", "K#9xL!mP2$qR", "12345678"], "correct": 2},
      {"id": 3, "question": "What should you do if you receive a suspicious email?", "options": ["Click the links to verify", "Forward to IT/Security team", "Reply asking for details", "Ignore and delete"], "correct": 1},
      {"id": 4, "question": "What is two-factor authentication?", "options": ["Using two passwords", "Login requiring two forms of verification", "Having two accounts", "Logging in twice"], "correct": 1},
      {"id": 5, "question": "What is ransomware?", "options": ["Antivirus software", "Malware that encrypts files for ransom", "A firewall", "A backup tool"], "correct": 1}
    ]
  }'::jsonb, 'Test your cybersecurity knowledge', 6);

  -- Course 3: Fire Safety
  INSERT INTO courses (title, description, topic, trainer_id, status, created_at, updated_at)
  VALUES (
    'Fire Safety & Emergency Response',
    'Essential training on fire prevention, fire extinguisher usage, evacuation procedures, and emergency response protocols. Required annual certification for all employees.',
    'Safety',
    v_trainer_id,
    'PUBLISHED',
    now(),
    now()
  ) RETURNING id INTO v_course3_id;

  -- Course 3 Materials
  INSERT INTO course_materials (course_id, title, material_type, content_url, description, duration_seconds, order_index) VALUES
  (v_course3_id, 'Fire Prevention Basics', 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4', 'Understanding fire hazards and prevention methods', 420, 1),
  (v_course3_id, 'Fire Extinguisher Types & Usage', 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4', 'Learn about different fire extinguisher types and how to use them', 360, 2),
  (v_course3_id, 'Evacuation Procedures', 'PDF', 'https://example.com/evacuation-plan.pdf', 'Building evacuation routes and assembly points', NULL, 3);

  -- Course 3 Quiz
  INSERT INTO course_materials (course_id, title, material_type, quiz_data, description, order_index) VALUES
  (v_course3_id, 'Fire Safety Assessment', 'QUIZ', '{
    "questions": [
      {"id": 1, "question": "What type of fire extinguisher is used for electrical fires?", "options": ["Water", "CO2", "Foam", "Wet Chemical"], "correct": 1},
      {"id": 2, "question": "What is the first thing to do when you discover a fire?", "options": ["Try to extinguish it", "Sound the fire alarm", "Call the fire department", "Evacuate immediately"], "correct": 1},
      {"id": 3, "question": "What does the PASS technique stand for?", "options": ["Push Aim Squeeze Sweep", "Pull Aim Squeeze Sweep", "Point Activate Spray Sweep", "Pull Activate Spray Sweep"], "correct": 1}
    ]
  }'::jsonb, 'Fire safety knowledge check', 4);

  -- Enroll ALL trainees in courses
  SELECT array_agg(id) INTO v_trainee_ids FROM users WHERE role = 'TRAINEE';

  IF v_trainee_ids IS NOT NULL THEN
    FOR i IN 1..array_length(v_trainee_ids, 1) LOOP
      -- Enroll in Course 1
      INSERT INTO course_enrollments (course_id, user_id, progress, status)
      VALUES (v_course1_id, v_trainee_ids[i], CASE WHEN i = 1 THEN 60 ELSE 0 END, CASE WHEN i = 1 THEN 'IN_PROGRESS' ELSE 'ENROLLED' END)
      ON CONFLICT (course_id, user_id) DO NOTHING;

      -- Enroll in Course 2
      INSERT INTO course_enrollments (course_id, user_id, progress, status)
      VALUES (v_course2_id, v_trainee_ids[i], CASE WHEN i = 1 THEN 30 ELSE 0 END, CASE WHEN i = 1 THEN 'IN_PROGRESS' ELSE 'ENROLLED' END)
      ON CONFLICT (course_id, user_id) DO NOTHING;

      -- Enroll in Course 3
      INSERT INTO course_enrollments (course_id, user_id, progress, status)
      VALUES (v_course3_id, v_trainee_ids[i], 0, 'ENROLLED')
      ON CONFLICT (course_id, user_id) DO NOTHING;
    END LOOP;
  END IF;

  RAISE NOTICE 'Courses seeded successfully! Course IDs: %, %, %', v_course1_id, v_course2_id, v_course3_id;
END $$;
