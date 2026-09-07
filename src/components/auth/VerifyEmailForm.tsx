import React, { useState } from 'react';
import { CheckCircle2, RefreshCw, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';

export const VerifyEmailForm: React.FC = () => {
  const { verifyEmail, resendVerificationEmail, authModal, setAuthModalView, user } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await verifyEmail(code.trim());
      setSuccess('Email successfully verified! Welcome to EOM.');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setIsResending(true);
    try {
      const res = await resendVerificationEmail();
      setSuccess(`New verification code sent! (Code: ${res.code})`);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-4 text-left">
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-2">
          <KeyRound className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-slate-100">Verify Your Email</h4>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          We sent a 6-digit verification code to{' '}
          <span className="text-amber-400 font-semibold">{authModal.emailForVerification || user?.email || 'your email'}</span>.
        </p>
      </div>

      {error && <Alert variant="error" title="Verification Error" message={error} />}
      {success && <Alert variant="success" title="Success" message={success} />}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input
          label="Verification Code"
          placeholder="e.g. 849201"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="text-center tracking-widest font-mono text-base font-bold"
          maxLength={8}
          required
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          size="md"
          isLoading={isSubmitting}
          leftIcon={<CheckCircle2 className="w-4 h-4" />}
        >
          Verify & Continue
        </Button>
      </form>

      <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-800">
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="text-slate-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
          <span>Resend Code</span>
        </button>
        <button
          type="button"
          onClick={() => setAuthModalView('signin')}
          className="text-amber-400 hover:underline cursor-pointer"
        >
          Back to Sign In
        </button>
      </div>
    </div>
  );
};
