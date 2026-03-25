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
        <p className="text-sm text-muted-foreground">운영자가 사전 등록한 teacher / student 계정으로 로그인하세요.</p>
      </div>
      <LoginForm errorMessage={params.error} />
    </div>
  );
}
