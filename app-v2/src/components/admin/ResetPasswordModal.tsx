import { useState } from 'react';
import { X, Copy, RefreshCw, Eye, EyeOff, Check, Key } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { adminService } from '@/services/adminService';
import toast from 'react-hot-toast';

interface ResetPasswordModalProps {
  isOpen: boolean;
  user: {
    id: string;
    email: string;
    full_name?: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ResetPasswordModal({
  isOpen,
  user,
  onClose,
  onSuccess,
}: ResetPasswordModalProps) {
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !user) return null;

  const generatePassword = () => {
    // Generate a random password: 8 chars with letters, numbers, and special chars
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%&*';
    const all = lowercase + uppercase + numbers + special;

    let password = '';
    // Ensure at least one of each type
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = 4; i < 12; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    password = password.split('').sort(() => Math.random() - 0.5).join('');

    setTemporaryPassword(password);
    setCopied(false);
  };

  const copyToClipboard = async () => {
    if (!temporaryPassword) return;

    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleSubmit = async () => {
    if (!temporaryPassword) {
      toast.error('Please enter or generate a password');
      return;
    }

    if (temporaryPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      await adminService.resetUserPassword(user.id, temporaryPassword);
      toast.success('Password reset successfully');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTemporaryPassword('');
    setShowPassword(false);
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Key className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Reset Password</h3>
              <p className="text-sm text-gray-500 truncate max-w-[200px]">
                {user.full_name || user.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Set a temporary password for <span className="font-medium">{user.email}</span>.
            Share this password securely with the user.
          </p>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temporary Password
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={temporaryPassword}
                  onChange={(e) => {
                    setTemporaryPassword(e.target.value);
                    setCopied(false);
                  }}
                  placeholder="Enter or generate password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={generatePassword}
                className="flex items-center justify-center w-12 h-[52px] bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                title="Generate Password"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Copy Button */}
          {temporaryPassword && (
            <button
              onClick={copyToClipboard}
              className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy to Clipboard
                </>
              )}
            </button>
          )}

          <p className="text-xs text-gray-500">
            The user will need to use this password to log in.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-100">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!temporaryPassword}
          >
            Reset Password
          </Button>
        </div>
      </div>
    </div>
  );
}
