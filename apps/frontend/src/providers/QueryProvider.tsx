'use client';

import { SWRConfig } from 'swr';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 5000,
        errorRetryCount: 3,
      }}
    >
      {children}
    </SWRConfig>
  );
}
