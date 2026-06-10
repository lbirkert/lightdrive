import { json } from "@sveltejs/kit";
import { createUser, getUserByEmail, createSession } from "$lib/server/db";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { name, email, password } = await request.json();

  if (!name || !email || !password) {
    return json({ error: "Name, email, and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return json({ error: "Email already registered" }, { status: 409 });
  }

  const user = await createUser(name, email, password);
  const token = await createSession(user.id);
  cookies.set("session", token, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7 });

  return json({
    user: { id: user.id, name: user.name, email: user.email },
    token,
  });
};
