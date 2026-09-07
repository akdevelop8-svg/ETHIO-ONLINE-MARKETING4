import React from 'react';
import { 
  PackageOpen, 
  Loader2, 
  AlertOctagon, 
  WifiOff, 
  Lock, 
  ShieldAlert, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { Button } from './Button';

// Standard Empty State
export const EmptyState: React.FC<{
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}> = ({
  title = "No listings found",
  description = "Try adjusting your filters or search keywords.",
  icon,
  actionText,
  onAction
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center bg-[#090C14]/50 border border-slate-800/80 rounded-2xl my-4">
    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
      {icon || <PackageOpen className="w-7 h-7" />}
    </div>
    <h4 className="text-base font-bold text-slate-100 mb-1">{title}</h4>
    <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-5 leading-relaxed">{description}</p>
    {actionText && onAction && (
      <Button variant="primary" size="sm" onClick={onAction}>
        {actionText}
      </Button>
    )}
  </div>
);

// Standard Loading State
export const LoadingState: React.FC<{ label?: string }> = ({ label = "Loading data..." }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center my-6">
    <div className="relative">
      <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-400 animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-indigo-400 animate-pulse" />
      </div>
    </div>
    <p className="text-xs sm:text-sm text-slate-400 mt-4 font-medium tracking-wide animate-pulse">{label}</p>
  </div>
);

// Standard Error State
export const ErrorState: React.FC<{
  title?: string;
  description?: string;
  onRetry?: () => void;
}> = ({
  title = "Something went wrong",
  description = "An error occurred while loading this resource. Please try again.",
  onRetry
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center bg-red-950/20 border border-red-900/40 rounded-2xl my-4">
    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
      <AlertOctagon className="w-7 h-7" />
    </div>
    <h4 className="text-base font-bold text-slate-100 mb-1">{title}</h4>
    <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-5 leading-relaxed">{description}</p>
    {onRetry && (
      <Button variant="danger" size="sm" onClick={onRetry}>
        Try Again
      </Button>
    )}
  </div>
);

// Network Failure State
export const NetworkFailureState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl my-4">
    <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
      <WifiOff className="w-7 h-7" />
    </div>
    <h4 className="text-base font-bold text-slate-100 mb-1">Network Connection Lost</h4>
    <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-5 leading-relaxed">
      Unable to connect to Ethiopian payment gateway and marketplace servers. Please check your internet connection.
    </p>
    {onRetry && (
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Reconnect
      </Button>
    )}
  </div>
);

// Unauthorized State
export const UnauthorizedState: React.FC<{ onSignIn?: () => void }> = ({ onSignIn }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center bg-[#090C14] border border-slate-800 rounded-2xl my-4">
    <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
      <Lock className="w-7 h-7" />
    </div>
    <h4 className="text-base font-bold text-slate-100 mb-1">Authentication Required</h4>
    <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-5 leading-relaxed">
      You must be registered and signed in to perform this marketplace action.
    </p>
    {onSignIn && (
      <Button variant="primary" size="sm" onClick={onSignIn}>
        Sign In / Register
      </Button>
    )}
  </div>
);

// Forbidden / RBAC State
export const ForbiddenState: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-8 text-center bg-rose-950/20 border border-rose-900/30 rounded-2xl my-4">
    <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
      <ShieldAlert className="w-7 h-7" />
    </div>
    <h4 className="text-base font-bold text-slate-100 mb-1">Access Restricted</h4>
    <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-2 leading-relaxed">
      Only authorized administrators and verified moderators can access this operation.
    </p>
  </div>
);

// Success State
export const SuccessState: React.FC<{
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}> = ({
  title = "Action Completed Successfully",
  description = "Your request has been verified and processed securely.",
  actionText,
  onAction
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center bg-emerald-950/20 border border-emerald-900/40 rounded-2xl my-4">
    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
      <CheckCircle2 className="w-7 h-7" />
    </div>
    <h4 className="text-base font-bold text-slate-100 mb-1">{title}</h4>
    <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-5 leading-relaxed">{description}</p>
    {actionText && onAction && (
      <Button variant="success" size="sm" onClick={onAction}>
        {actionText}
      </Button>
    )}
  </div>
);

// Pending State
export const PendingState: React.FC<{
  title?: string;
  description?: string;
}> = ({
  title = "Verification in Progress",
  description = "Our administrative team is reviewing your ownership proof screenshot (within 72 hours)."
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center bg-amber-950/20 border border-amber-900/40 rounded-2xl my-4">
    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
      <Clock className="w-7 h-7" />
    </div>
    <h4 className="text-base font-bold text-slate-100 mb-1">{title}</h4>
    <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">{description}</p>
  </div>
);
