import { NextResponse } from "next/server";
import { getAdminClient, getCaller } from "@/lib/server/supabaseAdmin";

/**
 * Staff management for the administrator.
 * GET    → list staff accounts
 * POST   → create a contributor account { email, displayName, password }
 * DELETE → remove a contributor account { id } (their artwork stays in the exhibition)
 */

function forbidden() {
  return NextResponse.json({ error: "Only the administrator can manage staff accounts." }, { status: 403 });
}

export async function GET(req: Request) {
  const caller = await getCaller(req);
  if (!caller || caller.role !== "admin") return forbidden();
  const { data, error } = await getAdminClient()
    .from("profiles")
    .select("id, email, display_name, role, created_at")
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ staff: data });
}

export async function POST(req: Request) {
  const caller = await getCaller(req);
  if (!caller || caller.role !== "admin") return forbidden();

  let body: { email?: string; displayName?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const displayName = (body.displayName ?? "").trim().slice(0, 60);
  const password = body.password ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (password.length < 10) {
    return NextResponse.json({ error: "The temporary password must be at least 10 characters." }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName || email.split("@")[0] },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // The database trigger creates the profile; make sure it is a contributor.
  await admin.from("profiles").update({ role: "contributor" }).eq("id", data.user.id).neq("role", "admin");
  return NextResponse.json({ ok: true, id: data.user.id });
}

export async function DELETE(req: Request) {
  const caller = await getCaller(req);
  if (!caller || caller.role !== "admin") return forbidden();
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.id || body.id === caller.id) {
    return NextResponse.json({ error: "You cannot remove your own administrator account." }, { status: 400 });
  }
  const admin = getAdminClient();
  const { data: target } = await admin.from("profiles").select("role").eq("id", body.id).maybeSingle();
  if (!target) return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
  if (target.role === "admin") return NextResponse.json({ error: "Administrator accounts cannot be removed here." }, { status: 400 });
  const { error } = await admin.auth.admin.deleteUser(body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
