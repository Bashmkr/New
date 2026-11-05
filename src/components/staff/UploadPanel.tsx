"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import { ACCEPTED_TYPES, uploadArtwork, validateFile } from "@/lib/imageUpload";
import type { Profile } from "./StaffApp";
import { Button, Field, inputClass, Notice } from "./ui";

type Draft = {
  key: string;
  file: File;
  preview: string;
  title: string;
  firstName: string;
  showName: boolean;
  category: CategoryKey | "";
  state: "ready" | "uploading" | "done" | "error";
  error?: string;
};

function titleFromFile(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function UploadPanel({ profile, onDone, onViewAll }: { profile: Profile; onDone: () => void; onViewAll: () => void }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: number } | null>(null);
  const [publishNow, setPublishNow] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<CategoryKey | "">("");
  const input = useRef<HTMLInputElement>(null);
  const isAdmin = profile.role === "admin";

  useEffect(() => {
    return () => drafts.forEach((d) => URL.revokeObjectURL(d.preview));
    // only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = (files: FileList | File[]) => {
    const bad: string[] = [];
    const next: Draft[] = [];
    for (const file of Array.from(files)) {
      const problem = validateFile(file);
      if (problem) {
        bad.push(`${file.name}: ${problem}`);
        continue;
      }
      next.push({
        key: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        title: titleFromFile(file.name),
        firstName: "",
        showName: false,
        category: bulkCategory,
        state: "ready",
      });
    }
    setRejected(bad);
    setResult(null);
    setDrafts((d) => [...d.filter((x) => x.state !== "done"), ...next]);
  };

  const update = (key: string, patch: Partial<Draft>) => setDrafts((d) => d.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const remove = (key: string) =>
    setDrafts((d) => {
      const item = d.find((x) => x.key === key);
      if (item) URL.revokeObjectURL(item.preview);
      return d.filter((x) => x.key !== key);
    });

  const pending = drafts.filter((d) => d.state === "ready" || d.state === "error");
  const missing = pending.filter((d) => !d.title.trim() || !d.category);

  const saveAll = async () => {
    if (missing.length) return;
    setBusy(true);
    setResult(null);
    let ok = 0;
    let failed = 0;
    for (const d of pending) {
      update(d.key, { state: "uploading", error: undefined });
      try {
        await uploadArtwork(profile.id, {
          file: d.file,
          title: d.title,
          studentFirstName: d.firstName,
          showStudentName: d.showName,
          category: d.category as CategoryKey,
          publishNow: isAdmin && publishNow,
        });
        update(d.key, { state: "done" });
        ok++;
      } catch (e) {
        update(d.key, { state: "error", error: e instanceof Error ? e.message : "Upload failed" });
        failed++;
      }
    }
    setBusy(false);
    setResult({ ok, failed });
    if (ok) onDone();
  };

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragOver ? "border-green bg-green/5" : "border-teal/25 bg-white"
        }`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden>
            <path d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="mt-4 text-base font-semibold text-[#1f4547]">Drag and drop student drawings here</p>
        <p className="mt-1 text-sm text-[#5b7a7c]">PNG, JPG or WEBP · up to 20 MB each · you can select several at once</p>
        <Button className="mt-5 px-6 py-3" onClick={() => input.current?.click()}>
          Upload Photo
        </Button>
        <input
          ref={input}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {rejected.length > 0 && (
        <Notice kind="error" onClose={() => setRejected([])}>
          {rejected.map((r) => (
            <div key={r}>{r}</div>
          ))}
        </Notice>
      )}

      {result && (
        <Notice kind={result.failed ? "error" : "success"} onClose={() => setResult(null)}>
          {result.ok > 0 && (
            <div>
              <strong>
                {result.ok} artwork{result.ok === 1 ? "" : "s"} uploaded successfully.
              </strong>{" "}
              {isAdmin && publishNow ? "They are now live in the gallery." : "They are saved as pending review and will appear in the gallery once published."}{" "}
              <button type="button" onClick={onViewAll} className="font-semibold underline">
                View artwork list
              </button>
            </div>
          )}
          {result.failed > 0 && <div>{result.failed} upload(s) failed. See the messages below and try again.</div>}
        </Notice>
      )}

      {drafts.length > 0 && (
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-teal/10 sm:p-6">
          <div className="flex flex-col gap-3 border-b border-teal/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-teal">Preview and details</h2>
              <p className="text-sm text-[#5b7a7c]">Check each image, add a title and choose its exhibition area.</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Set area for all">
                <select
                  className={inputClass}
                  value={bulkCategory}
                  onChange={(e) => {
                    const v = e.target.value as CategoryKey | "";
                    setBulkCategory(v);
                    if (v) setDrafts((d) => d.map((x) => (x.state === "done" ? x : { ...x, category: v })));
                  }}
                >
                  <option value="">Choose…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <ul className="divide-y divide-teal/10">
            {drafts.map((d) => (
              <li key={d.key} className="grid gap-4 py-5 sm:grid-cols-[180px_1fr]">
                <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-[#f1f5f5] p-2 ring-1 ring-teal/10">
                  <img src={d.preview} alt="" className="h-full w-full object-contain" />
                  {d.state === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/75 text-sm font-semibold text-teal">Uploading…</div>
                  )}
                  {d.state === "done" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-green/80 text-sm font-semibold text-white">✓ Saved</div>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Artwork title *">
                    <input
                      className={inputClass}
                      value={d.title}
                      maxLength={120}
                      disabled={d.state === "done" || busy}
                      onChange={(e) => update(d.key, { title: e.target.value })}
                      placeholder="e.g. Lock Your Passwords"
                    />
                  </Field>
                  <Field label="Exhibition area *">
                    <select
                      className={inputClass}
                      value={d.category}
                      disabled={d.state === "done" || busy}
                      onChange={(e) => update(d.key, { category: e.target.value as CategoryKey })}
                    >
                      <option value="">Choose…</option>
                      {CATEGORIES.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Student first name (optional)" hint="First name only. Never enter a full name.">
                    <input
                      className={inputClass}
                      value={d.firstName}
                      maxLength={40}
                      disabled={d.state === "done" || busy}
                      onChange={(e) => update(d.key, { firstName: e.target.value })}
                      placeholder="e.g. Sara"
                    />
                  </Field>
                  <div className="flex items-end">
                    <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-teal-50/70 px-3 py-2 text-xs text-[#1f4547]">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-teal"
                        checked={d.showName}
                        disabled={!d.firstName.trim() || d.state === "done" || busy}
                        onChange={(e) => update(d.key, { showName: e.target.checked })}
                      />
                      <span>Permission given to show the first name in the public gallery</span>
                    </label>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:col-span-2">
                    <span className="truncate text-[11px] text-[#8aa6a7]">{d.file.name}</span>
                    {d.state !== "done" && (
                      <Button variant="ghost" disabled={busy} onClick={() => remove(d.key)}>
                        Remove
                      </Button>
                    )}
                  </div>
                  {d.error && (
                    <div className="sm:col-span-2">
                      <Notice kind="error">{d.error}</Notice>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 border-t border-teal/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-[#5b7a7c]">
              {missing.length > 0
                ? `Add a title and exhibition area to ${missing.length} image${missing.length === 1 ? "" : "s"} before saving.`
                : pending.length > 0
                  ? `${pending.length} image${pending.length === 1 ? "" : "s"} ready to save.`
                  : "All images saved."}
              {isAdmin && (
                <label className="mt-2 flex items-center gap-2 text-[#1f4547]">
                  <input type="checkbox" className="h-4 w-4 accent-teal" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
                  Publish to the gallery immediately (administrator)
                </label>
              )}
            </div>
            <Button variant="green" className="px-6 py-3" disabled={busy || pending.length === 0 || missing.length > 0} onClick={saveAll}>
              {busy ? "Saving…" : `Save artwork${pending.length > 1 ? ` (${pending.length})` : ""}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
