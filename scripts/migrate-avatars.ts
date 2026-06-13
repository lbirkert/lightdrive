import "dotenv/config";
import { PrismaClient } from "../src/lib/server/prisma-client/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";

const AVATAR_DIR = join(process.cwd(), "uploads", "avatars");

const adapter = new PrismaLibSql({
  url: process.env["DATABASE_URL"] ?? "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    where: {
      avatarUrl: { startsWith: "/api/auth/avatar/" },
    },
    select: { id: true, avatarUrl: true },
  });

  console.log(`Found ${users.length} users with uploaded avatars`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    if (!user.avatarUrl) { skipped++; continue; }

    const oldFilename = user.avatarUrl.replace("/api/auth/avatar/", "");

    // Already migrated: .webp without @ variant suffix
    if (oldFilename.endsWith(".webp") && !oldFilename.includes("@")) {
      skipped++;
      continue;
    }

    const oldPath = join(AVATAR_DIR, oldFilename);
    if (!existsSync(oldPath)) {
      console.log(`  SKIP   ${user.id}: file missing (${oldFilename})`);
      skipped++;
      continue;
    }

    try {
      const buffer = await readFile(oldPath);
      const baseName = randomBytes(16).toString("hex");

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

      const newUrl = `/api/auth/avatar/${baseName}.webp`;

      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: newUrl },
      });

      await unlink(oldPath).catch(() => {});
      console.log(`  OK     ${user.id}: ${oldFilename} → ${baseName}.webp`);
      migrated++;
    } catch (err) {
      console.error(`  ERROR  ${user.id}: ${err}`);
      errors++;
    }
  }

  console.log(`\nDone: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
