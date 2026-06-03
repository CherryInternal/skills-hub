import { SignJWT, jwtVerify } from "jose";

import { env } from "~/env";

const secret = new TextEncoder().encode(env.AUTH_SECRET);

export const ADMIN_SESSION_COOKIE = "admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** Sign a 7-day admin session token. */
export async function createAdminSession(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/** Verify a session token; true only for a valid admin session. */
export async function verifyAdminSession(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.role === "admin";
  } catch {
    return false;
  }
}

/** Pull admin_session out of a raw Cookie header. */
export function readSessionCookie(
  cookieHeader: string | null,
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === ADMIN_SESSION_COOKIE) return v.join("=");
  }
  return undefined;
}

/** Route Handler 用:从请求 cookie 判断是否为合法 admin。 */
export async function isAdminRequest(req: Request): Promise<boolean> {
  return verifyAdminSession(readSessionCookie(req.headers.get("cookie")));
}
