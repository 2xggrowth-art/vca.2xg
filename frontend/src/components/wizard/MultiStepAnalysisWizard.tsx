/**
 * Multi-Step Analysis Wizard
 *
 * A 3-level wizard for creating viral content analyses:
 * - Level 1: Easy (Basic Info)
 * - Level 2: Advanced (Details & Tags)
 * - Level 3: Hook Study (Final Details)
 */

import { useState } from 'react';
import { XMarkIcon, ArrowLeftIcon, ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import WizardProgress from './WizardProgress';
import WizardLevel1 from './WizardLevel1';
import WizardLevel2 from './WizardLevel2';
import WizardLevel3 from './WizardLevel3';
import type { AnalysisFormData, ViralAnalysis } from '@/types';

interface MultiStepAnalysisWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AnalysisFormData) => void;
  isSubmitting?: boolean;
  editingAnalysis?: ViralAnalysis | null;
  initialFormData: AnalysisFormData;
}

type WizardLevel = 1 | 2 | 3;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

export default function MultiStepAnalysisWizard({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  editingAnalysis,
  initialFormData,
}: MultiStepAnalysisWizardProps) {
  const [currentLevel, setCurrentLevel] = useState<WizardLevel>(1);
  const [direction, setDirection] = useState(0);
  const [formData, setFormData] = useState<AnalysisFormData>(initialFormData);

  // Reset form when modal opens/closes or editing analysis changes
  const handleClose = () => {
    setCurrentLevel(1);
    setDirection(0);
    onClose();
  };

  const handleFormChange = (updates: Partial<AnalysisFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const goToLevel = (level: WizardLevel) => {
    setDirection(level > currentLevel ? 1 : -1);
    setCurrentLevel(level);
  };

  const goNext = () => {
    if (currentLevel < 3) {
      setDirection(1);
      setCurrentLevel((prev) => (prev + 1) as WizardLevel);
    }
  };

  const goBack = () => {
    if (currentLevel > 1) {
      setDirection(-1);
      setCurrentLevel((prev) => (prev - 1) as WizardLevel);
    }
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3 rounded-t-2xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingAnalysis ? 'Edit Analysis' : 'New Viral Content Analysis'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Complete all three levels to submit your analysis
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Progress Indicator */}
            <WizardProgress currentLevel={currentLevel} onLevelClick={goToLevel} />
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentLevel}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'tween', duration: 0.3 }}
              >
                {currentLevel === 1 && (
                  <WizardLevel1 formData={formData} onChange={handleFormChange} />
                )}
                {currentLevel === 2 && (
                  <WizardLevel2 formData={formData} onChange={handleFormChange} />
                )}
                {currentLevel === 3 && (
                  <WizardLevel3 formData={formData} onChange={handleFormChange} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Navigation */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-3 rounded-b-2xl">
            <div className="flex items-center justify-between">
              {/* Back Button */}
              <div>
                {currentLevel > 1 ? (
                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-medium transition"
                  >
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Back
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-medium transition"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {/* Level Indicator */}
              <div className="text-sm text-gray-500">
                Level {currentLevel} of 3
              </div>

              {/* Next/Submit Button */}
              <div>
                {currentLevel < 3 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition"
                  >
                    Next
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                        <CheckIcon className="w-4 h-4 mr-2" />
                        {editingAnalysis ? 'Update Analysis' : 'Submit Analysis'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
