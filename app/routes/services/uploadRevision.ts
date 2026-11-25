import type PocketBase from "pocketbase";
import { ClientResponseError } from "pocketbase";

export async function uploadRevision(
  pb: PocketBase,
  asset: string,
  title: string,
  description: string,
  video: File,
) {
  // Keep the operation ID across a retry or reload in this tab. A confirmed
  // upload clears it, so intentionally uploading the same file again is valid.
  const key = JSON.stringify([
    "avlokan:revision-upload", pb.baseURL, pb.authStore.record?.id, asset,
    title, description, video.name, video.size, video.lastModified,
  ]);
  const revisions = pb.collection("assets_revision");
  let id = sessionStorage.getItem(key);
  if (id) {
    try {
      const existing = await revisions.getOne(id, { fields: "id,asset" });
      if (existing.asset !== asset) throw new Error("Upload belongs to another asset.");
      sessionStorage.removeItem(key);
      return;
    } catch (error) {
      if (!(error instanceof ClientResponseError) || error.status !== 404) throw error;
    }
  } else {
    const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
    id = Array.from(crypto.getRandomValues(new Uint8Array(15)), (byte) => alphabet[byte % 32]).join("");
    sessionStorage.setItem(key, id);
  }

  const form = new FormData();
  form.set("id", id);
  form.set("asset", asset);
  form.set("title", title);
  form.set("description", description);
  form.set("video", video);
  await revisions.create(form);
  sessionStorage.removeItem(key);
}
