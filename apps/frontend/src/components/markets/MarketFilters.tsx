'use client';

import { clsx } from 'clsx';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

const defaultCategories = [
  { value: '', label: 'All' },
];

const sortOptions = [
  { value: 'volume24hr', label: 'Volume' },
  { value: 'createdAt', label: 'Newest' },
  { value: 'liquidity', label: 'Liquidity' },
];

interface MarketFiltersProps {
  selectedCategory?: string;
  onCategoryChange: (category: string | undefined) => void;
  selectedSort: string;
  onSortChange: (sort: string) => void;
}

export function MarketFilters({ selectedCategory, onCategoryChange, selectedSort, onSortChange }: MarketFiltersProps) {
  const [categories, setCategories] = useState(defaultCategories);

  useEffect(() => {
    apiClient.get<{ categories: string[] }>('/markets/categories').then(res => {
      if (res.categories.length) {
        setCategories([
          { value: '', label: 'All' },
          ...res.categories.map(c => ({
            value: c.toLowerCase(),
            label: c.charAt(0).toUpperCase() + c.slice(1),
          })),
        ]);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onCategoryChange(cat.value || undefined)}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
              selectedCategory === cat.value
                ? 'bg-bg-tertiary text-text-primary border border-border-active'
                : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-text-tertiary">Sort by:</span>
        {sortOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSortChange(opt.value)}
            className={clsx(
              'rounded-md px-2 py-1 text-xs font-medium transition-colors',
              selectedSort === opt.value
                ? 'bg-accent-purple/20 text-accent-purple'
                : 'text-text-tertiary hover:text-text-secondary'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
