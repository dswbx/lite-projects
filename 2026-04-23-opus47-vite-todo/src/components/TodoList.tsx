import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type Todo } from "../supabase";

export function TodoList({ session }: { session: Session | null }) {
   const [todos, setTodos] = useState<Todo[]>([]);
   const [title, setTitle] = useState("");
   const [isPublic, setIsPublic] = useState(false);
   const [err, setErr] = useState<string | null>(null);

   const load = useCallback(async () => {
      const { data, error } = await supabase
         .from("todos")
         .select("*")
         .order("created_at", { ascending: false });
      if (error) setErr(error.message);
      else setTodos(data ?? []);
   }, []);

   useEffect(() => {
      load();
   }, [load, session?.user.id]);

   async function add(e: FormEvent) {
      e.preventDefault();
      if (!session || !title.trim()) return;
      setErr(null);
      const { error } = await supabase.from("todos").insert({
         title: title.trim(),
         is_public: isPublic,
         user_id: session.user.id,
      });
      if (error) setErr(error.message);
      else {
         setTitle("");
         setIsPublic(false);
         load();
      }
   }

   async function toggle(t: Todo) {
      const { error } = await supabase
         .from("todos")
         .update({ completed: !t.completed })
         .eq("id", t.id);
      if (error) setErr(error.message);
      else load();
   }

   async function remove(t: Todo) {
      const { error } = await supabase.from("todos").delete().eq("id", t.id);
      if (error) setErr(error.message);
      else load();
   }

   const ownId = session?.user.id ?? null;

   return (
      <div className="mb-8">
         {session ? (
            <form
               onSubmit={add}
               className="mb-4 flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-4"
            >
               <input
                  placeholder="what needs doing?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
               />
               <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-neutral-600">
                     <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                     />
                     public (visible to guests)
                  </label>
                  <button
                     type="submit"
                     className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800"
                  >
                     Add
                  </button>
               </div>
            </form>
         ) : null}
         {err ? <p className="mb-3 text-sm text-red-600">{err}</p> : null}
         <ul className="flex flex-col gap-2">
            {todos.length === 0 ? (
               <li className="rounded-md border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500">
                  No todos yet.
               </li>
            ) : null}
            {todos.map((t) => {
               const mine = !!(ownId && t.user_id === ownId);
               return (
                  <li
                     key={t.id}
                     className="flex items-center gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2"
                  >
                     <input
                        type="checkbox"
                        checked={t.completed}
                        disabled={!mine}
                        onChange={() => toggle(t)}
                     />
                     <span
                        className={`flex-1 text-sm ${
                           t.completed ? "text-neutral-400 line-through" : ""
                        }`}
                     >
                        {t.title}
                     </span>
                     {t.is_public ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                           public
                        </span>
                     ) : (
                        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                           private
                        </span>
                     )}
                     {mine ? (
                        <button
                           onClick={() => remove(t)}
                           className="text-xs text-neutral-500 hover:text-red-600"
                        >
                           delete
                        </button>
                     ) : null}
                  </li>
               );
            })}
         </ul>
      </div>
   );
}
