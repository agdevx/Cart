// ABOUTME: Collapsible accordion for grouping trip items by store
// ABOUTME: Shows store name, item count, optional checked count, and chevron toggle

import { ChevronDown } from 'lucide-react';

type StoreAccordionProps = {
  storeName: string;
  isExpanded: boolean;
  onToggle: () => void;
  itemCount: number;
  checkedCount?: number;
  children: React.ReactNode;
};

export function StoreAccordion({
  storeName,
  isExpanded,
  onToggle,
  itemCount,
  checkedCount,
  children,
}: StoreAccordionProps) {
  return (
    <div className="mb-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-bg-warm rounded-xl"
      >
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-navy">
            {storeName}
          </span>
          <span className="text-sm text-text-secondary">
            {checkedCount !== undefined
              ? `${checkedCount}/${itemCount}`
              : `${itemCount}`}
          </span>
        </div>
        <ChevronDown
          size={18}
          className={`text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>
      {isExpanded && (
        <div className="mt-1">
          {children}
        </div>
      )}
    </div>
  );
}
