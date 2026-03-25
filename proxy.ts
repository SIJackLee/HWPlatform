import { NextResponse, type NextRequest } from "next/server";

import { getAppSessionFromRequest } from "@/lib/auth/custom-session";

const AUTH_ROUTES = ["/login", "/signup"];
const TEACHER_PREFIX = "/teacher";
const STUDENT_PREFIX = "/student";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const session = getAppSessionFromRequest(request);

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isTeacherRoute = pathname.startsWith(TEACHER_PREFIX);
  const isStudentRoute = pathname.startsWith(STUDENT_PREFIX);

  if (!session && (isTeacherRoute || isStudentRoute)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!session) {
    return NextResponse.next();
  }

  if (isAuthRoute) {
    const destination = session.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (isTeacherRoute && session.role !== "teacher") {
    return NextResponse.redirect(new URL("/student/dashboard", request.url));
  }

  if (isStudentRoute && session.role !== "student") {
    return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
