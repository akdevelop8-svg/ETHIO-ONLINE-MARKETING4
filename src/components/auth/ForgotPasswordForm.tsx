import React, { useState } from 'react';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';

export const ForgotPasswordForm: React.FC = () => {
  const { requestPasswordReset, setAuthModalView } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await requestPasswordReset(email.trim());
      setSuccess(`Password reset instructions generated. Reset token: ${res.resetToken}`);
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 text-left">
      <div className="text-center space-y-1">
        <h4 className="text-base font-bold text-slate-100">Reset Your Password</h4>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Enter your registered EOM email address and we will generate a secure reset link.
        </p>
      </div>

      {error && <Alert variant="error" title="Error" message={error} />}
      {success && <Alert variant="success" title="Success" message={success} />}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input
          label="Registered Email Address"
          type="email"
          placeholder="your.email@gmail.com"
          leftIcon={<Mail className="w-4 h-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          size="md"
          isLoading={isSubmitting}
          leftIcon={<Send className="w-4 h-4" />}
        >
          Send Reset Token
        </Button>
      </form>

      <div className="text-center pt-2 text-xs border-t border-slate-800">
        <button
          type="button"
          onClick={() => setAuthModalView('signin')}
          className="text-slate-400 hover:text-white inline-flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </button>
      </div>
    </div>
  );
};
