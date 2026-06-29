'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { sendCandidateOTP, verifyCandidateOTP } from '@/lib/actions/candidate';

interface CandidatePortalVerifyProps {
  candidateId: string;
  candidateEmail: string;
  candidateName: string;
  accessToken: string;
}

export function CandidatePortalVerify({
  candidateId,
  candidateEmail,
  candidateName,
  accessToken,
}: CandidatePortalVerifyProps) {
  const [step, setStep] = useState<'verify' | 'otp'>('verify');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sendingOtp, startSendOtp] = useTransition();
  const [verifyingOtp, startVerifyOtp] = useTransition();
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  const handleSendOtp = () => {
    startSendOtp(async () => {
      const formData = new FormData();
      formData.set('access_token', accessToken);
      formData.set('email', candidateEmail);

      const result = await sendCandidateOTP(formData);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      if (result?.sessionId) {
        setSessionId(result.sessionId);
        setStep('otp');
        toast.success('Verification code sent!');
      }
    });
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(0, 1);
    }
    if (otpRefs.current[index]) {
      otpRefs.current[index]!.value = value;
    }
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpRefs.current[index]?.value && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = () => {
    startVerifyOtp(async () => {
      const otpCode = otpRefs.current.map(ref => ref?.value || '').join('');
      if (otpCode.length !== 6) {
        toast.error('Please enter the complete 6-digit code');
        return;
      }

      const formData = new FormData();
      formData.set('session_id', sessionId!);
      formData.set('otp_code', otpCode);

      const result = await verifyCandidateOTP(formData);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      if (result?.sessionToken) {
        toast.success('Verified! Redirecting to your dashboard...');
        router.push(`/portal/${accessToken}/dashboard?session=${result.sessionToken}`);
      }
    });
  };

  const handleResendOtp = () => {
    handleSendOtp();
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Welcome, {candidateName}!</CardTitle>
        <CardDescription>
          {step === 'verify'
            ? 'Verify your email address to access the candidate portal.'
            : `Enter the 6-digit code sent to ${candidateEmail}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'verify' ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-accent/10 p-3 text-sm text-center text-accent">
              A verification code will be sent to <strong>{candidateEmail}</strong>
            </div>
            <LoadingButton
              onClick={handleSendOtp}
              loading={sendingOtp}
              loadingText="Sending..."
              className="w-full"
            >
              Send Verification Code
            </LoadingButton>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  autoComplete="one-time-code"
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="h-12 w-12 text-center text-lg font-bold"
                />
              ))}
            </div>
            <LoadingButton
              onClick={handleVerifyOtp}
              loading={verifyingOtp}
              loadingText="Verifying..."
              className="w-full"
            >
              Verify
            </LoadingButton>
            <div className="text-center">
              <button
                onClick={handleResendOtp}
                disabled={sendingOtp}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                {sendingOtp ? 'Sending...' : 'Resend code'}
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
