import "dotenv/config";
import type { Handle } from "@sveltejs/kit";
import { getSessionUser } from "$lib/server/db";

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get("session");
  if (token) {
    const user = await getSessionUser(token);
    if (user) event.locals.user = { id: user.id, name: user.name, email: user.email };
  }
  return resolve(event);
};
