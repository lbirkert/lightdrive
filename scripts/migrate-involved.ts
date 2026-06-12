import { PrismaClient } from "../src/lib/server/prisma-client/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env["DATABASE_URL"] ?? "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const files = await prisma.file.findMany({
    where: {
      involvements: { none: {} }
    },
    select: { id: true, userId: true }
  });

  console.log(`Found ${files.length} files without involved users`);

  let created = 0;
  for (const f of files) {
    try {
      await prisma.fileInvolvement.create({
        data: { fileId: f.id, userId: f.userId }
      });
      created++;
    } catch {
      // unique constraint = already exists
    }
  }

  console.log(`Created ${created} involvement records`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
