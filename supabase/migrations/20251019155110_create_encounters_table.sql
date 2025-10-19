/*
  # Create Encounters Table

  1. New Tables
    - `encounters`
      - `id` (uuid, primary key) - Unique identifier for the encounter
      - `timestamp` (bigint) - Unix timestamp when the encounter started
      - `date` (timestamptz) - Human-readable date for the encounter
      - `duration_ms` (bigint) - Duration of the encounter in milliseconds
      - `total_damage` (bigint) - Total damage dealt in the encounter
      - `player_count` (int) - Number of players in the encounter
      - `data` (jsonb) - Complete encounter data including all players
      - `created_at` (timestamptz) - When the record was created
  
  2. Security
    - Enable RLS on `encounters` table
    - Add policy for anyone to read all encounters (no auth in this app)
    - Add policy for anyone to insert encounters
*/

CREATE TABLE IF NOT EXISTS encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp bigint NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  duration_ms bigint,
  total_damage bigint,
  player_count int,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read encounters"
  ON encounters
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert encounters"
  ON encounters
  FOR INSERT
  WITH CHECK (true);