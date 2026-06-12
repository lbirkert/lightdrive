import "dotenv/config";
import { PrismaClient } from "../src/lib/server/prisma-client/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { getRandomAvatarColor } from "../src/lib/avatar";

const adapter = new PrismaLibSql({
  url: process.env["DATABASE_URL"] ?? "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    where: { avatarColor: null },
    select: { id: true }
  });

  console.log(`Found ${users.length} users without avatar color`);

  for (const u of users) {
    await prisma.user.update({
      where: { id: u.id },
      data: { avatarColor: getRandomAvatarColor() },
    });
  }

  console.log(`Updated ${users.length} users`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
