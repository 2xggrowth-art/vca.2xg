/**
 * Analysis Data Grid - Notion-Style Horizontal Scroll Table
 *
 * High-density data grid for viewing all analyses with:
 * - Horizontal scrolling for many columns
 * - Status badges for dropdown values
 * - Clickable rows to open side drawer
 * - Compact, clean rows
 */

import { EyeIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import type { ViralAnalysis } from '@/types';

interface AnalysisDataGridProps {
  analyses: ViralAnalysis[];
  isLoading?: boolean;
  onRowClick: (analysis: ViralAnalysis) => void;
  onApprove?: (analysis: ViralAnalysis) => void;
  onReject?: (analysis: ViralAnalysis) => void;
  showActions?: boolean;
}

// Status badge colors
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Production stage badge colors
const getStageBadge = (stage?: string) => {
  if (!stage) return 'bg-gray-100 text-gray-600 border-gray-200';

  const stageColors: Record<string, string> = {
    NOT_STARTED: 'bg-gray-100 text-gray-600 border-gray-200',
    PRE_PRODUCTION: 'bg-blue-100 text-blue-800 border-blue-200',
    SHOOTING: 'bg-orange-100 text-orange-800 border-orange-200',
    SHOOT_REVIEW: 'bg-amber-100 text-amber-800 border-amber-200',
    EDITING: 'bg-purple-100 text-purple-800 border-purple-200',
    EDIT_REVIEW: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    FINAL_REVIEW: 'bg-pink-100 text-pink-800 border-pink-200',
    READY_TO_POST: 'bg-teal-100 text-teal-800 border-teal-200',
    POSTED: 'bg-green-100 text-green-800 border-green-200',
  };

  return stageColors[stage] || 'bg-gray-100 text-gray-600 border-gray-200';
};

// Shoot possibility badge
const getShootBadge = (possibility?: number) => {
  if (!possibility) return null;

  const colors: Record<number, string> = {
    25: 'bg-red-100 text-red-700 border-red-200',
    50: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    75: 'bg-blue-100 text-blue-700 border-blue-200',
    100: 'bg-green-100 text-green-700 border-green-200',
  };

  return colors[possibility] || 'bg-gray-100 text-gray-600 border-gray-200';
};

// Truncate text helper
const truncate = (text: string | undefined, maxLength: number) => {
  if (!text) return '-';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

export default function AnalysisDataGrid({
  analyses,
  isLoading,
  onRowClick,
  onApprove,
  onReject,
  showActions = true,
}: AnalysisDataGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading analyses...</span>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <div className="text-gray-400 mb-2">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900">No analyses found</h3>
        <p className="text-sm text-gray-500 mt-1">No analyses match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Horizontal Scroll Container */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                Content ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Hook
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Target Emotion
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Expected Outcome
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Shoot %
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                People
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Stage
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Score
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Submitted
              </th>
              {showActions && (
                <th className="sticky right-0 z-10 bg-gray-50 px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap border-l border-gray-200">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {analyses.map((analysis) => (
              <tr
                key={analysis.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onRowClick(analysis)}
              >
                {/* Content ID - Sticky */}
                <td className="sticky left-0 z-10 bg-white hover:bg-gray-50 px-4 py-3 whitespace-nowrap border-r border-gray-100">
                  <div className="flex items-center">
                    <span className="text-sm font-mono font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                      {analysis.content_id || 'N/A'}
                    </span>
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(analysis.status)}`}>
                    {analysis.status}
                  </span>
                  {analysis.rejection_count !== undefined && analysis.rejection_count > 0 && (
                    <span className="ml-1 text-xs text-red-600">({analysis.rejection_count}x)</span>
                  )}
                </td>

                {/* Hook */}
                <td className="px-4 py-3 max-w-[200px]">
                  <span className="text-sm text-gray-900 block truncate" title={analysis.hook}>
                    {truncate(analysis.hook, 40)}
                  </span>
                </td>

                {/* Target Emotion */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {analysis.target_emotion ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                      {analysis.target_emotion}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>

                {/* Expected Outcome */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {analysis.expected_outcome ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                      {analysis.expected_outcome}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>

                {/* Shoot Possibility */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {analysis.shoot_possibility ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${getShootBadge(analysis.shoot_possibility)}`}>
                      {analysis.shoot_possibility}%
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>

                {/* Total People */}
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <span className="text-sm font-medium text-gray-900">
                    {analysis.total_people_involved || '-'}
                  </span>
                </td>

                {/* Production Stage */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {analysis.production_stage ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStageBadge(analysis.production_stage)}`}>
                      {analysis.production_stage.replace(/_/g, ' ')}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>

                {/* Overall Score */}
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  {analysis.overall_score ? (
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                      analysis.overall_score >= 7
                        ? 'bg-green-100 text-green-800'
                        : analysis.overall_score >= 5
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {analysis.overall_score}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>

                {/* Submitted Date */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-xs text-gray-500">
                    {new Date(analysis.created_at).toLocaleDateString()}
                  </span>
                </td>

                {/* Actions - Sticky */}
                {showActions && (
                  <td className="sticky right-0 z-10 bg-white hover:bg-gray-50 px-4 py-3 whitespace-nowrap border-l border-gray-100">
                    <div className="flex items-center justify-center space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onRowClick(analysis)}
                        className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition"
                        title="View Details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      {analysis.status === 'PENDING' && onApprove && (
                        <button
                          onClick={() => onApprove(analysis)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition"
                          title="Approve"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                        </button>
                      )}
                      {analysis.status === 'PENDING' && onReject && (
                        <button
                          onClick={() => onReject(analysis)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                          title="Reject"
                        >
                          <XCircleIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with count */}
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Showing {analyses.length} {analyses.length === 1 ? 'analysis' : 'analyses'}
        </p>
      </div>
    </div>
  );
}
