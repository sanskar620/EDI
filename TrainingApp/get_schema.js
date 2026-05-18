const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qnndqowtocscumrijjts.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFubmRxb3d0b2NzY3VtcmlqanRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NTI0NjcsImV4cCI6MjA5MTAyODQ2N30.GtOtvoaeWU6tv1X8nrxaVjwgf5S1jroOaUGm7oBJ3a4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_schema');
  console.log(data, error);
  // Actually, we can just insert a dummy record to see the error details
  const res = await supabase.from('materials').insert({
    title: 'a', material_type: 'VIDEO', s3_key: 'b', topic: 'c', version: 1, is_active: true
  }).select();
  console.log("Insert result:", res);
}
checkSchema();
