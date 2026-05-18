-- =============================================
-- QUIZ ATTEMPTS TABLE
-- Run in Supabase SQL Editor
-- =============================================

DROP TABLE IF EXISTS quiz_attempts CASCADE;

CREATE TABLE quiz_attempts (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES training_sessions(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES course_materials(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_type TEXT NOT NULL DEFAULT 'COURSE' CHECK (quiz_type IN ('COURSE','PRE_TEST','POST_TEST')),
  score REAL NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  answers_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on quiz_attempts" ON quiz_attempts FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_attempts;
