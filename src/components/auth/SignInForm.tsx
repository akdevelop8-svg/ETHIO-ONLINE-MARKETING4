import React, { useState } from 'react';
import { LogIn, Key, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { DEMO_ACCOUNTS } from '../../constants';

export const SignInForm: React.FC = () => {
  const { login, setAuthModalView, authModal } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter your email or username and password.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ identifier, password });
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillQuickAccount = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setIdentifier(acc.email);
    setPassword(acc.password);
    setError(null);
  };

  return (
    <div className="space-y-4 text-left">
      {authModal.reason && (
        <Alert variant="warning" title="Action Required" message={authModal.reason} />
      )}

      {error && <Alert variant="error" title="Sign In Error" message={error} />}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input
          label="Email or Username"
          placeholder="e.g. user@gmail.com or @username"
          leftIcon={<Mail className="w-4 h-4" />}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />

        <div className="space-y-1">
          <Input
            label="Password"
            placeholder="••••••••"
            isPassword
            leftIcon={<Key className="w-4 h-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setAuthModalView('forgot-password')}
              className="text-xs text-amber-400 hover:underline cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          fullWidth
          size="md"
          isLoading={isSubmitting}
          leftIcon={<LogIn className="w-4 h-4" />}
        >
          Sign In to EOM
        </Button>
      </form>

      {/* Switch to Sign Up */}
      <div className="text-center pt-2 text-xs text-slate-400 border-t border-slate-800">
        Don&apos;t have an account yet?{' '}
        <button
          type="button"
          onClick={() => setAuthModalView('signup')}
          className="text-amber-400 font-bold hover:underline cursor-pointer ml-1"
        >
          Create an Account
        </button>
      </div>

      {/* Quick Test Accounts for Ease of Testing */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        <span className="text-[11px] font-bold text-slate-400 block mb-2 uppercase tracking-wider">
          Quick Demo Accounts (Click to Autofill)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.id}
              type="button"
              onClick={() => fillQuickAccount(acc)}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 text-left transition-all cursor-pointer"
            >
              <span className="text-[10px] font-bold text-amber-400 block">{acc.role}</span>
              <span className="text-[11px] font-medium text-slate-200 block truncate">{acc.label}</span>
              <span className="text-[9px] text-slate-400 font-mono block truncate">{acc.email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
