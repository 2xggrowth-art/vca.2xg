import { useState } from 'react';
import { X, Key } from 'lucide-react';
import { Button } from '@/components/ui';
import { adminService } from '@/services/adminService';
import toast from 'react-hot-toast';

interface ResetPinModalProps {
  isOpen: boolean;
  user: {
    id: string;
    email: string;
    full_name?: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ResetPinModal({
  isOpen,
  user,
  onClose,
  onSuccess,
}: ResetPinModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !user) return null;

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      await adminService.resetUserPin(user.id);
      toast.success('PIN reset. User will set a new PIN on next login.');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset PIN');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Key className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Reset PIN</h3>
              <p className="text-sm text-gray-500 truncate max-w-[200px]">
                {user.full_name || user.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            This will clear the PIN for <span className="font-medium">{user.email}</span>.
            They will need to sign in with Google and set a new 4-digit PIN.
          </p>
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-100">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSubmit} isLoading={isLoading}>
            Reset PIN
          </Button>
        </div>
      </div>
    </div>
  );
}
