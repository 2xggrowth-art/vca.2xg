import { useState, useCallback, useMemo } from 'react';

export interface UseSelectionOptions {
  initialSelectedIds?: string[];
  initialActiveId?: string | null;
}

export interface UseSelectionReturn<T extends { id: string }> {
  // State
  selectedIds: Set<string>;
  activeItemId: string | null;

  // Actions
  select: (id: string) => void;
  deselect: (id: string) => void;
  toggle: (id: string) => void;
  selectAll: (items: T[]) => void;
  deselectAll: () => void;
  setActiveItem: (id: string | null) => void;

  // Computed
  isSelected: (id: string) => boolean;
  isActive: (id: string) => boolean;
  selectedCount: number;
  hasSelection: boolean;
  getSelectedItems: (items: T[]) => T[];
  getActiveItem: (items: T[]) => T | null;
}

export function useSelection<T extends { id: string }>(
  options: UseSelectionOptions = {}
): UseSelectionReturn<T> {
  const { initialSelectedIds = [], initialActiveId = null } = options;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialSelectedIds)
  );
  const [activeItemId, setActiveItemId] = useState<string | null>(initialActiveId);

  // Actions
  const select = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const deselect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const setActiveItem = useCallback((id: string | null) => {
    setActiveItemId(id);
  }, []);

  // Computed helpers
  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const isActive = useCallback(
    (id: string) => activeItemId === id,
    [activeItemId]
  );

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

  const hasSelection = useMemo(() => selectedIds.size > 0, [selectedIds]);

  const getSelectedItems = useCallback(
    (items: T[]) => items.filter((item) => selectedIds.has(item.id)),
    [selectedIds]
  );

  const getActiveItem = useCallback(
    (items: T[]) => items.find((item) => item.id === activeItemId) || null,
    [activeItemId]
  );

  return {
    selectedIds,
    activeItemId,
    select,
    deselect,
    toggle,
    selectAll,
    deselectAll,
    setActiveItem,
    isSelected,
    isActive,
    selectedCount,
    hasSelection,
    getSelectedItems,
    getActiveItem,
  };
}
