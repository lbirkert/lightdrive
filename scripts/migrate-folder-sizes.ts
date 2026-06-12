import "dotenv/config";
import { PrismaClient } from "../src/lib/server/prisma-client/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env["DATABASE_URL"] ?? "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const folders = await prisma.folder.findMany({
    select: { id: true, parentId: true },
  });

  const fileSizes = await prisma.file.groupBy({
    by: ["folderId"],
    where: { folderId: { not: null } },
    _sum: { size: true },
  });

  const dirSizes = new Map<string, number>();
  for (const g of fileSizes) {
    if (g.folderId) dirSizes.set(g.folderId, g._sum.size ?? 0);
  }

  const childMap = new Map<string | null, string[]>();
  for (const f of folders) {
    const p = f.parentId ?? "";
    if (!childMap.has(p)) childMap.set(p, []);
    childMap.get(p)!.push(f.id);
  }

  function accumulateSize(id: string, seen: Set<string>): number {
    if (seen.has(id)) return 0;
    seen.add(id);
    let total = dirSizes.get(id) ?? 0;
    for (const cid of childMap.get(id) ?? []) {
      total += accumulateSize(cid, seen);
    }
    return total;
  }

  console.log(`Computing sizes for ${folders.length} folders...`);

  for (const f of folders) {
    const total = accumulateSize(f.id, new Set());
    await prisma.folder.update({
      where: { id: f.id },
      data: { size: total },
    });
  }

  console.log("Done!");
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
