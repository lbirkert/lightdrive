import { json } from "@sveltejs/kit";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { addFile, getDriveContext, isFolderInSharedFolder } from "$lib/server/db";
import { generateDocumentPreview } from "$lib/server/preview";
import type { RequestHandler } from "./$types";

const UPLOAD_DIR = join(process.cwd(), "uploads");

const typeConfig: Record<string, { ext: string; mime: string; label: string }> = {
  txt: { ext: ".txt", mime: "text/plain", label: "Text" },
  md: { ext: ".md", mime: "text/markdown", label: "Markdown" },
  csv: { ext: ".csv", mime: "text/csv", label: "CSV" },
};

export const POST: RequestHandler = async ({ request, locals, params }) => {
  const ctx = await getDriveContext(params.driveId, locals, "insert");
  if (!ctx) return json({ error: "Drive not found or upload not permitted" }, { status: 404 });
  if (ctx.type === "share" && !ctx.share?.folderId) {
    return json({ error: "Can only create documents in shared folders" }, { status: 400 });
  }

  const body = await request.json();
  const docType = body.type as string;
  const name = (body.name as string)?.trim();
  const folderId = (body.folderId as string) || null;

  if (ctx.type === "share" && ctx.share?.folderId) {
    const targetFolder = folderId || ctx.share.folderId;
    if (!(await isFolderInSharedFolder(targetFolder, ctx.share.folderId))) {
      return json({ error: "Folder not in shared drive" }, { status: 403 });
    }
  }

  if (!docType || !typeConfig[docType]) {
    return json({ error: "Invalid document type. Use: txt, md, or csv" }, { status: 400 });
  }
  if (!name) {
    return json({ error: "Name is required" }, { status: 400 });
  }

  const config = typeConfig[docType];
  const fullName = name.endsWith(config.ext) ? name : `${name}${config.ext}`;
  const storedName = `${randomBytes(16).toString("hex")}${config.ext}`;
  const storedPath = join(UPLOAD_DIR, storedName);

  await mkdir(UPLOAD_DIR, { recursive: true });

  let buffer: Buffer;

  try {
    if (docType === "txt" || docType === "md" || docType === "csv") {
      buffer = Buffer.from(docType === "csv" ? "Name,Value" : "", "utf-8");
    } else {
      return json({ error: "Unsupported document type" }, { status: 400 });
    }
  } catch (e: any) {
    return json({ error: `Failed to create document: ${e.message}` }, { status: 500 });
  }

  await writeFile(storedPath, buffer);
  const hasPreview = await generateDocumentPreview(storedName, fullName, config.mime);
  const resolvedFolderId = ctx.type === "share" && ctx.share?.folderId ? (folderId || ctx.share.folderId) : folderId;
  const record = await addFile(ctx.userId, storedName, fullName, buffer.length, config.mime, resolvedFolderId, hasPreview);

  return json({
    file: {
      id: record.id,
      originalName: record.originalName,
      size: record.size,
      type: record.type,
      hasPreview,
    },
  });
};
