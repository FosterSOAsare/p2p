import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../libs/queryClient'
import { SeoProvider } from '../ui/Seo'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Inside the router: page metadata is resolved from the pathname. */}
        <SeoProvider>{children}</SeoProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
