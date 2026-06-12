/// <reference types="@sveltejs/kit" />

declare module "flewui/styles";

declare global {
  namespace App {
    interface Locals {
      user?: { id: string; name: string; email: string; avatarUrl: string | null; avatarColor: string | null };
    }
  }
}

export {};
