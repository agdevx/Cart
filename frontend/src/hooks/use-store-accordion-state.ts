// ABOUTME: Hook managing accordion expand/collapse state for store-grouped trip items
// ABOUTME: Persists state to localStorage per-trip and supports auto-collapse when all items checked

import { useState, useEffect, useCallback } from 'react';

type AccordionState = Record<string, boolean>; // storeName -> isExpanded

const STORAGE_KEY_PREFIX = 'trip-accordion-';

export function useStoreAccordionState(tripId: string, isCompleted: boolean) {
  const storageKey = `${STORAGE_KEY_PREFIX}${tripId}`;

  const [expandedStores, setExpandedStores] = useState<AccordionState>(() => {
    if (isCompleted) return {}; // All collapsed for completed trips
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  });

  // Persist to localStorage (only for non-completed trips)
  useEffect(() => {
    if (!isCompleted) {
      localStorage.setItem(storageKey, JSON.stringify(expandedStores));
    }
  }, [expandedStores, storageKey, isCompleted]);

  const toggleStore = useCallback((storeName: string) => {
    setExpandedStores(prev => ({
      ...prev,
      [storeName]: !prev[storeName],
    }));
  }, []);

  const isExpanded = useCallback((storeName: string) => {
    return expandedStores[storeName] ?? false; // Default: collapsed
  }, [expandedStores]);

  // Auto-collapse when all items in a group are checked
  const autoCollapseIfAllChecked = useCallback((storeName: string, allChecked: boolean) => {
    if (allChecked && expandedStores[storeName]) {
      setExpandedStores(prev => ({ ...prev, [storeName]: false }));
    }
  }, [expandedStores]);

  // Cleanup: remove localStorage entry (call on trip completion)
  const cleanup = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { isExpanded, toggleStore, autoCollapseIfAllChecked, cleanup };
}
