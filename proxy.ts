import { NextResponse, type NextRequest } from "next/server";

import { getAppSessionFromRequest } from "@/lib/auth/custom-session";
import { getGuestSessionFromRequest } from "@/lib/auth/guest-session";

const AUTH_ROUTES = ["/login", "/signup", "/join"];
const TEACHER_PREFIX = "/teacher";
const STUDENT_PREFIX = "/student";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const teacherSession = getAppSessionFromRequest(request);
  const guestSession = getGuestSessionFromRequest(request);

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isTeacherRoute = pathname.startsWith(TEACHER_PREFIX);
  const isStudentRoute = pathname.startsWith(STUDENT_PREFIX);

  if (!teacherSession && isTeacherRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!guestSession && isStudentRoute) {
    return NextResponse.redirect(new URL("/join", request.url));
  }

  if (isAuthRoute) {
    if (teacherSession) {
      return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
    }
    if (guestSession) {
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (isTeacherRoute && !teacherSession) {
    return NextResponse.redirect(new URL("/student/dashboard", request.url));
  }

  if (isStudentRoute && !guestSession) {
    return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
  }

  if (teacherSession && isStudentRoute) {
    return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
  }
  if (guestSession && isTeacherRoute) {
    return NextResponse.redirect(new URL("/student/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
