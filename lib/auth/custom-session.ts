import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import type { UserRole } from "@/types/auth";
import { appSessionSecret } from "@/lib/supabase/env";

const SESSION_COOKIE_NAME = "app_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h

export interface AppSessionPayload {
  profile_id: string;
  role: UserRole;
  name: string;
  exp: number;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string): string {
  return createHmac("sha256", appSessionSecret).update(value).digest("base64url");
}

function encodeSession(payload: AppSessionPayload): string {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(body);
  return `${body}.${signature}`;
}

function decodeSession(token: string): AppSessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length) return null;
  if (!timingSafeEqual(expectedBuffer, signatureBuffer)) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(body)) as AppSessionPayload;
    if (!parsed?.profile_id || !parsed?.role || !parsed?.name || !parsed?.exp) return null;
    if (Date.now() >= parsed.exp * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function createAppSession(input: {
  profileId: string;
  role: UserRole;
  name: string;
}) {
  const cookieStore = await cookies();
  const payload: AppSessionPayload = {
    profile_id: input.profileId,
    role: input.role,
    name: input.name,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  cookieStore.set(SESSION_COOKIE_NAME, encodeSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAppSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getAppSessionFromCookies(): Promise<AppSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export function getAppSessionFromRequest(request: NextRequest): AppSessionPayload | null {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return decodeSession(token);
}
