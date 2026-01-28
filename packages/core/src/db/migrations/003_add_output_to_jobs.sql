-- Add output column to jobs table for storing textual output from preview mode
ALTER TABLE jobs ADD COLUMN output TEXT;
