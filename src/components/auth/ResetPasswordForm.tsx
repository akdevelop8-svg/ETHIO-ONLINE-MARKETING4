import React, { useState } from 'react';
import { KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';

export const ResetPasswordForm: React.FC = () => {
  const { confirmPasswordReset, authModal, setAuthModalView } = useAuth();
  const [token, setToken] = useState(authModal.resetToken || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !password) {
      setError('Please provide the reset token and new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await confirmPasswordReset(token, password, confirmPassword);
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 text-left">
      <div className="text-center space-y-1">
        <h4 className="text-base font-bold text-slate-100">Set New Password</h4>
        <p className="text-xs text-slate-400">
          Enter the reset token and choose a strong new password for your account.
        </p>
      </div>

      {error && <Alert variant="error" title="Error" message={error} />}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input
          label="Reset Token"
          placeholder="Paste token here"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
        />

        <Input
          label="New Password"
          isPassword
          placeholder="Min 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Input
          label="Confirm New Password"
          isPassword
          placeholder="Repeat new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
          Update Password
        </Button>
      </form>

      <div className="text-center pt-2 text-xs border-t border-slate-800">
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
