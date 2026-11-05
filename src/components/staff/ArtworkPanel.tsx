"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import { signPaths, type StaffArtwork } from "@/lib/artworks";
import { CATEGORIES, categoryLabel, type CategoryKey } from "@/lib/categories";
import { deleteArtwork } from "@/lib/imageUpload";
import { getSupabase } from "@/lib/supabase";
import { SLOT_CAPACITY } from "@/components/gallery/layout";
import type { Profile } from "./StaffApp";
import { Button, Field, inputClass, Notice, StatusBadge } from "./ui";

type Filter = "all" | "pending" | "published";

export function ArtworkPanel({ profile, refreshKey, onUploadClick }: { profile: Profile; refreshKey: number; onUploadClick: () => void }) {
  const isAdmin = profile.role === "admin";
  const [rows, setRows] = useState<StaffArtwork[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [cat, setCat] = useState<CategoryKey | "all">("all");
  const [editing, setEditing] = useState<StaffArtwork | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("artworks")
      .select("*")
      .order("category")
      .order("sort_order")
      .order("created_at");
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const list = (data ?? []) as StaffArtwork[];
    setRows(list);
    try {
      setThumbs(await signPaths(list.map((r) => r.display_path)));
    } catch {
      setThumbs({});
    }
    // Count everything live in the gallery (all teachers), for the capacity overview
    const { data: live } = await supabase.rpc("get_published_artworks");
    const counts: Record<string, number> = {};
    for (const a of (live ?? []) as { category: string }[]) counts[a.category] = (counts[a.category] ?? 0) + 1;
    setLiveCounts(counts);
    if (isAdmin) {
      const { data: staff } = await supabase.from("profiles").select("id, display_name");
      setNames(Object.fromEntries((staff ?? []).map((s) => [s.id, s.display_name])));
    }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const visible = useMemo(
    () => rows.filter((r) => (filter === "all" || r.status === filter) && (cat === "all" || r.category === cat)),
    [rows, filter, cat],
  );

  const publishedCount = (k: CategoryKey) => liveCounts[k] ?? 0;
  const pendingCount = rows.filter((r) => r.status === "pending").length;

  const setStatus = async (row: StaffArtwork, status: "pending" | "published") => {
    setBusyId(row.id);
    const { error } = await getSupabase().from("artworks").update({ status }).eq("id", row.id);
    setBusyId(null);
    if (error) return setError(error.message);
    setMessage(status === "published" ? `“${row.title}” is now live in the gallery.` : `“${row.title}” was removed from the gallery (kept as pending).`);
    void load();
  };

  const remove = async (row: StaffArtwork) => {
    if (!window.confirm(`Delete “${row.title}” permanently? This removes the image from the gallery and storage.`)) return;
    setBusyId(row.id);
    try {
      await deleteArtwork(row);
      setMessage(`“${row.title}” was deleted.`);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Gallery capacity overview */}
      <div className="grid gap-3 sm:grid-cols-3">
        {CATEGORIES.map((c) => {
          const n = publishedCount(c.key);
          const cap = SLOT_CAPACITY[c.key];
          return (
            <div key={c.key} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-teal/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-green">{c.area}</p>
              <p className="font-semibold text-teal">{c.label}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-teal-50">
                <div className="h-full rounded-full bg-teal" style={{ width: `${Math.min(100, (n / cap) * 100)}%` }} />
              </div>
              <p className="mt-2 text-xs text-[#5b7a7c]">
                {n} of {cap} frames filled
                {n > cap && <span className="font-semibold text-[#a33a16]"> · {n - cap} published but not shown (area full)</span>}
              </p>
            </div>
          );
        })}
      </div>

      {isAdmin && pendingCount > 0 && (
        <Notice kind="info">
          <strong>{pendingCount}</strong> artwork{pendingCount === 1 ? " is" : "s are"} waiting for your review.{" "}
          <button type="button" className="font-semibold underline" onClick={() => setFilter("pending")}>
            Show pending
          </button>
        </Notice>
      )}
      {message && (
        <Notice kind="success" onClose={() => setMessage(null)}>
          {message}
        </Notice>
      )}
      {error && (
        <Notice kind="error" onClose={() => setError(null)}>
          {error}
        </Notice>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "pending", "published"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === f ? "bg-teal text-white" : "bg-white text-teal ring-1 ring-teal/15 hover:bg-teal-50"}`}
          >
            {f === "all" ? "All" : f === "pending" ? "Pending review" : "Published"}
          </button>
        ))}
        <select className={`${inputClass} !w-auto !rounded-full !py-1.5 text-xs`} value={cat} onChange={(e) => setCat(e.target.value as CategoryKey | "all")} aria-label="Filter by area">
          <option value="all">All areas</option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <Button variant="ghost" className="ml-auto" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-[#5b7a7c]">Loading artwork…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-teal/10">
          <p className="font-semibold text-teal">No artwork here yet</p>
          <p className="mt-1 text-sm text-[#5b7a7c]">Uploaded drawings will appear in this list.</p>
          <Button className="mt-5" onClick={onUploadClick}>
            Upload artwork
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((r) => (
            <li key={r.id} className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-teal/10">
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#f1f5f5] p-3">
                {thumbs[r.display_path] ? (
                  <img src={thumbs[r.display_path]} alt={r.title} className="h-full w-full object-contain" loading="lazy" />
                ) : (
                  <span className="text-xs text-[#8aa6a7]">Preview unavailable</span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-snug text-[#1f4547]">{r.title}</h3>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-xs text-[#5b7a7c]">
                  {categoryLabel(r.category)}
                  {r.student_first_name && (
                    <>
                      {" · "}
                      {r.student_first_name}
                      {r.show_student_name ? " (shown)" : " (hidden)"}
                    </>
                  )}
                </p>
                {isAdmin && r.uploaded_by && <p className="text-[11px] text-[#8aa6a7]">Uploaded by {names[r.uploaded_by] ?? "staff"}</p>}
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  {isAdmin &&
                    (r.status === "pending" ? (
                      <Button variant="green" disabled={busyId === r.id} onClick={() => setStatus(r, "published")}>
                        Publish
                      </Button>
                    ) : (
                      <Button variant="secondary" disabled={busyId === r.id} onClick={() => setStatus(r, "pending")}>
                        Unpublish
                      </Button>
                    ))}
                  <Button variant="secondary" disabled={busyId === r.id} onClick={() => setEditing(r)}>
                    Edit
                  </Button>
                  <Button variant="danger" disabled={busyId === r.id} onClick={() => remove(r)}>
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <EditDialog
          row={editing}
          isAdmin={isAdmin}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            setMessage(msg);
            void load();
          }}
        />
      )}
    </div>
  );
}

function EditDialog({ row, isAdmin, onClose, onSaved }: { row: StaffArtwork; isAdmin: boolean; onClose: () => void; onSaved: (msg: string) => void }) {
  const [title, setTitle] = useState(row.title);
  const [firstName, setFirstName] = useState(row.student_first_name ?? "");
  const [showName, setShowName] = useState(row.show_student_name);
  const [category, setCategory] = useState<CategoryKey>(row.category);
  const [order, setOrder] = useState(row.sort_order);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("Please enter a title.");
    setBusy(true);
    const name = firstName.trim().split(/\s+/)[0] ?? "";
    const patch: Record<string, unknown> = {
      title: title.trim(),
      student_first_name: name || null,
      show_student_name: Boolean(name) && showName,
      category,
    };
    if (isAdmin) patch.sort_order = order;
    const { data, error } = await getSupabase().from("artworks").update(patch).eq("id", row.id).select("status").single();
    setBusy(false);
    if (error) return setError(error.message);
    const backToPending = !isAdmin && row.status === "published" && data?.status === "pending";
    onSaved(backToPending ? "Changes saved. The artwork is back in review until the administrator publishes it again." : "Changes saved.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b2a2c]/50 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-title" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
        <h2 id="edit-title" className="text-xl font-bold text-teal">
          Edit artwork details
        </h2>
        <Field label="Artwork title *">
          <input className={inputClass} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <Field label="Exhibition area">
          <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as CategoryKey)}>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Student first name (optional)" hint="First name only.">
          <input className={inputClass} value={firstName} maxLength={40} onChange={(e) => setFirstName(e.target.value)} />
        </Field>
        <label className="flex items-start gap-2 text-sm text-[#1f4547]">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-teal" checked={showName} disabled={!firstName.trim()} onChange={(e) => setShowName(e.target.checked)} />
          Permission given to show the first name in the public gallery
        </label>
        {isAdmin && (
          <Field label="Display order" hint="Lower numbers are hung first within the area. Equal numbers keep upload order.">
            <input type="number" className={inputClass} value={order} onChange={(e) => setOrder(Number(e.target.value) || 0)} />
          </Field>
        )}
        {!isAdmin && row.status === "published" && (
          <Notice kind="info">This artwork is live. Saving changes sends it back to the administrator for review.</Notice>
        )}
        {error && <Notice kind="error">{error}</Notice>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
