import { useEffect, useState } from "react";
import type { Contact, ContactInput } from "../supabase";

const empty: ContactInput = { name: "", email: "", phone: "", company: "", notes: "" };

type Props = {
   contact?: Contact | null;
   onSave: (input: ContactInput) => Promise<void>;
   onCancel: () => void;
};

export function ContactForm({ contact, onSave, onCancel }: Props) {
   const [form, setForm] = useState<ContactInput>(empty);
   const [busy, setBusy] = useState(false);
   const [err, setErr] = useState<string | null>(null);

   useEffect(() => {
      if (contact) {
         setForm({
            name: contact.name,
            email: contact.email ?? "",
            phone: contact.phone ?? "",
            company: contact.company ?? "",
            notes: contact.notes ?? "",
         });
      } else {
         setForm(empty);
      }
   }, [contact]);

   function patch<K extends keyof ContactInput>(key: K, value: ContactInput[K]) {
      setForm((prev) => ({ ...prev, [key]: value }));
   }

   async function submit(e: React.FormEvent) {
      e.preventDefault();
      if (!form.name.trim()) {
         setErr("Name is required.");
         return;
      }
      setErr(null);
      setBusy(true);
      try {
         await onSave({
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            company: form.company.trim(),
            notes: form.notes.trim(),
         });
      } catch (e) {
         setErr(e instanceof Error ? e.message : "Could not save contact.");
      } finally {
         setBusy(false);
      }
   }

   return (
      <form onSubmit={submit} className="flex flex-col gap-4">
         <h2 className="font-display text-xl text-[var(--ink)]">
            {contact ? "Edit contact" : "New contact"}
         </h2>
         <label className="field">
            <span>Name</span>
            <input
               value={form.name}
               onChange={(e) => patch("name", e.target.value)}
               required
               autoFocus
               placeholder="Alex Rivera"
            />
         </label>
         <label className="field">
            <span>Email</span>
            <input
               type="email"
               value={form.email}
               onChange={(e) => patch("email", e.target.value)}
               placeholder="alex@example.com"
            />
         </label>
         <label className="field">
            <span>Phone</span>
            <input
               type="tel"
               value={form.phone}
               onChange={(e) => patch("phone", e.target.value)}
               placeholder="+1 555 0100"
            />
         </label>
         <label className="field">
            <span>Company</span>
            <input
               value={form.company}
               onChange={(e) => patch("company", e.target.value)}
               placeholder="Acme Studio"
            />
         </label>
         <label className="field">
            <span>Notes</span>
            <textarea
               rows={3}
               value={form.notes}
               onChange={(e) => patch("notes", e.target.value)}
               placeholder="Met at conference, prefers morning calls…"
            />
         </label>
         {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}
         <div className="flex gap-3 pt-1">
            <button type="submit" disabled={busy} className="btn-primary flex-1">
               {busy ? "Saving…" : contact ? "Save changes" : "Add contact"}
            </button>
            <button type="button" onClick={onCancel} className="btn-ghost">
               Cancel
            </button>
         </div>
      </form>
   );
}
