const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qnndqowtocscumrijjts.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFubmRxb3d0b2NzY3VtcmlqanRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NTI0NjcsImV4cCI6MjA5MTAyODQ2N30.GtOtvoaeWU6tv1X8nrxaVjwgf5S1jroOaUGm7oBJ3a4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkStorage() {
  const { data, error } = await supabase.storage.from('materials').list('session-materials', {
    limit: 10,
    offset: 0,
    sortBy: { column: 'created_at', order: 'desc' },
  });
  console.log("Recent files in storage:", data);
}
checkStorage();
