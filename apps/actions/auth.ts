"use server";

import { signIn } from "@/auth";

export async function signInWithPocketId() {
  await signIn("pocket-id", { redirectTo: "/" });
}
