import { LoginForm } from '@/components/auth/login-form';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/30">
      <LoginForm />
    </div>
  );
}
