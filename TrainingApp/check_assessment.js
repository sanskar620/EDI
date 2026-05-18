const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qnndqowtocscumrijjts.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFubmRxb3d0b2NzY3VtcmlqanRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NTI0NjcsImV4cCI6MjA5MTAyODQ2N30.GtOtvoaeWU6tv1X8nrxaVjwgf5S1jroOaUGm7oBJ3a4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('assessment_sessions')
    .insert({
      session_id: 1, // dummy
      user_id: 1, // dummy
      assessment_type: 'PRE_TEST',
      question_ids: [],
      total_questions: 0,
      time_limit_seconds: 1800,
      started_at: new Date().toISOString(),
      is_submitted: false,
      is_auto_submitted: false,
      integrity_flags: 0,
      app_switch_count: 0,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  console.log("Insert result:", { data, error });
}

check();
