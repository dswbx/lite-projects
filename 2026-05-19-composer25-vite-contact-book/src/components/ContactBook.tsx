import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type Contact, type ContactInput } from "../supabase";
import { ContactForm } from "./ContactForm";

type Props = {
   session: Session;
};

export function ContactBook({ session }: Props) {
   const [contacts, setContacts] = useState<Contact[]>([]);
   const [search, setSearch] = useState("");
   const [err, setErr] = useState<string | null>(null);
   const [loading, setLoading] = useState(true);
   const [panel, setPanel] = useState<"list" | "add" | "edit">("list");
   const [editing, setEditing] = useState<Contact | null>(null);

   const load = useCallback(async () => {
      setLoading(true);
      setErr(null);
      let query = supabase
         .from("contacts")
         .select("*")
         .order("name", { ascending: true });

      const term = search.trim();
      if (term) {
         query = query.ilike("name", `%${term}%`);
      }

      const { data, error } = await query;
      setLoading(false);
      if (error) setErr(error.message);
      else setContacts(data ?? []);
   }, [search]);

   useEffect(() => {
      const t = setTimeout(load, search.trim() ? 200 : 0);
      return () => clearTimeout(t);
   }, [load, search]);

   async function save(input: ContactInput) {
      setErr(null);
      const payload = {
         name: input.name,
         email: input.email || null,
         phone: input.phone || null,
         company: input.company || null,
         notes: input.notes || null,
         updated_at: new Date().toISOString(),
      };

      if (editing) {
         const { error } = await supabase.from("contacts").update(payload).eq("id", editing.id);
         if (error) throw new Error(error.message);
      } else {
         const { error } = await supabase.from("contacts").insert({
            ...payload,
            user_id: session.user.id,
         });
         if (error) throw new Error(error.message);
      }

      setPanel("list");
      setEditing(null);
      await load();
   }

   async function remove(contact: Contact) {
      if (!confirm(`Delete ${contact.name}? This cannot be undone.`)) return;
      setErr(null);
      const { error } = await supabase.from("contacts").delete().eq("id", contact.id);
      if (error) setErr(error.message);
      else await load();
   }

   function openAdd() {
      setEditing(null);
      setPanel("add");
   }

   function openEdit(contact: Contact) {
      setEditing(contact);
      setPanel("edit");
   }

   function closePanel() {
      setPanel("list");
      setEditing(null);
   }

   return (
      <div className="flex flex-col gap-6">
         <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
               <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                  Your rolodex
               </p>
               <h1 className="font-display text-4xl text-[var(--ink)]">Contacts</h1>
            </div>
            {panel === "list" ? (
               <button type="button" onClick={openAdd} className="btn-primary">
                  + Add contact
               </button>
            ) : null}
         </header>

         {panel === "list" ? (
            <>
               <label className="search-field">
                  <span className="sr-only">Search by name</span>
                  <svg
                     aria-hidden
                     className="h-5 w-5 text-[var(--muted)]"
                     fill="none"
                     viewBox="0 0 24 24"
                     stroke="currentColor"
                     strokeWidth={1.5}
                  >
                     <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m21 21-5.2-5.2M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"
                     />
                  </svg>
                  <input
                     type="search"
                     placeholder="Search by name…"
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                  />
               </label>

               {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}

               <ul className="contact-grid">
                  {loading ? (
                     <li className="empty-state">Loading your contacts…</li>
                  ) : contacts.length === 0 ? (
                     <li className="empty-state">
                        {search.trim()
                           ? "No contacts match that name."
                           : "No contacts yet. Add someone you care about."}
                     </li>
                  ) : (
                     contacts.map((c) => (
                        <li key={c.id} className="contact-card">
                           <div className="flex items-start justify-between gap-3">
                              <div>
                                 <p className="font-display text-xl text-[var(--ink)]">{c.name}</p>
                                 {c.email ? (
                                    <a className="contact-link" href={`mailto:${c.email}`}>
                                       {c.email}
                                    </a>
                                 ) : null}
                                 {c.phone ? (
                                    <a className="contact-link" href={`tel:${c.phone}`}>
                                       {c.phone}
                                    </a>
                                 ) : null}
                                 {c.company ? (
                                    <p className="mt-1 text-sm text-[var(--muted)]">{c.company}</p>
                                 ) : null}
                              </div>
                              <div className="flex shrink-0 gap-2">
                                 <button
                                    type="button"
                                    onClick={() => openEdit(c)}
                                    className="btn-ghost text-xs"
                                 >
                                    Edit
                                 </button>
                                 <button
                                    type="button"
                                    onClick={() => remove(c)}
                                    className="btn-ghost text-xs text-[var(--danger)]"
                                 >
                                    Delete
                                 </button>
                              </div>
                           </div>
                           {c.notes ? (
                              <p className="mt-3 border-t border-[var(--line)] pt-3 text-sm leading-relaxed text-[var(--muted)]">
                                 {c.notes}
                              </p>
                           ) : null}
                        </li>
                     ))
                  )}
               </ul>
            </>
         ) : (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-6 shadow-[var(--shadow)]">
               <ContactForm
                  contact={panel === "edit" ? editing : null}
                  onSave={save}
                  onCancel={closePanel}
               />
            </div>
         )}
      </div>
   );
}
