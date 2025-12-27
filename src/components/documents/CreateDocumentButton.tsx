'use client'

import Link from 'next/link'

export function CreateDocumentButton() {
  return (
    <Link
      href="/write/new"
      className="inline-flex items-center gap-2 h-10 px-4 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition-opacity"
    >
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
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
      New Document
    </Link>
  )
}
