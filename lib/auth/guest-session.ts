import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { appSessionSecret } from "@/lib/supabase/env";

const GUEST_SESSION_COOKIE_NAME = "guest_session";
const GUEST_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7d

export interface GuestSessionPayload {
  guest_student_id: string;
  class_id: string;
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
  return createHmac("sha256", `${appSessionSecret}:guest`).update(value).digest("base64url");
}

function encodeSession(payload: GuestSessionPayload): string {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(body);
  return `${body}.${signature}`;
}

function decodeSession(token: string): GuestSessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length) return null;
  if (!timingSafeEqual(expectedBuffer, signatureBuffer)) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(body)) as GuestSessionPayload;
    if (!parsed?.guest_student_id || !parsed?.class_id || !parsed?.name || !parsed?.exp) return null;
    if (Date.now() >= parsed.exp * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function createGuestSession(input: {
  guestStudentId: string;
  classId: string;
  name: string;
}) {
  const cookieStore = await cookies();
  const payload: GuestSessionPayload = {
    guest_student_id: input.guestStudentId,
    class_id: input.classId,
    name: input.name,
    exp: Math.floor(Date.now() / 1000) + GUEST_SESSION_TTL_SECONDS,
  };

  cookieStore.set(GUEST_SESSION_COOKIE_NAME, encodeSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_SESSION_TTL_SECONDS,
  });
}

export async function clearGuestSession() {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_SESSION_COOKIE_NAME);
}

export async function getGuestSessionFromCookies(): Promise<GuestSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(GUEST_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export function getGuestSessionFromRequest(request: NextRequest): GuestSessionPayload | null {
  const token = request.cookies.get(GUEST_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return decodeSession(token);
}
