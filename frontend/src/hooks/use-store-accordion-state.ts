// ABOUTME: Hook managing accordion expand/collapse state for store-grouped trip items
// ABOUTME: Persists state to localStorage per-trip per-view-context, supports auto-collapse with user override

import { useCallback, useEffect, useRef,useState } from 'react';

type AccordionState = Record<string, boolean>; // storeName -> isExpanded
type ViewContext = 'planning' | 'shopping';

const STORAGE_KEY_PREFIX = 'accordion-';

export function useStoreAccordionState(tripId: string, viewContext: ViewContext, isCompleted: boolean) {
  const storageKey = `${STORAGE_KEY_PREFIX}${tripId}-${viewContext}`;
  const defaultExpanded = viewContext === 'planning'; // planning=expanded, shopping=collapsed

  const [expandedStores, setExpandedStores] = useState<AccordionState>(() => {
    if (isCompleted) return {}; // Completed trips: use defaults
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  });

  // Track which stores the user has manually toggled (ephemeral, not persisted)
  // Use a ref to avoid destabilizing callback identities
  const userOverridesRef = useRef<Set<string>>(new Set());

  // Keep a ref to expandedStores for use in stable callbacks
  const expandedStoresRef = useRef(expandedStores);
  useEffect(() => {
    expandedStoresRef.current = expandedStores;
  }, [expandedStores]);

  // Persist to localStorage (only for non-completed trips)
  useEffect(() => {
    if (!isCompleted) {
      localStorage.setItem(storageKey, JSON.stringify(expandedStores));
    }
  }, [expandedStores, storageKey, isCompleted]);

  const toggleStore = useCallback((storeName: string) => {
    userOverridesRef.current.add(storeName);
    setExpandedStores(prev => ({
      ...prev,
      [storeName]: !(prev[storeName] ?? defaultExpanded),
    }));
  }, [defaultExpanded]);

  const isExpanded = useCallback((storeName: string) => {
    return expandedStores[storeName] ?? defaultExpanded;
  }, [expandedStores, defaultExpanded]);

  // Auto-collapse when all items in a group are checked (only if user hasn't overridden)
  // Uses refs for expandedStores and userOverrides to keep callback identity stable
  // and avoid re-triggering the calling useEffect
  const autoCollapseIfAllChecked = useCallback((storeName: string, allChecked: boolean) => {
    if (allChecked && !userOverridesRef.current.has(storeName) && (expandedStoresRef.current[storeName] ?? defaultExpanded)) {
      setExpandedStores(prev => ({ ...prev, [storeName]: false }));
    }
  }, [defaultExpanded]);

  // Cleanup: remove localStorage entries for both view contexts (call on trip completion)
  const cleanup = useCallback(() => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${tripId}-planning`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${tripId}-shopping`);
  }, [tripId]);

  return { isExpanded, toggleStore, autoCollapseIfAllChecked, cleanup };
}
