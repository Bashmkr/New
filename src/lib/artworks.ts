import type { CategoryKey } from "./categories";
import { getSupabase, STORAGE_BUCKET, supabaseConfigured } from "./supabase";

/** What public visitors receive. Student name is only present when a teacher approved showing it. */
export type PublicArtwork = {
  id: string;
  title: string;
  student_first_name: string | null;
  category: CategoryKey;
  width: number;
  height: number;
  display_path: string;
  image_path: string;
  displayUrl: string;
  fullUrl: string;
};

/** Full row as seen by staff (subject to row-level security). */
export type StaffArtwork = {
  id: string;
  title: string;
  student_first_name: string | null;
  show_student_name: boolean;
  category: CategoryKey;
  status: "pending" | "published";
  image_path: string;
  display_path: string;
  width: number;
  height: number;
  sort_order: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

const SIGNED_URL_SECONDS = 60 * 60 * 12;

export async function signPaths(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await getSupabase().storage.from(STORAGE_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  }
  return out;
}

/** Fetch published artwork for the public gallery. */
export async function fetchPublishedArtworks(): Promise<PublicArtwork[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await getSupabase().rpc("get_published_artworks");
  if (error) throw error;
  const rows = (data ?? []) as Omit<PublicArtwork, "displayUrl" | "fullUrl">[];
  const urls = await signPaths(rows.flatMap((r) => [r.display_path, r.image_path]));
  return rows
    .filter((r) => urls[r.display_path])
    .map((r) => ({ ...r, displayUrl: urls[r.display_path], fullUrl: urls[r.image_path] ?? urls[r.display_path] }));
}
