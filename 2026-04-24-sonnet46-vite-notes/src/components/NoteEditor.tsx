import { useState } from "react";
import { supabase } from "../supabase";
import type { Note } from "../supabase";

type Props = {
  note: Note | null;
  userId: string;
  onSaved: (note: Note) => void;
  onCancel: () => void;
};

export default function NoteEditor({ note, userId, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = title !== (note?.title ?? "") || content !== (note?.content ?? "");

  async function handleSave() {
    setSaving(true);
    setError(null);

    const now = new Date().toISOString();

    if (note) {
      const { data, error } = await supabase
        .from("notes")
        .update({ title, content, updated_at: now })
        .eq("id", note.id)
        .select()
        .single();
      if (error) { setError(error.message); setSaving(false); return; }
      onSaved(data as Note);
    } else {
      const { data, error } = await supabase
        .from("notes")
        .insert({ title, content, user_id: userId, updated_at: now })
        .select()
        .single();
      if (error) { setError(error.message); setSaving(false); return; }
      onSaved(data as Note);
    }

    setSaving(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white shrink-0">
        <span className="text-xs text-gray-400">
          {note ? `Last saved ${new Date(note.updated_at).toLocaleString()}` : "New note"}
        </span>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full px-6 pt-6 pb-2 text-2xl font-semibold text-gray-900 bg-transparent border-none outline-none placeholder-gray-300"
      />

      {/* Content */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Start writing..."
        className="flex-1 w-full px-6 py-2 text-base text-gray-700 bg-transparent border-none outline-none resize-none placeholder-gray-300 leading-relaxed"
      />

      {error && (
        <div className="px-6 pb-4 text-sm text-red-600">{error}</div>
      )}
    </div>
  );
}
