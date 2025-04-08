-- Add new columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS minutes_practiced_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS minutes_practiced_yesterday INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS minutes_practiced_2_days_ago INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS minutes_practiced_3_days_ago INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS minutes_practiced_4_days_ago INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS minutes_practiced_5_days_ago INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS minutes_practiced_6_days_ago INTEGER DEFAULT 0;

-- Create function to update daily practice times
CREATE OR REPLACE FUNCTION update_daily_practice_times()
RETURNS void AS $$
BEGIN
    -- Shift all values one day back
    UPDATE users
    SET minutes_practiced_6_days_ago = minutes_practiced_5_days_ago,
        minutes_practiced_5_days_ago = minutes_practiced_4_days_ago,
        minutes_practiced_4_days_ago = minutes_practiced_3_days_ago,
        minutes_practiced_3_days_ago = minutes_practiced_2_days_ago,
        minutes_practiced_2_days_ago = minutes_practiced_yesterday,
        minutes_practiced_yesterday = minutes_practiced_today,
        minutes_practiced_today = 0;
END;
$$ LANGUAGE plpgsql;

-- Create RPC function to add columns
CREATE OR REPLACE FUNCTION add_daily_practice_columns()
RETURNS void AS $$
BEGIN
    -- Columns are added in the ALTER TABLE statement above
    -- This function exists to be called from the client
END;
$$ LANGUAGE plpgsql; 