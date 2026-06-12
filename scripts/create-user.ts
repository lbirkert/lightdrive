import "dotenv/config";
import { PrismaClient } from "../src/lib/server/prisma-client/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { hash } from "argon2";
import { createInterface } from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import { AVATAR_COLORS } from "../src/lib/avatar";

const adapter = new PrismaLibSql({
  url: process.env["DATABASE_URL"] ?? "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

function prompt(query: string): Promise<string> {
  const rl = createInterface({ input, output });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log("Create a LightDrive user\n");

  const args = process.argv.slice(2);
  const adminIndex = args.indexOf("--admin");
  const isAdmin = adminIndex !== -1;
  if (isAdmin) args.splice(adminIndex, 1);

  const name = args[0] || await prompt("Name: ");
  const email = args[1] || await prompt("Email: ");
  const password = args[2] || await prompt("Password: ");

  if (!name || !email || !password) {
    console.error("Name, email, and password are required.");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`User with email "${email}" already exists.`);
    process.exit(1);
  }

  const passwordHash = await hash(password);
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const user = await prisma.user.create({
    data: { name, email, passwordHash, avatarColor, admin: isAdmin },
  });

  console.log(`\nUser created:`);
  console.log(`  ID:    ${user.id}`);
  console.log(`  Name:  ${user.name}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Admin: ${user.admin}`);
}

main().catch((e) => {
  console.error("Failed to create user:", e);
  process.exit(1);
});
