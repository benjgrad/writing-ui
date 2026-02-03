'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { HomeGoalsSection } from '@/components/home/HomeGoalsSection'
import { HomeWordCloudSection } from '@/components/home/HomeWordCloudSection'
import { HomeGraphSection } from '@/components/home/HomeGraphSection'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { Loading } from '@/components/ui/Loading'
import { Button } from '@/components/ui/Button'

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth()

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <OnboardingFlow>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Writing</h1>
          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-4">
            <Link
              href="/write/new"
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Write
            </Link>
            <Link
              href="/documents"
              className="text-sm text-muted hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Documents
            </Link>
            <Link
              href="/graph"
              className="text-sm text-muted hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <circle cx="4" cy="6" r="2" />
                <circle cx="20" cy="6" r="2" />
                <circle cx="4" cy="18" r="2" />
                <circle cx="20" cy="18" r="2" />
                <line x1="6" y1="6" x2="9" y2="10" />
                <line x1="15" y1="10" x2="18" y2="6" />
                <line x1="6" y1="18" x2="9" y2="14" />
                <line x1="15" y1="14" x2="18" y2="18" />
              </svg>
              Graph
            </Link>
            <span className="text-sm text-muted hidden md:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </nav>
          {/* Mobile nav */}
          <nav className="flex sm:hidden items-center gap-2">
            <Link
              href="/write/new"
              className="inline-flex items-center gap-1 text-sm px-2.5 py-1.5 bg-foreground text-background rounded-lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Write
            </Link>
            <Link href="/documents" className="p-2 text-muted hover:text-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </Link>
            <Link href="/graph" className="p-2 text-muted hover:text-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <circle cx="4" cy="6" r="2" />
                <circle cx="20" cy="6" r="2" />
              </svg>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-xs px-2">
              Sign out
            </Button>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {/* Goals Section */}
        <section className="mb-6 sm:mb-8">
          <HomeGoalsSection />
        </section>

        {/* Word Cloud Section */}
        <section className="mb-6 sm:mb-8">
          <HomeWordCloudSection />
        </section>

        {/* Knowledge Graph Section */}
        <section>
          <HomeGraphSection />
        </section>
      </main>
    </div>
    </OnboardingFlow>
  )
}
