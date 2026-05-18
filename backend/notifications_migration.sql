-- Create notifications table
CREATE TABLE public.notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    target_role VARCHAR(50) NOT NULL DEFAULT 'ALL', -- 'TRAINEE', 'TRAINER', 'ALL'
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read notifications
CREATE POLICY "Allow read access to notifications" ON public.notifications
    FOR SELECT USING (true);

-- Allow authenticated users to create notifications
CREATE POLICY "Allow insert access to notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Add to publication for realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
