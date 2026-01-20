import { useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface SplitViewLayoutProps {
  // Left panel content (list/table)
  masterContent: ReactNode;
  // Right panel content (details)
  detailContent: ReactNode | null;
  // Whether an item is selected for detail view
  hasActiveItem: boolean;
  // Callback when detail panel is closed on mobile
  onCloseDetail?: () => void;
  // Optional: bulk action toolbar (shown above master list when items selected)
  bulkActionToolbar?: ReactNode;
  // Optional: custom empty state for detail panel
  emptyDetailContent?: ReactNode;
  // Optional: custom class for master panel
  masterClassName?: string;
  // Optional: custom class for detail panel
  detailClassName?: string;
}

export function SplitViewLayout({
  masterContent,
  detailContent,
  hasActiveItem,
  onCloseDetail,
  bulkActionToolbar,
  emptyDetailContent: _emptyDetailContent,
  masterClassName = '',
  detailClassName = '',
}: SplitViewLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // Check for mobile breakpoint
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show mobile drawer when active item changes
  useEffect(() => {
    if (isMobile && hasActiveItem) {
      setShowMobileDetail(true);
    }
  }, [isMobile, hasActiveItem]);

  const handleCloseMobileDetail = () => {
    setShowMobileDetail(false);
    onCloseDetail?.();
  };

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (showMobileDetail) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMobileDetail]);

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">
      {/* Master Panel - Left Side */}
      <div
        className={`
          flex-shrink-0 flex flex-col bg-white
          ${hasActiveItem && !isMobile ? 'border-r border-gray-200 w-[55%] min-w-[450px] max-w-[750px]' : 'w-full'}
          ${isMobile ? 'w-full' : ''}
          ${masterClassName}
        `}
      >
        {/* Bulk Action Toolbar (shown when items selected) */}
        {bulkActionToolbar && (
          <div className="flex-shrink-0">{bulkActionToolbar}</div>
        )}

        {/* Scrollable Master Content */}
        <div className="flex-1 overflow-auto">{masterContent}</div>
      </div>

      {/* Detail Panel - Right Side (Desktop) - Only show when item is selected */}
      {!isMobile && hasActiveItem && detailContent && (
        <div
          className={`
            flex-1 flex flex-col overflow-hidden
            ${detailClassName}
          `}
        >
          <div className="flex-1 overflow-auto">{detailContent}</div>
        </div>
      )}

      {/* Detail Panel - Mobile Drawer */}
      <AnimatePresence>
        {isMobile && showMobileDetail && hasActiveItem && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={handleCloseMobileDetail}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed inset-y-0 right-0 w-full bg-white shadow-xl z-50 flex flex-col"
            >
              {/* Mobile Drawer Header */}
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">Details</h3>
                <button
                  onClick={handleCloseMobileDetail}
                  className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-auto">{detailContent}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
