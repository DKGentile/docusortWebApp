import { useEffect, useRef, useState } from 'react'
import { SparklesIcon, DocumentArrowDownIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import MessageBubble from './MessageBubble'
import type { ChatMessage, GeneratePnlResponse } from '../types'

interface ChatProps {
  messages: ChatMessage[]
  isLoading: boolean
  isSending: boolean
  onSend: (prompt: string) => Promise<void>
  activeDocumentName?: string | null
  onGeneratePnl: (property: string) => Promise<GeneratePnlResponse | void>
  pnlResult: GeneratePnlResponse | null
  pnlError?: string | null
  isGeneratingPnl: boolean
}

const Chat: React.FC<ChatProps> = ({
  messages,
  isLoading,
  isSending,
  onSend,
  activeDocumentName,
  onGeneratePnl,
  pnlResult,
  pnlError,
  isGeneratingPnl
}) => {
  const [prompt, setPrompt] = useState('')
  const [propertyName, setPropertyName] = useState('')
  const [showPnlForm, setShowPnlForm] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = scrollRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages, pnlResult])

  const handleSubmit = async () => {
    const trimmed = prompt.trim()
    if (!trimmed) return
    setPrompt('')
    await onSend(trimmed)
  }

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (!isSending) {
        void handleSubmit()
      }
    }
  }

  const handleGeneratePnl = async () => {
    const name = propertyName.trim()
    if (!name) return
    await onGeneratePnl(name)
    setShowPnlForm(false)
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white/80 px-8 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">DocuSort Workspace</h1>
            <p className="mt-1 text-sm text-slate-500">
              Ask grounded questions, auto-generate summaries, and create property P&amp;L packages.
            </p>
          </div>
          <div className={clsx('rounded-full px-4 py-2 text-xs font-medium', isSending ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500')}>
            {isSending ? 'Processing request...' : 'Idle'}
          </div>
        </div>
        {activeDocumentName && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <SparklesIcon className="h-4 w-4" aria-hidden="true" />
            Focused on: {activeDocumentName}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-hidden bg-slate-50">
        <div ref={scrollRef} className="flex h-full flex-col gap-5 overflow-y-auto px-6 py-6">
          {isLoading && <div className="text-sm text-slate-500">Loading conversation...</div>}
          {!isLoading && messages.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-8 text-sm text-slate-500">
              Start by uploading documents or selecting a previous chat. Ask anything about leases, loan covenants, or financial performance.
            </div>
          )}
          {messages.map(message => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {pnlResult && (
            <div className="rounded-3xl border border-brand-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
                <DocumentArrowDownIcon className="h-5 w-5" aria-hidden="true" />
                Generated Property P&amp;L Package
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Property: <span className="font-semibold text-brand-700">{pnlResult.property}</span>
              </p>
              <p className="mt-1 text-sm text-slate-600">{pnlResult.summary}</p>
              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-700 sm:grid-cols-3">
                <div className="rounded-2xl bg-brand-50/60 px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-brand-500">Revenue</dt>
                  <dd className="mt-1 text-base font-semibold text-brand-700">${pnlResult.totals.revenue.toLocaleString()}</dd>
                </div>
                <div className="rounded-2xl bg-brand-50/60 px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-brand-500">Expenses</dt>
                  <dd className="mt-1 text-base font-semibold text-brand-700">${pnlResult.totals.expenses.toLocaleString()}</dd>
                </div>
                <div className="rounded-2xl bg-brand-50/60 px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-brand-500">NOI</dt>
                  <dd className="mt-1 text-base font-semibold text-brand-700">${pnlResult.totals.noi.toLocaleString()}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <a
                  href={pnlResult.csvUrl}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 font-semibold text-white shadow hover:bg-brand-500"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" aria-hidden="true" />
                  Download CSV
                </a>
                <a
                  href={pnlResult.xlsxUrl}
                  className="inline-flex items-center gap-2 rounded-full border border-brand-200 px-4 py-2 font-semibold text-brand-700 hover:bg-brand-50"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" aria-hidden="true" />
                  Download XLSX
                </a>
                <span className="text-xs font-medium text-brand-600">Retrieved {pnlResult.retrievedChunks} chunks for aggregation</span>
                {pnlResult.sources.length > 0 && (
                  <span className="text-xs text-slate-400">Sources: {pnlResult.sources.join(', ')}</span>
                )}
              </div>
            </div>
          )}
          {pnlError && (
            <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {pnlError}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white px-6 py-4">
        {showPnlForm && (
          <div className="mb-4 rounded-2xl border border-brand-200 bg-brand-50/70 p-4 text-sm text-slate-700">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                Property Name
              </label>
              <input
                value={propertyName}
                onChange={event => setPropertyName(event.target.value)}
                placeholder="e.g., Midtown Lofts"
                className="flex-1 rounded-full border border-brand-200 bg-white px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPnlForm(false)
                    setPropertyName('')
                  }}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleGeneratePnl()}
                  disabled={isGeneratingPnl}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-brand-300"
                >
                  {isGeneratingPnl ? 'Generating...' : 'Create P&L'}
                </button>
              </div>
            </div>
          </div>
        )}
        <form
          onSubmit={event => {
            event.preventDefault()
            if (!isSending) {
              void handleSubmit()
            }
          }}
          className="flex flex-col gap-3"
        >
          <textarea
            value={prompt}
            onChange={event => setPrompt(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            placeholder="Ask about lease clauses, compliance thresholds, or create investor-ready documents..."
            className="w-full resize-none rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowPnlForm(value => !value)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-500"
            >
              <DocumentArrowDownIcon className="h-5 w-5" aria-hidden="true" />
              Generate Property P&amp;L
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Enter to send / Shift+Enter for newline</span>
              <button
                type="submit"
                disabled={isSending}
                className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-brand-300"
              >
                {isSending ? 'Sending...' : 'Send'}
                <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Chat