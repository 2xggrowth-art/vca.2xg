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
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState<'set' | 'clear'>('set');

  if (!isOpen || !user) return null;

  const handleClose = () => {
    setPin('');
    setMode('set');
    onClose();
  };

  const handleSubmit = async () => {
    if (mode === 'set') {
      if (!/^\d{4}$/.test(pin)) {
        toast.error('PIN must be exactly 4 digits');
        return;
      }
    }

    setIsLoading(true);
    try {
      await adminService.resetUserPin(user.id, mode === 'set' ? pin : undefined);
      toast.success(
        mode === 'set'
          ? 'PIN set successfully'
          : 'PIN cleared. User will set a new PIN on next login.'
      );
      setPin('');
      setMode('set');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update PIN');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Key className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Manage PIN</h3>
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

        <div className="p-4 space-y-4">
          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            <button
              onClick={() => setMode('set')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                mode === 'set'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Set PIN
            </button>
            <button
              onClick={() => setMode('clear')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                mode === 'clear'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Clear PIN
            </button>
          </div>

          {mode === 'set' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                4-Digit PIN
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Enter 4-digit PIN"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                This PIN will be set for <span className="font-medium">{user.email}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              This will clear the PIN for <span className="font-medium">{user.email}</span>.
              They will need to sign in with Google and set a new 4-digit PIN.
            </p>
          )}
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-100">
          <Button variant="outline" className="flex-1" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={mode === 'set' && pin.length !== 4}
          >
            {mode === 'set' ? 'Set PIN' : 'Clear PIN'}
          </Button>
        </div>
      </div>
    </div>
  );
}
