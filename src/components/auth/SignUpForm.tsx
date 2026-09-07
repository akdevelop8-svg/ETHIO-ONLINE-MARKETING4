import React, { useState } from 'react';
import { UserPlus, Mail, User, Phone, Key, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';

export const SignUpForm: React.FC = () => {
  const { register, setAuthModalView } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !username || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await register({
        fullName,
        email,
        phone,
        username: username.trim().replace(/^@+/, ''),
        password,
        confirmPassword,
        agreedToTerms: true
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 text-left">
      {error && <Alert variant="error" title="Registration Error" message={error} />}

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label="Full Name"
          placeholder="e.g. Yared Getachew"
          leftIcon={<User className="w-4 h-4" />}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Email Address"
            type="email"
            placeholder="yared@gmail.com"
            leftIcon={<Mail className="w-4 h-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Username"
            placeholder="@yared_g"
            leftIcon={<Send className="w-4 h-4" />}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <Input
          label="Phone Number (Ethiopian / Telebirr)"
          type="tel"
          placeholder="+251 91 123 4567"
          leftIcon={<Phone className="w-4 h-4" />}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Password"
            isPassword
            placeholder="Min 8 characters"
            leftIcon={<Key className="w-4 h-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm Password"
            isPassword
            placeholder="Repeat password"
            leftIcon={<Key className="w-4 h-4" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          fullWidth
          size="md"
          isLoading={isSubmitting}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Create EOM Account
        </Button>
      </form>

      <div className="text-center pt-2 text-xs text-slate-400 border-t border-slate-800">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => setAuthModalView('signin')}
          className="text-amber-400 font-bold hover:underline cursor-pointer ml-1"
        >
          Sign In
        </button>
      </div>
    </div>
  );
};
