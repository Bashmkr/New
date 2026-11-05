"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Profile } from "./StaffApp";
import { Button, Field, inputClass, Notice } from "./ui";

export function AccountPanel({ profile }: { profile: Profile }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 10) return setMsg({ kind: "error", text: "Use at least 10 characters." });
    if (pw !== pw2) return setMsg({ kind: "error", text: "The two passwords do not match." });
    setBusy(true);
    const { error } = await getSupabase().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg({ kind: "error", text: error.message });
    setPw("");
    setPw2("");
    setMsg({ kind: "success", text: "Your password has been changed." });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-teal/10 sm:p-6">
        <h2 className="text-lg font-bold text-teal">Your account</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-xs font-semibold text-[#5b7a7c]">Name</dt>
            <dd className="text-[#1f4547]">{profile.display_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-[#5b7a7c]">Email</dt>
            <dd className="text-[#1f4547]">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-[#5b7a7c]">Role</dt>
            <dd className="text-[#1f4547]">
              {profile.role === "admin" ? "Administrator: full control of artwork, publishing and staff access" : "Contributor: upload and manage your own artwork"}
            </dd>
          </div>
        </dl>
      </div>
      <form onSubmit={save} className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-teal/10 sm:p-6">
        <h2 className="text-lg font-bold text-teal">Change password</h2>
        <Field label="New password">
          <input type="password" className={inputClass} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required />
        </Field>
        <Field label="Repeat new password">
          <input type="password" className={inputClass} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required />
        </Field>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
