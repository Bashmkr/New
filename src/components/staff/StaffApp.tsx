"use client";

/* eslint-disable @next/next/no-img-element */

import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import { AccountPanel } from "./AccountPanel";
import { ArtworkPanel } from "./ArtworkPanel";
import { StaffPanel } from "./StaffPanel";
import { UploadPanel } from "./UploadPanel";
import { Button, Field, inputClass, Notice } from "./ui";

export type Profile = { id: string; email: string; display_name: string; role: "admin" | "contributor" };

export function StaffApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setChecking(false);
      return;
    }
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    getSupabase()
      .from("profiles")
      .select("id, email, display_name, role")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setProfileError("This account is not registered as gallery staff. Please contact the administrator.");
          setProfile(null);
        } else {
          setProfileError(null);
          setProfile(data as Profile);
        }
      });
  }, [session]);

  if (!supabaseConfigured) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg py-16">
          <Notice kind="info">
            The artwork database is not connected yet. Add the Supabase settings to the website&apos;s environment variables to enable staff login.
          </Notice>
        </div>
      </Shell>
    );
  }

  if (checking) {
    return (
      <Shell>
        <p className="py-24 text-center text-sm text-[#5b7a7c]">Loading…</p>
      </Shell>
    );
  }

  if (!session) return <LoginScreen />;

  if (profileError) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg space-y-4 py-16">
          <Notice kind="error">{profileError}</Notice>
          <Button variant="secondary" onClick={() => getSupabase().auth.signOut()}>
            Sign out
          </Button>
        </div>
      </Shell>
    );
  }

  if (!profile) {
    return (
      <Shell>
        <p className="py-24 text-center text-sm text-[#5b7a7c]">Loading your account…</p>
      </Shell>
    );
  }

  return <Dashboard profile={profile} session={session} />;
}

function Shell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#f6f9f9]">
      <header className="sticky top-0 z-30 border-b border-teal/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <img src="/brand/logo.png" alt="The Riyadh Schools – Al Malqa" className="h-9 w-auto shrink-0 sm:h-10" />
            <span className="hidden border-l border-teal/15 pl-3 sm:block">
              <span className="block text-sm font-bold tracking-[0.08em] text-teal">CYBER SAFETY GALLERY</span>
              <span className="block text-[11px] text-[#5b7a7c]">Staff artwork management</span>
            </span>
          </Link>
          {right}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message === "Invalid login credentials" ? "Email or password is incorrect." : error.message);
  };

  return (
    <Shell>
      <div className="mx-auto max-w-md py-10 sm:py-16">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-teal/10 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-green">Staff only</p>
          <h1 className="mt-1 text-2xl font-bold text-teal">Sign in</h1>
          <p className="mt-2 text-sm text-[#4a6b6d]">For teachers managing the exhibition artwork. Visitors do not need an account.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="School email">
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Password">
              <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            </Field>
            {error && <Notice kind="error">{error}</Notice>}
            <Button type="submit" disabled={busy} className="w-full py-3">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-[#5b7a7c]">
          <Link href="/" className="font-semibold text-teal hover:underline">
            ← Back to the gallery
          </Link>
        </p>
      </div>
    </Shell>
  );
}

type Tab = "artwork" | "upload" | "staff" | "account";

function Dashboard({ profile, session }: { profile: Profile; session: Session }) {
  const [tab, setTab] = useState<Tab>("artwork");
  const [refreshKey, setRefreshKey] = useState(0);
  const isAdmin = profile.role === "admin";
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const tabs: { id: Tab; label: string }[] = [
    { id: "artwork", label: isAdmin ? "All artwork" : "My artwork" },
    { id: "upload", label: "Upload artwork" },
    ...(isAdmin ? [{ id: "staff" as Tab, label: "Staff access" }] : []),
    { id: "account", label: "My account" },
  ];

  return (
    <Shell
      right={
        <div className="flex items-center gap-2">
          <span className="hidden text-right text-xs sm:block">
            <span className="block font-semibold text-[#1f4547]">{profile.display_name}</span>
            <span className="block text-[#5b7a7c]">{isAdmin ? "Administrator" : "Contributor"}</span>
          </span>
          <Link href="/" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-teal hover:bg-teal-50 md:block">
            View gallery
          </Link>
          <Button variant="secondary" onClick={() => getSupabase().auth.signOut()}>
            Sign out
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-teal sm:text-3xl">Artwork management</h1>
          <p className="mt-1 text-sm text-[#4a6b6d]">
            {isAdmin
              ? "Review uploads, publish them to the 3D gallery and manage staff access."
              : "Upload your students' artwork. The administrator reviews and publishes it to the gallery."}
          </p>
        </div>
      </div>

      <nav className="mt-6 flex gap-1 overflow-x-auto rounded-full bg-white p-1 shadow-sm ring-1 ring-teal/10 sm:inline-flex" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t.id ? "bg-teal text-white" : "text-teal hover:bg-teal-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <section className="mt-6">
        {tab === "artwork" && <ArtworkPanel profile={profile} refreshKey={refreshKey} onUploadClick={() => setTab("upload")} />}
        {tab === "upload" && (
          <UploadPanel
            profile={profile}
            onDone={() => {
              refresh();
            }}
            onViewAll={() => setTab("artwork")}
          />
        )}
        {tab === "staff" && isAdmin && <StaffPanel session={session} profile={profile} />}
        {tab === "account" && <AccountPanel profile={profile} />}
      </section>
    </Shell>
  );
}
