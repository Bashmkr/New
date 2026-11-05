import type { CategoryKey } from "./categories";
import { getSupabase, STORAGE_BUCKET } from "./supabase";

export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
const DISPLAY_MAX_EDGE = 2048;

export type PreparedImage = {
  width: number;
  height: number;
  display: Blob;
};

export function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Please choose a PNG, JPG or WEBP image.";
  if (file.size > MAX_FILE_BYTES) return "This image is larger than 20 MB. Please use a smaller photo.";
  return null;
}

/**
 * Reads the original image (respecting phone-camera orientation) and makes a
 * gallery-sized copy (max 2048 px on the long edge) so the 3D room loads fast.
 * The original file is uploaded untouched and is what visitors see up close.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const width = bitmap.width;
  const height = bitmap.height;
  const scale = Math.min(1, DISPLAY_MAX_EDGE / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; // transparent PNGs sit on white paper
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const display = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process image"))), "image/jpeg", 0.9),
  );
  return { width, height, display };
}

function extFor(type: string) {
  return type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
}

export type NewArtworkInput = {
  file: File;
  title: string;
  studentFirstName: string;
  showStudentName: boolean;
  category: CategoryKey;
  publishNow?: boolean;
};

/** Uploads both files to private storage, then creates the database row. Cleans up on failure. */
export async function uploadArtwork(userId: string, input: NewArtworkInput) {
  const supabase = getSupabase();
  const prepared = await prepareImage(input.file);
  const id = crypto.randomUUID();
  const base = `${userId}/${id}`;
  const imagePath = `${base}/original.${extFor(input.file.type)}`;
  const displayPath = `${base}/display.jpg`;
  const bucket = supabase.storage.from(STORAGE_BUCKET);

  const up1 = await bucket.upload(imagePath, input.file, { contentType: input.file.type, upsert: false });
  if (up1.error) throw new Error(`Upload failed: ${up1.error.message}`);
  const up2 = await bucket.upload(displayPath, prepared.display, { contentType: "image/jpeg", upsert: false });
  if (up2.error) {
    await bucket.remove([imagePath]);
    throw new Error(`Upload failed: ${up2.error.message}`);
  }

  const firstName = input.studentFirstName.trim().split(/\s+/)[0] ?? "";
  const { data, error } = await supabase
    .from("artworks")
    .insert({
      id,
      title: input.title.trim(),
      student_first_name: firstName || null,
      show_student_name: Boolean(firstName) && input.showStudentName,
      category: input.category,
      status: input.publishNow ? "published" : "pending",
      image_path: imagePath,
      display_path: displayPath,
      width: prepared.width,
      height: prepared.height,
    })
    .select()
    .single();
  if (error) {
    await bucket.remove([imagePath, displayPath]);
    throw new Error(`Could not save artwork details: ${error.message}`);
  }
  return data;
}

export async function deleteArtwork(row: { id: string; image_path: string; display_path: string }) {
  const supabase = getSupabase();
  const { error } = await supabase.from("artworks").delete().eq("id", row.id);
  if (error) throw new Error(error.message);
  await supabase.storage.from(STORAGE_BUCKET).remove([row.image_path, row.display_path]);
}
