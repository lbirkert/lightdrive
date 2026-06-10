import { json, error } from "@sveltejs/kit";
import { readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { getFile, updateFileSize, getDriveContext, isFileInSharedFolder } from "$lib/server/db";
import { getDocumentCategory } from "$lib/server/preview";
import type { RequestHandler } from "./$types";

const UPLOAD_DIR = join(process.cwd(), "uploads");

export const GET: RequestHandler = async ({ params, locals }) => {
  const ctx = await getDriveContext(params.driveId, locals);
  if (!ctx) error(404, "Drive not found");

  const file = await getFile(params.fileId);
  if (!file) error(404, "File not found");

  if (ctx.type === "share") {
    if (ctx.share?.fileId) {
      if (params.fileId !== ctx.share.fileId) error(403, "File is not in the shared drive");
    } else if (ctx.share?.folderId) {
      const allowed = await isFileInSharedFolder(params.fileId, ctx.share.folderId);
      if (!allowed) error(403, "File is not in the shared drive");
    } else {
      error(400, "Invalid share configuration");
    }
  } else if (file.userId !== ctx.userId) {
    error(404, "Not found");
  }

  const cat = getDocumentCategory(file.type, file.originalName);
  const filePath = join(UPLOAD_DIR, file.storedName);
  const buffer = await readFile(filePath);

  if (cat === "txt" || cat === "md" || cat === "csv") {
    const text = buffer.toString("utf-8");
    if (cat === "md") {
      const marked = await import("marked");
      return json({ content: text, html: marked.parse(text), category: "md" });
    }
    if (cat === "csv") {
      const rows = text.trim() ? text.split("\n").map(r => r.split(",").map(c => c.trim().replace(/^"|"$/g, ""))) : [];
      return json({ content: text, rows, category: "csv" });
    }
    return json({ content: text, category: "txt" });
  }

  if (cat === "docx") {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.convertToHtml({ buffer });
      return json({ content: result.value, category: "docx" });
    } catch (e: any) {
      return json({ content: "", category: "docx", error: e.message });
    }
  }

  if (cat === "xlsx") {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buffer, { type: "buffer" });
      const sheets: Record<string, any[][]> = {};
      for (const name of wb.SheetNames) {
        const ws = wb.Sheets[name];
        sheets[name] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      }
      return json({ content: sheets, category: "xlsx", sheetNames: wb.SheetNames });
    } catch (e: any) {
      return json({ content: {}, category: "xlsx", error: e.message });
    }
  }

  return json({ content: null, category: cat });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const ctx = await getDriveContext(params.driveId, locals);
  if (!ctx) error(404, "Drive not found");

  if (ctx.type === "share") {
    const perms = (ctx.share?.permissions || "").split(",").map(p => p.trim());
    if (!perms.includes("edit")) error(403, "Edit permission not granted");
    if (ctx.share?.fileId) {
      if (params.fileId !== ctx.share.fileId) error(403, "File is not in the shared drive");
    } else if (ctx.share?.folderId) {
      const allowed = await isFileInSharedFolder(params.fileId, ctx.share.folderId);
      if (!allowed) error(403, "File is not in the shared drive");
    } else {
      error(400, "Invalid share configuration");
    }
  }

  const file = await getFile(params.fileId);
  if (!file) error(404, "Not found");

  if (ctx.type !== "share" && file.userId !== ctx.userId) {
    error(404, "Not found");
  }

  const cat = getDocumentCategory(file.type, file.originalName);
  const { content } = await request.json();
  const filePath = join(UPLOAD_DIR, file.storedName);

  if (cat === "txt" || cat === "md" || cat === "csv") {
    await writeFile(filePath, content, "utf-8");
    const { size } = await stat(filePath);
    await updateFileSize(file.id, size);
    return json({ saved: true });
  }

  if (cat === "xlsx") {
    try {
      const XLSX = await import("xlsx");
      const data = content as Record<string, any[][]>;
      const wb = XLSX.utils.book_new();
      for (const [name, rows] of Object.entries(data)) {
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, name);
      }
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      await writeFile(filePath, buf);
      const { size } = await stat(filePath);
      await updateFileSize(file.id, size);
      return json({ saved: true });
    } catch (e: any) {
      return json({ error: e.message }, { status: 500 });
    }
  }

  return json({ error: "File type not editable" }, { status: 400 });
};
