'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useKnowledgeGraph } from '@/hooks/useKnowledgeGraph'
import { KnowledgeGraph } from '@/components/graph/KnowledgeGraph'
import { Loading } from '@/components/ui/Loading'
import { Input } from '@/components/ui/Input'

export function HomeGraphSection() {
  const { data, loading, error, selectedNode, setSelectedNode } = useKnowledgeGraph()
  const [searchQuery, setSearchQuery] = useState('')

  // Filter nodes based on search only (no tag filter in compact mode)
  const filteredData = useMemo(() => {
    let nodes = data.nodes

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      nodes = nodes.filter(node =>
        node.title.toLowerCase().includes(query) ||
        node.content.toLowerCase().includes(query)
      )
    }

    const nodeIds = new Set(nodes.map(n => n.id))
    const links = data.links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id
      const targetId = typeof link.target === 'string' ? link.target : link.target.id
      return nodeIds.has(sourceId) && nodeIds.has(targetId)
    })

    return { nodes, links }
  }, [data, searchQuery])

  if (loading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <Loading />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0]">
        <div className="flex items-center gap-3">
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
            className="text-[#64748b]"
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
          <h3 className="font-medium text-[#1e293b]">Knowledge Graph</h3>
          <span className="text-xs text-[#64748b]">
            {filteredData.nodes.length} notes
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-48">
            <Input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <Link
            href="/graph"
            className="text-sm text-[#6366f1] hover:text-[#4f46e5] transition-colors flex items-center gap-1"
          >
            View full graph
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
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Compact Graph */}
      <div className="relative">
        <KnowledgeGraph
          data={filteredData}
          onNodeClick={setSelectedNode}
          selectedNodeId={selectedNode?.id}
          compact
        />

        {/* Selected node tooltip */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg border border-[#e2e8f0] p-3 z-10">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-[#1e293b] truncate">{selectedNode.title}</h4>
                <p className="text-xs text-[#64748b] mt-1 line-clamp-2">{selectedNode.content}</p>
                {selectedNode.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedNode.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs bg-[#f1f5f9] text-[#64748b] rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {selectedNode.tags.length > 3 && (
                      <span className="text-xs text-[#64748b]">
                        +{selectedNode.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="ml-2 p-1 text-[#94a3b8] hover:text-[#64748b] transition-colors"
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
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
