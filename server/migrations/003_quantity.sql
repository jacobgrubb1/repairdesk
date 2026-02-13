-- Add quantity column to ticket_costs for tracking how many parts used
ALTER TABLE ticket_costs ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
