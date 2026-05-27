import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import type { Meal, WeeklyPlan } from "../types";
import { DAYS_OF_WEEK } from "../types";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";

export function MealPlanner() {
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // New Meal Form State
  const [isCreatingMeal, setIsCreatingMeal] = useState(false);
  const [newMealName, setNewMealName] = useState("");
  const [newIngredients, setNewIngredients] = useState<{ name: string; amount: string }[]>([
    { name: "", amount: "" },
  ]);

  // Shopping List State
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [shoppingList, setShoppingList] = useState<{ name: string; amount: string }[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    
    const [mealsResponse, planResponse] = await Promise.all([
      supabase.from("meals").select("*").order("created_at", { ascending: false }),
      supabase.from("weekly_plan").select("*, meal:meals(*)"),
    ]);

    if (mealsResponse.data) setMeals(mealsResponse.data);
    
    // Initialize weekly plan with empty days if not exists
    const currentPlan = planResponse.data || [];
    const fullPlan = DAYS_OF_WEEK.map((day) => {
      const existing = currentPlan.find((p) => p.day_of_week === day);
      return existing || { id: "", user_id: user!.id, day_of_week: day, meal_id: null };
    });
    
    setWeeklyPlan(fullPlan);
    setLoading(false);
  };

  const handleCreateMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMealName.trim()) return;

    try {
      // 1. Create Meal
      const { data: mealData, error: mealError } = await supabase
        .from("meals")
        .insert([{ user_id: user!.id, name: newMealName }])
        .select()
        .single();

      if (mealError) throw mealError;

      // 2. Create Ingredients
      const validIngredients = newIngredients.filter((i) => i.name.trim());
      if (validIngredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from("meal_ingredients")
          .insert(
            validIngredients.map((i) => ({
              meal_id: mealData.id,
              name: i.name,
              amount: i.amount,
            }))
          );
        if (ingredientsError) throw ingredientsError;
      }

      // Reset form and refresh
      setIsCreatingMeal(false);
      setNewMealName("");
      setNewIngredients([{ name: "", amount: "" }]);
      fetchData();
    } catch (error) {
      console.error("Error creating meal:", error);
      alert("Failed to create meal");
    }
  };

  const handleAssignMeal = async (day: string, mealId: string) => {
    const existingPlan = weeklyPlan.find((p) => p.day_of_week === day);
    
    try {
      if (existingPlan && existingPlan.id) {
        // Update
        await supabase
          .from("weekly_plan")
          .update({ meal_id: mealId || null })
          .eq("id", existingPlan.id);
      } else {
        // Insert
        await supabase
          .from("weekly_plan")
          .insert([{ user_id: user!.id, day_of_week: day, meal_id: mealId }]);
      }
      fetchData();
    } catch (error) {
      console.error("Error assigning meal:", error);
    }
  };

  const generateShoppingList = async () => {
    const plannedMealIds = weeklyPlan
      .filter((p) => p.meal_id)
      .map((p) => p.meal_id);

    if (plannedMealIds.length === 0) {
      setShoppingList([]);
      setShowShoppingList(true);
      return;
    }

    const { data, error } = await supabase
      .from("meal_ingredients")
      .select("*")
      .in("meal_id", plannedMealIds);

    if (error) {
      console.error("Error fetching ingredients:", error);
      return;
    }

    // Combine identical ingredients (simple grouping by name)
    const combined: Record<string, string[]> = {};
    data.forEach((ing) => {
      const name = ing.name.toLowerCase().trim();
      if (!combined[name]) combined[name] = [];
      if (ing.amount) combined[name].push(ing.amount);
    });

    const list = Object.entries(combined).map(([name, amounts]) => ({
      name,
      amount: amounts.join(" + "),
    }));

    setShoppingList(list);
    setShowShoppingList(true);
  };

  if (loading) return <div>Loading planner...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Left Column: Weekly Plan */}
      <div className="md:col-span-2 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">This Week's Plan</h2>
          <button
            onClick={generateShoppingList}
            className="flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <ShoppingCart className="h-4 w-4" />
            Shopping List
          </button>
        </div>

        <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
          {weeklyPlan.map((plan) => (
            <div key={plan.day_of_week} className="p-4 flex items-center justify-between">
              <div className="w-32 font-medium text-gray-700">{plan.day_of_week}</div>
              <div className="flex-1 ml-4">
                <select
                  value={plan.meal_id || ""}
                  onChange={(e) => handleAssignMeal(plan.day_of_week, e.target.value)}
                  className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">-- No meal planned --</option>
                  {meals.map((meal) => (
                    <option key={meal.id} value={meal.id}>
                      {meal.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Meal Library & Shopping List */}
      <div className="space-y-6">
        {showShoppingList ? (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Shopping List</h2>
              <button
                onClick={() => setShowShoppingList(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            {shoppingList.length === 0 ? (
              <p className="text-gray-500 text-sm">No ingredients needed for this week.</p>
            ) : (
              <ul className="space-y-3">
                {shoppingList.map((item, idx) => (
                  <li key={idx} className="flex items-start">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="ml-3 text-sm">
                      <span className="font-medium text-gray-900 capitalize">{item.name}</span>
                      {item.amount && <span className="text-gray-500 ml-2">({item.amount})</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Saved Meals</h2>
              <button
                onClick={() => setIsCreatingMeal(!isCreatingMeal)}
                className="rounded-full bg-indigo-50 p-1 text-indigo-600 hover:bg-indigo-100"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {isCreatingMeal && (
              <form onSubmit={handleCreateMeal} className="mb-6 space-y-4 border-b border-gray-200 pb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Meal Name</label>
                  <input
                    type="text"
                    required
                    value={newMealName}
                    onChange={(e) => setNewMealName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ingredients</label>
                  {newIngredients.map((ing, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Name"
                        value={ing.name}
                        onChange={(e) => {
                          const newIngs = [...newIngredients];
                          newIngs[idx].name = e.target.value;
                          setNewIngredients(newIngs);
                        }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Amount"
                        value={ing.amount}
                        onChange={(e) => {
                          const newIngs = [...newIngredients];
                          newIngs[idx].amount = e.target.value;
                          setNewIngredients(newIngs);
                        }}
                        className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newIngs = newIngredients.filter((_, i) => i !== idx);
                          setNewIngredients(newIngs.length ? newIngs : [{ name: "", amount: "" }]);
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNewIngredients([...newIngredients, { name: "", amount: "" }])}
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    + Add Ingredient
                  </button>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingMeal(false)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
                  >
                    Save Meal
                  </button>
                </div>
              </form>
            )}

            <ul className="space-y-3">
              {meals.map((meal) => (
                <li key={meal.id} className="text-sm font-medium text-gray-700 bg-gray-50 px-3 py-2 rounded-md">
                  {meal.name}
                </li>
              ))}
              {meals.length === 0 && !isCreatingMeal && (
                <p className="text-sm text-gray-500">No meals saved yet.</p>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
