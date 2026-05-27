-- Workout log schema with per-user isolation via RLS
-- user_id is duplicated on child tables so INSERT policies avoid subquery WITH CHECK (SQLite limitation)

CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts (id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE exercise_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES workout_exercises (id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL CHECK (reps > 0),
  weight_lbs NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (weight_lbs >= 0)
);

CREATE INDEX workouts_user_id_idx ON workouts (user_id);
CREATE INDEX workouts_workout_date_idx ON workouts (workout_date DESC);
CREATE INDEX workout_exercises_workout_id_idx ON workout_exercises (workout_id);
CREATE INDEX workout_exercises_user_id_idx ON workout_exercises (user_id);
CREATE INDEX exercise_sets_exercise_id_idx ON exercise_sets (exercise_id);
CREATE INDEX exercise_sets_user_id_idx ON exercise_sets (user_id);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY workouts_all ON workouts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY exercises_all ON workout_exercises
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY sets_all ON exercise_sets
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
