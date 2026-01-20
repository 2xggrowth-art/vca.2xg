import { useState } from 'react';
import { XMarkIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface BulkRejectModalProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onReject: (feedback: string) => void;
  isLoading?: boolean;
}

export default function BulkRejectModal({
  isOpen,
  selectedCount,
  onClose,
  onReject,
  isLoading = false,
}: BulkRejectModalProps) {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedback.trim()) {
      alert('Please provide feedback for rejection');
      return;
    }

    onReject(feedback.trim());
  };

  const handleClose = () => {
    setFeedback('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        ></div>

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-pink-600 px-6 py-5 rounded-t-xl">
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <XCircleIcon className="w-7 h-7 text-white mr-3" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Bulk Reject Scripts</h2>
                  <p className="text-red-100 text-sm mt-1">
                    Reject {selectedCount} selected script{selectedCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-white hover:text-gray-200 transition"
                disabled={isLoading}
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">You are about to reject {selectedCount} scripts</p>
                  <p>All selected scripts will receive the same feedback and be sent back to creators for revision.</p>
                </div>
              </div>
            </div>

            {/* Feedback */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Rejection Reason / Feedback <span className="text-red-600">*</span>
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={5}
                placeholder="Explain why you're rejecting these scripts and what needs to be improved..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                This feedback will be sent to all creators of the selected scripts.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !feedback.trim()}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition flex items-center"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircleIcon className="w-5 h-5 mr-2" />
                    Reject {selectedCount} Script{selectedCount !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
