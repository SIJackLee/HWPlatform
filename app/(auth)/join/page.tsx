import Link from "next/link";

import { joinWithInviteCode } from "@/actions/guest";
import { Button } from "@/components/ui/button";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">학생 입장</h1>
        <p className="text-sm text-muted-foreground">
          선생님에게 받은 초대코드와 이름 + 숫자 4자리로 입장합니다.
        </p>
      </div>

      <form action={joinWithInviteCode} className="space-y-4 rounded-lg border p-4">
        <div className="space-y-2">
          <label htmlFor="inviteCode" className="text-sm font-medium">
            초대코드
          </label>
          <input
            id="inviteCode"
            name="inviteCode"
            type="text"
            required
            className="w-full rounded-md border bg-background px-3 py-2 text-sm uppercase"
            placeholder="예: HW-AB12-CD34"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            이름
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="예: 김학생"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="pin4" className="text-sm font-medium">
            숫자 4자리
          </label>
          <input
            id="pin4"
            name="pin4"
            type="password"
            maxLength={4}
            inputMode="numeric"
            pattern="[0-9]{4}"
            required
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="0000"
          />
        </div>
        {params.error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {params.error}
          </p>
        ) : null}
        <Button type="submit" className="w-full">
          입장하기
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        선생님 로그인은{" "}
        <Link href="/login" className="underline underline-offset-2">
          로그인 페이지
        </Link>
        에서 진행합니다.
      </p>
    </div>
  );
}
