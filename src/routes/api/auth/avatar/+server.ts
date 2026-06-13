import { json } from "@sveltejs/kit";
import { mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { prisma } from "$lib/server/db";
import { AVATAR_COLORS } from "$lib/avatar";
import type { RequestHandler } from "./$types";

const AVATAR_DIR = join(process.cwd(), "uploads", "avatars");

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: "Not authenticated" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("avatar") as File | null;

  if (!file) {
    return json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return json({ error: "File too large. Max 2MB." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return json({ error: "Only image files are allowed" }, { status: 400 });
  }

  await mkdir(AVATAR_DIR, { recursive: true });

  const baseName = randomBytes(16).toString("hex");
  const buffer = Buffer.from(await file.arrayBuffer());

  const sharp = (await import("sharp")).default;
  await Promise.all([
    sharp(buffer)
      .resize(64, 64, { fit: "cover" })
      .webp({ quality: 85 })
      .toFile(join(AVATAR_DIR, `${baseName}.webp`)),
    sharp(buffer)
      .resize(1024, 1024, { fit: "cover", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(join(AVATAR_DIR, `${baseName}@1024.webp`)),
  ]);

  const oldUser = await prisma.user.findUnique({ where: { id: locals.user.id }, select: { avatarUrl: true } });
  const oldPath = oldUser?.avatarUrl;
  const avatarUrl = `/api/auth/avatar/${baseName}.webp`;

  await prisma.user.update({
    where: { id: locals.user.id },
    data: { avatarUrl },
  });

  if (oldPath && oldPath.startsWith("/api/auth/avatar/")) {
    const oldFilename = oldPath.replace("/api/auth/avatar/", "");
    unlink(join(AVATAR_DIR, oldFilename)).catch(() => {});
    const oldBase = oldFilename.replace(/\.[^.]+$/, "");
    unlink(join(AVATAR_DIR, `${oldBase}@1024.webp`)).catch(() => {});
  }

  return json({ avatarUrl });
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: "Not authenticated" }, { status: 401 });

  const { color } = await request.json();

  if (!color || !AVATAR_COLORS.includes(color)) {
    return json({ error: "Invalid color" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: locals.user.id },
    data: { avatarColor: color, avatarUrl: null },
  });

  return json({ avatarColor: color, avatarUrl: null });
};
