import Link from "next/link";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">회원가입 비활성화</h1>
        <p className="text-sm text-muted-foreground">현재 서비스는 운영자가 사전 등록한 계정으로만 로그인할 수 있습니다.</p>
      </div>
      {params.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {params.error}
        </p>
      ) : null}
      <div className="rounded-md border px-3 py-3 text-sm text-muted-foreground">
        신규 계정이 필요하면 운영자에게 teacher/student 계정 등록을 요청해 주세요.
      </div>

      <p className="text-center text-sm text-muted-foreground">
        로그인 페이지로 이동{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          로그인
        </Link>
      </p>
    </div>
  );
}
