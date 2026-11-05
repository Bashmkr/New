"use client";

import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import type { Profile } from "./StaffApp";
import { Button, Field, inputClass, Notice } from "./ui";

type StaffRow = { id: string; email: string; display_name: string; role: "admin" | "contributor"; created_at: string };

export function StaffPanel({ session, profile }: { session: Session; profile: Profile }) {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const call = useCallback(
    async (method: string, body?: unknown) => {
      const res = await fetch("/api/staff", {
        method,
        headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      return json;
    },
    [session.access_token],
  );

  const load = useCallback(async () => {
    try {
      const json = await call("GET");
      setStaff(json.staff);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load staff");
    }
  }, [call]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await call("POST", { email, displayName: name, password });
      setMessage(`Account created for ${email}. Share the email and temporary password with them privately; they can change the password under “My account”.`);
      setName("");
      setEmail("");
      setPassword("");
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: StaffRow) => {
    if (!window.confirm(`Remove access for ${row.display_name} (${row.email})? Their uploaded artwork stays in the exhibition.`)) return;
    try {
      await call("DELETE", { id: row.id });
      setMessage(`${row.display_name} no longer has access.`);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove account");
    }
  };

  const suggest = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const arr = new Uint32Array(14);
    crypto.getRandomValues(arr);
    setPassword(Array.from(arr, (n) => chars[n % chars.length]).join(""));
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-teal/10 sm:p-6">
        <h2 className="text-lg font-bold text-teal">Staff with access</h2>
        <p className="text-sm text-[#5b7a7c]">Contributors can upload artwork and edit or delete their own uploads. Only you can publish.</p>
        <ul className="mt-4 divide-y divide-teal/10">
          {staff.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#1f4547]">{s.display_name}</p>
                <p className="truncate text-xs text-[#5b7a7c]">{s.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.role === "admin" ? "bg-teal text-white" : "bg-teal-50 text-teal"}`}>
                  {s.role === "admin" ? "Administrator" : "Contributor"}
                </span>
                {s.role !== "admin" && s.id !== profile.id && (
                  <Button variant="danger" className="!px-3 !py-1 text-xs" onClick={() => remove(s)}>
                    Remove
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={add} className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-teal/10 sm:p-6">
        <h2 className="text-lg font-bold text-teal">Add a teacher</h2>
        <Field label="Name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ms. Noura" required maxLength={60} />
        </Field>
        <Field label="School email">
          <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Temporary password" hint="At least 10 characters. Share it privately; they can change it after signing in.">
          <div className="flex gap-2">
            <input className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} autoComplete="new-password" />
            <Button type="button" variant="secondary" onClick={suggest} className="shrink-0">
              Generate
            </Button>
          </div>
        </Field>
        {error && (
          <Notice kind="error" onClose={() => setError(null)}>
            {error}
          </Notice>
        )}
        {message && (
          <Notice kind="success" onClose={() => setMessage(null)}>
            {message}
          </Notice>
        )}
        <Button type="submit" disabled={busy} className="w-full py-3">
          {busy ? "Creating…" : "Create contributor account"}
        </Button>
      </form>
    </div>
  );
}
