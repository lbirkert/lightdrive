import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RequestHandler } from "./$types";

const AVATAR_DIR = join(process.cwd(), "uploads", "avatars");

export const GET: RequestHandler = async ({ params }) => {
  const filePath = join(AVATAR_DIR, params.file);

  if (!params.file || params.file.includes("..") || params.file.includes("/")) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const buffer = await readFile(filePath);
    const ext = params.file.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
      gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
    };
    return new Response(buffer, {
      headers: { "Content-Type": mimeTypes[ext || ""] || "application/octet-stream", "Cache-Control": "public, max-age=31536000" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
};
