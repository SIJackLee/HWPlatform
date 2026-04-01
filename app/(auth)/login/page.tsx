import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">학원 숙제 플랫폼 로그인</h1>
        <p className="text-sm text-muted-foreground">선생님 계정으로 로그인하세요. 학생은 초대코드로 입장합니다.</p>
      </div>
      <LoginForm errorMessage={params.error} />
    </div>
  );
}
