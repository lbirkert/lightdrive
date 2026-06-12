import "dotenv/config";
import { PrismaClient } from "../src/lib/server/prisma-client/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { readdir, unlink } from "node:fs/promises";
import { join } from "node:path";

const UPLOAD_DIR = join(process.cwd(), "uploads");

const adapter = new PrismaLibSql({
  url: process.env["DATABASE_URL"] ?? "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

interface Stats {
  removed: number;
  skipped: number;
  errors: number;
}

async function removeIfOrphan(
  dir: string,
  filename: string,
  known: Set<string>,
  extractKey: (name: string) => string | null,
  stats: Stats,
): Promise<void> {
  const key = extractKey(filename);
  if (key === null || known.has(key)) {
    stats.skipped++;
    return;
  }
  const fullPath = join(dir, filename);
  try {
    await unlink(fullPath);
    console.log(`  DELETE  ${filename}`);
    stats.removed++;
  } catch (e) {
    console.error(`  ERROR   ${filename}: ${e}`);
    stats.errors++;
  }
}

async function main() {
  // Collect all known storedNames from the database
  console.log("Querying database for known files...");
  const files = await prisma.file.findMany({
    select: { storedName: true },
  });
  const knownStored = new Set<string>();
  for (const f of files) {
    knownStored.add(f.storedName);
  }
  console.log(`Found ${knownStored.size} file records in database\n`);

  // Collect known avatar filenames
  console.log("Querying database for known avatars...");
  const usersWithAvatars = await prisma.user.findMany({
    where: { avatarUrl: { not: null } },
    select: { avatarUrl: true },
  });
  const knownAvatars = new Set<string>();
  for (const u of usersWithAvatars) {
    if (u.avatarUrl) knownAvatars.add(u.avatarUrl);
  }
  console.log(`Found ${knownAvatars.size} avatar references in database\n`);

  // --- 1. Orphaned uploaded files (uploads/<storedName>) ---
  console.log("=== Scanning uploads/ (original files) ===");
  const filesStats: Stats = { removed: 0, skipped: 0, errors: 0 };
  let entries: string[];
  try {
    entries = await readdir(UPLOAD_DIR);
  } catch (e) {
    console.error(`Cannot read ${UPLOAD_DIR}: ${e}`);
    return;
  }
  for (const entry of entries) {
    if (entry === "previews" || entry === "transcoded" || entry === "avatars") continue;
    if (entry.startsWith(".")) continue;

    if (entry.endsWith(".part")) {
      await removeIfOrphan(
        UPLOAD_DIR, entry, knownStored,
        (name) => name.endsWith(".part") ? name.slice(0, -5) : null,
        filesStats,
      );
      continue;
    }

    await removeIfOrphan(UPLOAD_DIR, entry, knownStored, (name) => name, filesStats);
  }
  console.log(`  Done: ${filesStats.removed} removed, ${filesStats.skipped} kept, ${filesStats.errors} errors\n`);

  // --- 2. Orphaned previews (uploads/previews/<storedName>.webp) ---
  console.log("=== Scanning uploads/previews/ ===");
  const previewStats: Stats = { removed: 0, skipped: 0, errors: 0 };
  const previewDir = join(UPLOAD_DIR, "previews");
  try {
    entries = await readdir(previewDir);
  } catch {
    entries = [];
  }
  for (const entry of entries) {
    await removeIfOrphan(
      previewDir, entry, knownStored,
      (name) => name.endsWith(".webp") ? name.slice(0, -5) : null,
      previewStats,
    );
  }
  console.log(`  Done: ${previewStats.removed} removed, ${previewStats.skipped} kept, ${previewStats.errors} errors\n`);

  // --- 3. Orphaned transcodes (uploads/transcoded/<storedName>.mp4/.m4a) ---
  console.log("=== Scanning uploads/transcoded/ ===");
  const transcodeStats: Stats = { removed: 0, skipped: 0, errors: 0 };
  const transcodeDir = join(UPLOAD_DIR, "transcoded");
  try {
    entries = await readdir(transcodeDir);
  } catch {
    entries = [];
  }
  for (const entry of entries) {
    await removeIfOrphan(
      transcodeDir, entry, knownStored,
      (name) => {
        if (name.endsWith(".mp4")) return name.slice(0, -4);
        if (name.endsWith(".m4a")) return name.slice(0, -4);
        if (name.endsWith(".webm")) return name.slice(0, -5);
        return null;
      },
      transcodeStats,
    );
  }
  console.log(`  Done: ${transcodeStats.removed} removed, ${transcodeStats.skipped} kept, ${transcodeStats.errors} errors\n`);

  // --- 4. Orphaned avatars (uploads/avatars/<filename>) ---
  console.log("=== Scanning uploads/avatars/ ===");
  const avatarStats: Stats = { removed: 0, skipped: 0, errors: 0 };
  const avatarDir = join(UPLOAD_DIR, "avatars");
  try {
    entries = await readdir(avatarDir);
  } catch {
    entries = [];
  }
  for (const entry of entries) {
    await removeIfOrphan(avatarDir, entry, knownAvatars, (name) => name, avatarStats);
  }
  console.log(`  Done: ${avatarStats.removed} removed, ${avatarStats.skipped} kept, ${avatarStats.errors} errors\n`);

  // Summary
  const totalRemoved = filesStats.removed + previewStats.removed + transcodeStats.removed + avatarStats.removed;
  const totalErrors = filesStats.errors + previewStats.errors + transcodeStats.errors + avatarStats.errors;
  console.log("=== Summary ===");
  console.log(`Total removed: ${totalRemoved}`);
  console.log(`Total errors:  ${totalErrors}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
