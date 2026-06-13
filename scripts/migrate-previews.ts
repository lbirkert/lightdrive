import "dotenv/config";
import { PrismaClient } from "../src/lib/server/prisma-client/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { join } from "node:path";
import { existsSync } from "node:fs";

const UPLOAD_DIR = join(process.cwd(), "uploads");

const adapter = new PrismaLibSql({
  url: process.env["DATABASE_URL"] ?? "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const files = await prisma.file.findMany({
    where: { hasPreview: true },
    select: { id: true, storedName: true },
  });

  console.log(`Found ${files.length} files with hasPreview=true`);

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const fullPath = join(UPLOAD_DIR, "previews", `${file.storedName}.webp`);
    const smPath = join(UPLOAD_DIR, "previews", `${file.storedName}@sm.webp`);

    if (!existsSync(fullPath)) {
      skipped++;
      continue;
    }

    if (existsSync(smPath)) {
      skipped++;
      continue;
    }

    try {
      const sharp = (await import("sharp")).default;
      await sharp(fullPath)
        .resize(64, 64, { fit: "cover" })
        .webp({ quality: 75 })
        .toFile(smPath);
      console.log(`  OK     ${file.storedName} → ${file.storedName}@sm.webp`);
      generated++;
    } catch (err) {
      console.error(`  ERROR  ${file.storedName}: ${err}`);
      errors++;
    }
  }

  console.log(`\nDone: ${generated} generated, ${skipped} skipped, ${errors} errors`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
