import { error } from "@sveltejs/kit";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { getFile, getDriveContext, isFileInSharedFolder, isImage, isVideo } from "$lib/server/db";
import { generateDocumentPreview, isDocumentType } from "$lib/server/preview";
import { generateVideoThumbnail } from "$lib/server/transcode";
import type { RequestHandler } from "./$types";

const UPLOAD_DIR = join(process.cwd(), "uploads");

function previewFilename(storedName: string, size?: string | null) {
  if (size === "sm") return `${storedName}@sm.webp`;
  return `${storedName}.webp`;
}

export const GET: RequestHandler = async ({ params, locals, url }) => {
  const ctx = await getDriveContext(params.driveId, locals);
  if (!ctx) error(404, "Drive not found");

  const file = await getFile(params.fileId);
  if (!file) error(404, "Not found");

  if (ctx.type === "share") {
    if (ctx.share?.fileId) {
      if (params.fileId !== ctx.share.fileId) error(403, "File is not in the shared drive");
    } else if (ctx.share?.folderId) {
      const allowed = await isFileInSharedFolder(params.fileId, ctx.share.folderId);
      if (!allowed) error(403, "File is not in the shared drive");
    }
  } else if (file.userId !== ctx.userId) {
    error(404, "Not found");
  }

  const size = url.searchParams.get("size");
  const previewName = previewFilename(file.storedName, size);
  const previewPath = join(UPLOAD_DIR, "previews", previewName);
  const fullPreviewPath = join(UPLOAD_DIR, "previews", `${file.storedName}.webp`);

  if (!existsSync(previewPath)) {
    // Ensure full-size preview exists first
    if (!existsSync(fullPreviewPath)) {
      let generated = false;
      try {
        if (isImage(file.type)) {
          const sharp = (await import("sharp")).default;
          await sharp(join(UPLOAD_DIR, file.storedName))
            .resize(800, 800, { fit: "inside", withoutEnlargement: true })
            .webp({ quality: 60 })
            .toFile(fullPreviewPath);
          generated = true;
        } else if (isVideo(file.type, file.originalName)) {
          generated = await generateVideoThumbnail(file.storedName);
        } else if (isDocumentType(file.type, file.originalName)) {
          generated = await generateDocumentPreview(file.storedName, file.originalName, file.type);
        }
      } catch {}
      if (generated) {
        try {
          const { updateFilePreview } = await import("$lib/server/db");
          await updateFilePreview(file.id, true);
        } catch {}
      }
      if (!existsSync(fullPreviewPath)) error(404, "Preview not found");
    }

    // Generate size variant from full-size preview
    if (size === "sm" && existsSync(fullPreviewPath)) {
      try {
        const sharp = (await import("sharp")).default;
        await sharp(fullPreviewPath)
          .resize(64, 64, { fit: "cover" })
          .webp({ quality: 75 })
          .toFile(previewPath);
      } catch {
        error(500, "Failed to generate preview variant");
      }
    }

    if (!existsSync(previewPath)) error(404, "Preview not found");
  }

  const buffer = await readFile(previewPath);
  return new Response(buffer, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
