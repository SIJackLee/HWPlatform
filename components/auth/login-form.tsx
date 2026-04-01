 "use client";

import Link from "next/link";

import { signIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function LoginForm({ errorMessage }: { errorMessage?: string }) {
  return (
    <form action={signIn} className="space-y-4">
      <input type="hidden" name="loginType" value="teacher" />
      <div className="space-y-3 rounded-lg border p-3">
        <p className="text-sm font-medium">teacher 로그인</p>
        <div className="space-y-2">
          <label htmlFor="teacherLoginId" className="text-sm font-medium">
            로그인 아이디
          </label>
          <input
            id="teacherLoginId"
            name="teacherLoginId"
            type="text"
            required
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="teacher 로그인 아이디"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="teacherPassword" className="text-sm font-medium">
            비밀번호
          </label>
          <input
            id="teacherPassword"
            name="teacherPassword"
            type="password"
            required
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="********"
          />
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" className="w-full">
        로그인
      </Button>

      <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-center">
        <p className="text-xs text-muted-foreground">학생은 계정 로그인 대신 초대코드로 입장합니다.</p>
        <Link
          href="/join"
          className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
        >
          학생 초대코드로 입장하기
        </Link>
      </div>
    </form>
  );
}
