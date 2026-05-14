import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type Bookmark, type Folder } from "./supabase";

type FolderFilter = "all" | "unfiled" | string;

export function Dashboard({ session }: { session: Session }) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [activeFolder, setActiveFolder] = useState<FolderFilter>("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = session.user.id;

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [{ data: f, error: fe }, { data: b, error: be }] = await Promise.all([
      supabase.from("folders").select("*").order("created_at"),
      supabase.from("bookmarks").select("*").order("created_at", { ascending: false }),
    ]);
    if (fe || be) setError((fe ?? be)?.message ?? "Failed to load");
    setFolders((f ?? []) as Folder[]);
    setBookmarks((b ?? []) as Bookmark[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filteredBookmarks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookmarks
      .filter((b) => {
        if (activeFolder === "all") return true;
        if (activeFolder === "unfiled") return b.folder_id === null;
        return b.folder_id === activeFolder;
      })
      .filter((b) => {
        if (!q) return true;
        return (
          b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q)
        );
      });
  }, [bookmarks, activeFolder, search]);

  const addFolder = async () => {
    const name = window.prompt("Folder name?");
    if (!name?.trim()) return;
    const { data, error } = await supabase
      .from("folders")
      .insert({ name: name.trim(), user_id: userId })
      .select()
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setFolders((cur) => [...cur, data as Folder]);
    setActiveFolder((data as Folder).id);
  };

  const renameFolder = async (folder: Folder) => {
    const name = window.prompt("New folder name", folder.name);
    if (!name?.trim() || name.trim() === folder.name) return;
    const { error } = await supabase
      .from("folders")
      .update({ name: name.trim() })
      .eq("id", folder.id);
    if (error) {
      setError(error.message);
      return;
    }
    setFolders((cur) =>
      cur.map((f) => (f.id === folder.id ? { ...f, name: name.trim() } : f))
    );
  };

  const deleteFolder = async (folder: Folder) => {
    if (
      !window.confirm(
        `Delete folder "${folder.name}"? Bookmarks inside will move to Unfiled.`
      )
    )
      return;
    const { error } = await supabase.from("folders").delete().eq("id", folder.id);
    if (error) {
      setError(error.message);
      return;
    }
    setFolders((cur) => cur.filter((f) => f.id !== folder.id));
    setBookmarks((cur) =>
      cur.map((b) => (b.folder_id === folder.id ? { ...b, folder_id: null } : b))
    );
    if (activeFolder === folder.id) setActiveFolder("all");
  };

  const deleteBookmark = async (b: Bookmark) => {
    if (!window.confirm(`Delete "${b.title}"?`)) return;
    const { error } = await supabase.from("bookmarks").delete().eq("id", b.id);
    if (error) {
      setError(error.message);
      return;
    }
    setBookmarks((cur) => cur.filter((x) => x.id !== b.id));
  };

  const moveBookmark = async (b: Bookmark, folder_id: string | null) => {
    const { error } = await supabase
      .from("bookmarks")
      .update({ folder_id })
      .eq("id", b.id);
    if (error) {
      setError(error.message);
      return;
    }
    setBookmarks((cur) =>
      cur.map((x) => (x.id === b.id ? { ...x, folder_id } : x))
    );
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-full flex">
      <aside className="w-64 border-r border-slate-200 bg-white p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Folders</h2>
          <button
            onClick={addFolder}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            title="New folder"
          >
            + New
          </button>
        </div>
        <nav className="space-y-1 text-sm flex-1 overflow-y-auto">
          <FolderItem
            label="All bookmarks"
            count={bookmarks.length}
            active={activeFolder === "all"}
            onClick={() => setActiveFolder("all")}
          />
          <FolderItem
            label="Unfiled"
            count={bookmarks.filter((b) => b.folder_id === null).length}
            active={activeFolder === "unfiled"}
            onClick={() => setActiveFolder("unfiled")}
          />
          <div className="pt-2 mt-2 border-t border-slate-100" />
          {folders.map((f) => (
            <FolderItem
              key={f.id}
              label={f.name}
              count={bookmarks.filter((b) => b.folder_id === f.id).length}
              active={activeFolder === f.id}
              onClick={() => setActiveFolder(f.id)}
              onRename={() => renameFolder(f)}
              onDelete={() => deleteFolder(f)}
            />
          ))}
        </nav>
        <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
          <div className="truncate mb-2" title={session.user.email ?? ""}>
            {session.user.email}
          </div>
          <button
            onClick={signOut}
            className="text-slate-600 hover:text-slate-900 underline"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <header className="flex items-center justify-between gap-4 mb-6">
            <h1 className="text-2xl font-semibold">
              {activeFolder === "all"
                ? "All bookmarks"
                : activeFolder === "unfiled"
                  ? "Unfiled"
                  : folders.find((f) => f.id === activeFolder)?.name ??
                    "Bookmarks"}
            </h1>
            <button
              onClick={() => setShowAdd(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md px-4 py-2"
            >
              + Add bookmark
            </button>
          </header>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or URL"
            className="w-full mb-6 rounded-md border border-slate-300 bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {error && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded p-3">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-slate-400">Loading...</div>
          ) : filteredBookmarks.length === 0 ? (
            <div className="text-center text-slate-500 py-12 border-2 border-dashed border-slate-200 rounded-lg">
              {search
                ? "No bookmarks match your search."
                : "No bookmarks yet. Click \"Add bookmark\" to create one."}
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredBookmarks.map((b) => (
                <BookmarkCard
                  key={b.id}
                  bookmark={b}
                  folders={folders}
                  onDelete={() => deleteBookmark(b)}
                  onMove={(fid) => moveBookmark(b, fid)}
                />
              ))}
            </ul>
          )}
        </div>
      </main>

      {showAdd && (
        <AddBookmarkModal
          folders={folders}
          defaultFolderId={
            typeof activeFolder === "string" &&
            activeFolder !== "all" &&
            activeFolder !== "unfiled"
              ? activeFolder
              : null
          }
          onClose={() => setShowAdd(false)}
          onAdded={(b) => {
            setBookmarks((cur) => [b, ...cur]);
            setShowAdd(false);
          }}
          userId={userId}
          onError={setError}
        />
      )}
    </div>
  );
}

function FolderItem({
  label,
  count,
  active,
  onClick,
  onRename,
  onDelete,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={`group flex items-center justify-between rounded-md px-2 py-1.5 cursor-pointer ${
        active ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-100"
      }`}
      onClick={onClick}
    >
      <span className="truncate">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">{count}</span>
        {onRename && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRename();
            }}
            className="opacity-0 group-hover:opacity-100 text-xs text-slate-500 hover:text-slate-800"
            title="Rename"
          >
            ✎
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 text-xs text-slate-500 hover:text-red-600"
            title="Delete"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function BookmarkCard({
  bookmark,
  folders,
  onDelete,
  onMove,
}: {
  bookmark: Bookmark;
  folders: Folder[];
  onDelete: () => void;
  onMove: (folderId: string | null) => void;
}) {
  let host = "";
  try {
    host = new URL(bookmark.url).host;
  } catch {
    host = bookmark.url;
  }
  return (
    <li className="bg-white border border-slate-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-medium text-slate-900 hover:text-indigo-700 truncate"
          >
            {bookmark.title}
          </a>
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:underline truncate block"
          >
            {host}
          </a>
          {bookmark.description && (
            <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">
              {bookmark.description}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1 items-end shrink-0">
          <select
            value={bookmark.folder_id ?? ""}
            onChange={(e) => onMove(e.target.value || null)}
            className="text-xs border border-slate-200 rounded px-1.5 py-1 bg-white"
            title="Move to folder"
          >
            <option value="">Unfiled</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <button
            onClick={onDelete}
            className="text-xs text-slate-500 hover:text-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}

function AddBookmarkModal({
  folders,
  defaultFolderId,
  onClose,
  onAdded,
  userId,
  onError,
}: {
  folders: Folder[];
  defaultFolderId: string | null;
  onClose: () => void;
  onAdded: (b: Bookmark) => void;
  userId: string;
  onError: (msg: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [folderId, setFolderId] = useState<string | "">(defaultFolderId ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = "https://" + normalizedUrl;
    }
    const { data, error } = await supabase
      .from("bookmarks")
      .insert({
        title: title.trim(),
        url: normalizedUrl,
        description: description.trim() || null,
        folder_id: folderId || null,
        user_id: userId,
      })
      .select()
      .single();
    setBusy(false);
    if (error) {
      onError(error.message);
      return;
    }
    onAdded(data as Bookmark);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-10"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md space-y-4"
      >
        <h2 className="text-lg font-semibold">Add bookmark</h2>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Title</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">URL</span>
          <input
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Description (optional)
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Folder</span>
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 bg-white"
          >
            <option value="">Unfiled</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md px-4 py-2 disabled:opacity-60"
          >
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
