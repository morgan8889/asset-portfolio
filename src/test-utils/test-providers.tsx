import { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'

interface TestProvidersProps {
  children: ReactNode
}

export function TestProviders({ children }: TestProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      {children}
    </ThemeProvider>
  )
}