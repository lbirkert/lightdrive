import { PrismaClient } from "../src/lib/server/prisma-client/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env["DATABASE_URL"] ?? "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/update-user.ts <email> --admin|--no-admin");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`User with email "${email}" not found.`);
    process.exit(1);
  }

  const setAdmin = process.argv.includes("--admin");
  const unsetAdmin = process.argv.includes("--no-admin");

  if (!setAdmin && !unsetAdmin) {
    console.error("Specify --admin or --no-admin.");
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { admin: setAdmin },
  });

  console.log(`User updated:`);
  console.log(`  ID:    ${updated.id}`);
  console.log(`  Name:  ${updated.name}`);
  console.log(`  Email: ${updated.email}`);
  console.log(`  Admin: ${updated.admin}`);
}

main().catch((e) => {
  console.error("Failed to update user:", e);
  process.exit(1);
});
