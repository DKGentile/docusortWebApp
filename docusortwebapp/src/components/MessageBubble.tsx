import clsx from 'clsx'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage, GeneratedPnlMetadata } from '../types'

interface MessageBubbleProps {
  message: ChatMessage
}

const GeneratedPnlCard: React.FC<{ pnl: GeneratedPnlMetadata }> = ({ pnl }) => {
  return (
    <div className="mt-4 rounded-3xl border border-brand-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-500">Property</div>
          <div className="mt-1 text-base font-semibold text-brand-700">{pnl.property}</div>
        </div>
        <div className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-medium text-brand-600">
          Retrieved {pnl.retrievedChunks} chunks
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-600">{pnl.summary}</p>
      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-2xl bg-brand-50/70 px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-brand-500">Revenue</dt>
          <dd className="mt-1 text-base font-semibold text-brand-700">${pnl.totals.revenue.toLocaleString()}</dd>
        </div>
        <div className="rounded-2xl bg-brand-50/70 px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-brand-500">Expenses</dt>
          <dd className="mt-1 text-base font-semibold text-brand-700">${pnl.totals.expenses.toLocaleString()}</dd>
        </div>
        <div className="rounded-2xl bg-brand-50/70 px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-brand-500">NOI</dt>
          <dd className="mt-1 text-base font-semibold text-brand-700">${pnl.totals.noi.toLocaleString()}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <a
          href={pnl.csvUrl}
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 font-semibold text-white shadow hover:bg-brand-500"
        >
          Download CSV
        </a>
        <a
          href={pnl.xlsxUrl}
          className="inline-flex items-center gap-2 rounded-full border border-brand-200 px-4 py-2 font-semibold text-brand-700 hover:bg-brand-50"
        >
          Download XLSX
        </a>
        {pnl.sources.length > 0 && (
          <span className="text-xs text-slate-400">Sources: {pnl.sources.join(', ')}</span>
        )}
      </div>
    </div>
  )
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user'

  return (
    <div className={clsx('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-2xl rounded-3xl px-5 py-4 shadow-sm ring-1 ring-black/5 transition',
          isUser ? 'bg-brand-600 text-white' : 'bg-white text-slate-800'
        )}
      >
        <div className="flex items-center justify-between gap-4 text-[11px] uppercase tracking-wide">
          <span className={clsx('font-semibold', isUser ? 'text-brand-50' : 'text-slate-500')}>
            {isUser ? 'You' : 'DocuSort AI'}
          </span>
          <span className={clsx(isUser ? 'text-brand-100/80' : 'text-slate-400')}>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className={clsx('prose prose-sm mt-3', isUser ? 'prose-invert' : '')}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </div>
        {!isUser && message.metadata?.retrievedChunks != null && (
          <div className="mt-3 text-[11px] font-medium text-brand-700">
            Retrieved {message.metadata.retrievedChunks} chunks
          </div>
        )}
        {!isUser && message.metadata?.relatedDocuments && message.metadata.relatedDocuments.length > 0 && (
          <div className="mt-2 space-y-2 rounded-2xl bg-slate-50 p-3 text-[11px] text-slate-600">
            {message.metadata.relatedDocuments.map(item => (
              <div key={`${item.docId}-${item.chunkId}`}>
                <div className="font-semibold text-slate-700">{item.documentName ?? `Doc: ${item.docId}`}</div>
                <div className="mt-1 text-slate-500">{item.snippet}</div>
              </div>
            ))}
          </div>
        )}
        {!isUser && message.metadata?.generatedPnl && message.metadata.generatedPnl.length > 0 && (
          <div className="mt-4 space-y-4">
            {message.metadata.generatedPnl.map(pnl => (
              <GeneratedPnlCard key={`${pnl.property}-${pnl.csvUrl}`} pnl={pnl} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageBubble