import React from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { VerifyEmailForm } from './VerifyEmailForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { ResetPasswordForm } from './ResetPasswordForm';

export const AuthModal: React.FC = () => {
  const { authModal, closeAuthModal } = useAuth();

  const getTitle = () => {
    switch (authModal.view) {
      case 'signin':
        return 'Sign In to EOM';
      case 'signup':
        return 'Create EOM Account';
      case 'verify-email':
        return 'Verify Email Address';
      case 'forgot-password':
        return 'Reset Password';
      case 'reset-password':
        return 'Set New Password';
      default:
        return 'Authentication';
    }
  };

  return (
    <Modal
      isOpen={authModal.isOpen}
      onClose={closeAuthModal}
      title={getTitle()}
      maxWidth="max-w-md"
    >
      {authModal.view === 'signin' && <SignInForm />}
      {authModal.view === 'signup' && <SignUpForm />}
      {authModal.view === 'verify-email' && <VerifyEmailForm />}
      {authModal.view === 'forgot-password' && <ForgotPasswordForm />}
      {authModal.view === 'reset-password' && <ResetPasswordForm />}
    </Modal>
  );
};
