import { Fragment, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  showCloseButton?: boolean;
}

const sizeConfig = {
  sm: 'max-h-[50vh]',
  md: 'max-h-[70vh]',
  lg: 'max-h-[85vh]',
  full: 'max-h-[95vh]',
};

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
}: BottomSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);

  // Handle touch start for swipe-to-dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  // Handle touch move for swipe-to-dismiss
  const handleTouchMove = (e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY;
    const delta = currentY.current - startY.current;

    // Only allow downward swipe when at top of content
    if (contentRef.current && contentRef.current.scrollTop === 0 && delta > 0) {
      // Add some resistance
      const transform = Math.min(delta * 0.5, 200);
      if (contentRef.current.parentElement) {
        contentRef.current.parentElement.style.transform = `translateY(${transform}px)`;
      }
    }
  };

  // Handle touch end for swipe-to-dismiss
  const handleTouchEnd = () => {
    const delta = currentY.current - startY.current;

    // Close if swiped down more than 100px
    if (delta > 100 && contentRef.current?.scrollTop === 0) {
      onClose();
    }

    // Reset transform
    if (contentRef.current?.parentElement) {
      contentRef.current.parentElement.style.transform = '';
    }

    startY.current = 0;
    currentY.current = 0;
  };

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 bg-black/50"
            aria-hidden="true"
          />
        </Transition.Child>

        {/* Sheet Container */}
        <div className="fixed inset-0 flex items-end justify-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="translate-y-full"
            enterTo="translate-y-0"
            leave="ease-in duration-200"
            leaveFrom="translate-y-0"
            leaveTo="translate-y-full"
          >
            <Dialog.Panel
              className={`
                w-full
                bg-white rounded-t-3xl
                shadow-xl
                flex flex-col
                ${sizeConfig[size]}
                transition-transform
              `}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-start justify-between px-4 pb-3 border-b border-gray-100">
                <div className="flex-1">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    {title}
                  </Dialog.Title>
                  {subtitle && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 -m-2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div
                ref={contentRef}
                className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
              >
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="px-4 py-4 border-t border-gray-100 bg-white safe-area-bottom">
                  {footer}
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
