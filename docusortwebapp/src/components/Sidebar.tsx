import { Fragment } from 'react'
import { Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import FileUploader from './FileUploader'
import type { ChatSummary, DocumentRecord } from '../types'

interface SidebarProps {
  documents: DocumentRecord[]
  chats: ChatSummary[]
  selectedDocumentId: string | null
  onSelectDocument: (id: string | null) => void
  selectedChatId: string | null
  onSelectChat: (id: string | null) => void
  onUploadFiles: (files: File[]) => void
  isUploading: boolean
  open: boolean
  onClose: () => void
}

const Sidebar: React.FC<SidebarProps> = ({
  documents,
  chats,
  selectedDocumentId,
  onSelectDocument,
  selectedChatId,
  onSelectChat,
  onUploadFiles,
  isUploading,
  open,
  onClose
}) => {
  const content = (
    <div className="flex h-full w-full flex-col gap-6 overflow-y-auto border-r border-slate-200 bg-white px-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Workspace</h2>
          <p className="mt-1 text-xs text-slate-500">Manage documents and revisit prior conversations.</p>
        </div>
      </div>
      <div>
        <label htmlFor="chat-select" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Previous Chats
        </label>
        <select
          id="chat-select"
          value={selectedChatId ?? ''}
          onChange={event => onSelectChat(event.target.value || null)}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        >
          <option value="">Start new chat</option>
          {chats.map(chat => (
            <option key={chat.id} value={chat.id}>
              {chat.title.length > 46 ? `${chat.title.slice(0, 46)}...` : chat.title}
            </option>
          ))}
        </select>
        <ul className="mt-4 space-y-3 text-xs text-slate-500">
          {chats.slice(0, 5).map(chat => (
            <li key={`chat-preview-${chat.id}`} className="rounded-2xl border border-slate-200 p-3">
              <div className="font-medium text-slate-700">{chat.title}</div>
              <div className="mt-1 text-[11px] text-slate-400">Updated {new Date(chat.updatedAt).toLocaleString()}</div>
              {chat.lastMessagePreview && <p className="mt-1 text-slate-500">{chat.lastMessagePreview}</p>}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <label htmlFor="document-select" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Document Repository
        </label>
        <select
          id="document-select"
          value={selectedDocumentId ?? ''}
          onChange={event => onSelectDocument(event.target.value || null)}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        >
          <option value="">All documents</option>
          {documents.map(doc => (
            <option key={doc.id} value={doc.id}>
              {doc.name.length > 46 ? `${doc.name.slice(0, 46)}...` : doc.name}
            </option>
          ))}
        </select>
        <div className="mt-4">
          <FileUploader onUpload={onUploadFiles} isUploading={isUploading} />
        </div>
        <ul className="mt-5 space-y-3 text-xs text-slate-600">
          {documents.slice(0, 6).map(doc => (
            <li key={`doc-${doc.id}`} className="rounded-2xl border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-700">{doc.name}</div>
              <div className="mt-1 text-[11px] text-slate-400">
                {doc.mimeType} | {(doc.size / (1024 * 1024)).toFixed(2)} MB | Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
              </div>
              <p className="mt-2 text-slate-500">{doc.summary}</p>
            </li>
          ))}
          {documents.length === 0 && <li className="rounded-2xl border border-dashed border-slate-300 p-4 text-slate-400">No documents yet.</li>}
        </ul>
      </div>
    </div>
  )

  return (
    <>
      <Transition show={open} as={Fragment}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} />
        </Transition.Child>
        <Transition.Child
          as={Fragment}
          enter="transition duration-200"
          enterFrom="-translate-x-full"
          enterTo="translate-x-0"
          leave="transition duration-150"
          leaveFrom="translate-x-0"
          leaveTo="-translate-x-full"
        >
          <div className="fixed inset-y-0 left-0 z-40 w-80 max-w-[80%] overflow-hidden bg-white shadow-2xl lg:hidden">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <span className="text-sm font-semibold text-slate-700">DocuSort Navigation</span>
                <button onClick={onClose} className="rounded-full p-1 text-slate-500 hover:bg-slate-100">
                  <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{content}</div>
            </div>
          </div>
        </Transition.Child>
      </Transition>
      <div className="hidden h-full w-80 shrink-0 lg:block">{content}</div>
    </>
  )
}

export default Sidebar