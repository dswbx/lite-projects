export type Meal = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type MealIngredient = {
  id: string;
  meal_id: string;
  name: string;
  amount: string | null;
};

export type WeeklyPlan = {
  id: string;
  user_id: string;
  day_of_week: string;
  meal_id: string | null;
  meal?: Meal;
};

export const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
