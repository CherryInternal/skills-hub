import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { env } from "~/env";
import {
  ADMIN_SESSION_COOKIE,
  SESSION_MAX_AGE,
  createAdminSession,
} from "~/server/auth";

async function login(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  if (password !== env.ADMIN_PASSWORD) {
    redirect("/admin/login?error=1");
  }
  const token = await createAdminSession();
  const jar = await cookies();
  jar.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/admin");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center gap-5">
      <div className="space-y-1 text-center">
        <h1 className="text-foreground text-xl font-semibold tracking-tight">
          Admin Login
        </h1>
        <p className="text-muted-foreground text-sm">
          Enter the admin password to access the console.
        </p>
      </div>
      <form action={login} className="flex flex-col gap-3">
        <Input
          name="password"
          type="password"
          placeholder="Admin password"
          autoFocus
          required
        />
        {error ? (
          <p className="text-destructive text-sm">Wrong password, try again.</p>
        ) : null}
        <Button type="submit">Sign in</Button>
      </form>
    </div>
  );
}
