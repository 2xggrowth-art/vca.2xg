/**
 * Simplified Analysis Wizard
 *
 * A single-step wizard for creating viral content analyses.
 * Streamlined for better mobile UX.
 */

import { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import WizardLevel1 from './WizardLevel1';
import type { AnalysisFormData, ViralAnalysis } from '@/types';

interface MultiStepAnalysisWizardProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with form data and a clearDraft callback. Parent should call clearDraft() on success */
  onSubmit: (data: AnalysisFormData, clearDraft: () => void) => void;
  isSubmitting?: boolean;
  editingAnalysis?: ViralAnalysis | null;
  initialFormData: AnalysisFormData;
}

const DRAFT_STORAGE_KEY = 'viral-analysis-draft';

// Helper to serialize form data (excluding Blobs)
const serializeFormData = (data: AnalysisFormData): string => {
  const serializable = { ...data };
  // Remove Blob objects as they can't be serialized
  delete (serializable as any).hookVoiceNoteBlob;
  delete (serializable as any).whyViralVoiceNoteBlob;
  delete (serializable as any).audioNoteBlob;
  return JSON.stringify(serializable);
};

// Helper to load draft from localStorage
const loadDraft = (): Partial<AnalysisFormData> | null => {
  try {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load draft:', e);
  }
  return null;
};

// Helper to save draft to localStorage
const saveDraft = (data: AnalysisFormData) => {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, serializeFormData(data));
  } catch (e) {
    console.error('Failed to save draft:', e);
  }
};

// Helper to clear draft from localStorage
const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear draft:', e);
  }
};

export default function MultiStepAnalysisWizard({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  editingAnalysis,
  initialFormData,
}: MultiStepAnalysisWizardProps) {
  const [formData, setFormData] = useState<AnalysisFormData>(initialFormData);
  const [hasDraft, setHasDraft] = useState(false);

  // Check for saved draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft && !editingAnalysis) {
      setHasDraft(true);
    }
  }, [editingAnalysis]);

  // Reset form when modal opens or initialFormData changes
  useEffect(() => {
    if (isOpen) {
      // If editing, use the editing data
      if (editingAnalysis) {
        setFormData(initialFormData);
        clearDraft();
        setHasDraft(false);
      } else {
        // Check for saved draft
        const draft = loadDraft();
        if (draft && Object.keys(draft).some(key => draft[key as keyof typeof draft])) {
          setFormData({ ...initialFormData, ...draft });
        } else {
          setFormData(initialFormData);
        }
      }
    }
  }, [isOpen, initialFormData, editingAnalysis]);

  // Save draft whenever form data changes
  useEffect(() => {
    if (isOpen && !editingAnalysis) {
      // Only save if there's meaningful data
      const hasData = formData.hook || formData.referenceUrl || formData.title;
      if (hasData) {
        saveDraft(formData);
        setHasDraft(true);
      }
    }
  }, [formData, isOpen, editingAnalysis]);

  const handleClose = () => {
    onClose();
  };

  // Clear draft and reset form
  const handleClearDraft = () => {
    clearDraft();
    setHasDraft(false);
    setFormData(initialFormData);
  };

  const handleFormChange = (updates: Partial<AnalysisFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = () => {
    // Pass the clearDraft callback to the parent
    // Parent should call it only after successful submission
    const handleClearDraftOnSuccess = () => {
      clearDraft();
      setHasDraft(false);
    };
    onSubmit(formData, handleClearDraftOnSuccess);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-0 md:p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity hidden md:block"
          onClick={handleClose}
        />

        {/* Modal - Full screen on mobile, centered on desktop */}
        <div className="relative bg-white md:rounded-2xl shadow-2xl w-full md:max-w-2xl h-full md:h-auto md:max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 md:px-6 py-4 md:rounded-t-2xl safe-area-top">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingAnalysis ? 'Edit Script' : 'New Script'}
                </h2>
                {hasDraft && !editingAnalysis && (
                  <button
                    type="button"
                    onClick={handleClearDraft}
                    className="text-sm text-orange-600 hover:text-orange-700 underline mt-1"
                  >
                    Clear draft
                  </button>
                )}
              </div>
              <button
                onClick={handleClose}
                className="p-2.5 hover:bg-gray-100 rounded-xl transition"
              >
                <XMarkIcon className="w-6 h-6 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto overscroll-y-contain px-4 md:px-6 py-5">
            <WizardLevel1 formData={formData} onChange={handleFormChange} />
          </div>

          {/* Footer - Extra padding on mobile for bottom nav */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 md:px-6 py-4 pb-24 md:pb-4 md:rounded-b-2xl safe-area-bottom">
            <div className="flex items-center justify-between gap-3">
              {/* Cancel Button */}
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-3 min-h-[48px] border-2 border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 font-semibold transition text-base"
              >
                Cancel
              </button>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 max-w-xs inline-flex items-center justify-center px-6 py-3 min-h-[48px] bg-primary-600 text-white rounded-xl hover:bg-primary-700 active:bg-primary-800 font-semibold transition text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-5 h-5 mr-2" />
                    {editingAnalysis ? 'Update' : 'Submit'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
