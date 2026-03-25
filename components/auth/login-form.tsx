 "use client";

import { useState } from "react";

import { signIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function LoginForm({ errorMessage }: { errorMessage?: string }) {
  const [loginType, setLoginType] = useState<"teacher" | "student">("teacher");

  const tabClass =
    "inline-flex h-11 flex-1 items-center justify-center rounded-md border text-sm font-medium";

  return (
    <form action={signIn} className="space-y-4">
      <input type="hidden" name="loginType" value={loginType} />
      <div className="space-y-2">
        <p className="text-sm font-medium">로그인 유형</p>
        <div className="flex gap-2 rounded-lg bg-muted/50 p-1">
          <button
            type="button"
            className={`${tabClass} ${
              loginType === "teacher"
                ? "border-primary bg-background text-foreground"
                : "border-transparent bg-transparent text-muted-foreground"
            }`}
            onClick={() => setLoginType("teacher")}
          >
            teacher
          </button>
          <button
            type="button"
            className={`${tabClass} ${
              loginType === "student"
                ? "border-primary bg-background text-foreground"
                : "border-transparent bg-transparent text-muted-foreground"
            }`}
            onClick={() => setLoginType("student")}
          >
            student
          </button>
        </div>
      </div>

      <div className={`space-y-3 rounded-lg border p-3 ${loginType === "teacher" ? "block" : "hidden"}`}>
        <p className="text-sm font-medium">teacher 로그인</p>
        <div className="space-y-2">
          <label htmlFor="teacherLoginId" className="text-sm font-medium">
            로그인 아이디
          </label>
          <input
            id="teacherLoginId"
            name="teacherLoginId"
            type="text"
            required={loginType === "teacher"}
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
            required={loginType === "teacher"}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="********"
          />
        </div>
      </div>

      <div className={`space-y-3 rounded-lg border p-3 ${loginType === "student" ? "block" : "hidden"}`}>
        <p className="text-sm font-medium">student 로그인</p>
        <div className="space-y-2">
          <label htmlFor="studentName" className="text-sm font-medium">
            이름
          </label>
          <input
            id="studentName"
            name="studentName"
            type="text"
            required={loginType === "student"}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="학생 이름"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="studentPhoneLast4" className="text-sm font-medium">
            전화번호 뒤 4자리
          </label>
          <input
            id="studentPhoneLast4"
            name="studentPhoneLast4"
            type="password"
            maxLength={4}
            inputMode="numeric"
            pattern="[0-9]{4}"
            required={loginType === "student"}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="0000"
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

      <p className="text-center text-xs text-muted-foreground">
        계정 생성은 운영자가 사전 등록합니다. 신규 계정이 필요하면 운영자에게 요청해 주세요.
      </p>
    </form>
  );
}
