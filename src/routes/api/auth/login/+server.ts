import { json } from "@sveltejs/kit";
import { getUserByEmail, verifyPassword, createSession } from "$lib/server/db";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { email, password } = await request.json();

  if (!email || !password) {
    return json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await getUserByEmail(email);
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    return json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await createSession(user.id);
  cookies.set("session", token, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7 });

  return json({
    user: { id: user.id, name: user.name, email: user.email },
    token,
  });
};
