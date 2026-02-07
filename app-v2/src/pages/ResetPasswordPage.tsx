import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Key, Check, AlertCircle } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { auth } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      toast.error('Invalid reset link');
      navigate('/forgot-password');
    }
  }, [token, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Both fields are required');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('Invalid reset link');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await auth.resetPassword({ token, newPassword });
      if (error) {
        setError(error.message);
        toast.error(error.message);
      } else {
        setIsSuccess(true);
        toast.success('Password reset successfully');
      }
    } catch {
      setError('Failed to reset password');
      toast.error('Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="app-container">
        {/* Header with gradient */}
        <div className="bg-gradient-primary px-6 pt-16 pb-12 text-white text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <Key className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Password Reset</h1>
          <p className="text-white/80 text-sm">Your password has been updated</p>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-8 -mt-6 bg-white rounded-t-3xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Success!</h2>
            <p className="text-gray-500 text-sm">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
          </div>

          <Button
            fullWidth
            size="lg"
            onClick={() => navigate('/login')}
          >
            Sign In
          </Button>
        </div>

        {/* Bottom safe area */}
        <div className="h-safe-bottom bg-white" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="app-container">
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Invalid Link</h2>
            <p className="text-gray-500 text-sm mb-6">
              This password reset link is invalid or has expired.
            </p>
            <Button onClick={() => navigate('/forgot-password')}>
              Request New Link
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header with gradient */}
      <div className="bg-gradient-primary px-6 pt-16 pb-12 text-white text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
          <Key className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold mb-1">Reset Password</h1>
        <p className="text-white/80 text-sm">Create a new password</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-8 -mt-6 bg-white rounded-t-3xl">
        <h2 className="text-xl font-bold text-gray-900 mb-1">New Password</h2>
        <p className="text-gray-500 text-sm mb-8">
          Please enter your new password below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <Input
              type={showNewPassword ? 'text' : 'password'}
              label="New Password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="absolute right-4 top-[38px] text-gray-400"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              label="Confirm Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="absolute right-4 top-[38px] text-gray-400"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <p className="text-xs text-gray-500">
            Password must be at least 8 characters
          </p>

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-sm text-danger">
              {error}
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isLoading}
          >
            Reset Password
          </Button>
        </form>
      </div>

      {/* Bottom safe area */}
      <div className="h-safe-bottom bg-white" />
    </div>
  );
}
