const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qnndqowtocscumrijjts.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFubmRxb3d0b2NzY3VtcmlqanRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NTI0NjcsImV4cCI6MjA5MTAyODQ2N30.GtOtvoaeWU6tv1X8nrxaVjwgf5S1jroOaUGm7oBJ3a4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createBucketAndTest() {
  // 1. Create storage bucket
  console.log("Creating 'materials' storage bucket...");
  const { data: bucket, error: bucketError } = await supabase.storage.createBucket('materials', {
    public: true,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: ['application/pdf', 'video/*', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/octet-stream'],
  });
  if (bucketError) console.error("Bucket creation error:", bucketError);
  else console.log("Bucket created:", bucket);

  // 2. List buckets to confirm
  const { data: buckets } = await supabase.storage.listBuckets();
  console.log("Buckets now:", buckets?.map(b => ({ name: b.name, public: b.public })));

  // 3. Test material insert with updated_at
  console.log("\n=== MATERIALS TEST INSERT (with updated_at) ===");
  const now = new Date().toISOString();
  const { data: mData, error: mError } = await supabase.from('materials').insert({
    title: 'Test Material',
    material_type: 'PDF',
    s3_key: 'test/file.pdf',
    topic: 'Test',
    version: 1,
    is_active: true,
    created_at: now,
    updated_at: now,
  }).select();
  if (mError) console.error("Material insert error:", mError);
  else {
    console.log("Material insert SUCCESS:", mData);
    if (mData?.[0]?.id) {
      await supabase.from('materials').delete().eq('id', mData[0].id);
      console.log("Test material cleaned up");
    }
  }
}

createBucketAndTest();
