'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ErrorBoundary } from './error-boundary';
import { NetworkStatus } from './network-status';
import { ThemeProvider } from './theme-provider';
import { CityProvider } from '@/context/city-context';
import { FavoritesProvider } from '@/context/favorites-context';
import { RecentsProvider } from '@/context/recents-context';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Don't refetch on window focus by default
            refetchOnWindowFocus: false,
            // Keep data fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Retry failed requests once
            retry: 1,
            // Network error handling
            networkMode: 'online',
          },
          mutations: {
            // Retry mutations once on failure
            retry: 1,
            networkMode: 'online',
          },
        },
      })
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <CityProvider>
          <FavoritesProvider>
            <RecentsProvider>
              <ErrorBoundary>
                {children}
                <NetworkStatus />
              </ErrorBoundary>
            </RecentsProvider>
          </FavoritesProvider>
        </CityProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

