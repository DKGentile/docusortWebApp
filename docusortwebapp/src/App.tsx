import { useMemo, useState } from 'react'
import { Bars3Icon } from '@heroicons/react/24/outline'
import Sidebar from './components/Sidebar'
import Chat from './components/Chat'
import {
  useChat,
  useChats,
  useDocs,
  useGeneratePnl,
  useUpload
} from './hooks'
import type { ChatMessage, GeneratePnlResponse } from './types'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([])
  const [pnlResult, setPnlResult] = useState<GeneratePnlResponse | null>(null)
  const [pnlError, setPnlError] = useState<string | null>(null)

  const docsQuery = useDocs()
  const chatsQuery = useChats()
  const chatSession = useChat(selectedChatId)
  const uploadMutation = useUpload()
  const pnlMutation = useGeneratePnl()

  const documents = docsQuery.data ?? []
  const chats = chatsQuery.data ?? []
  const messages = useMemo(() => {
    const base = chatSession.data?.messages ?? []
    return [...base, ...pendingMessages]
  }, [chatSession.data?.messages, pendingMessages])

  const activeDocument = useMemo(
    () => documents.find(document => document.id === selectedDocumentId) ?? null,
    [documents, selectedDocumentId]
  )

  const handleUpload = (files: File[]) => {
    setPnlError(null)
    uploadMutation.mutate(
      { files },
      {
        onSuccess: uploaded => {
          if (!selectedDocumentId && uploaded.length > 0) {
            setSelectedDocumentId(uploaded[0].id)
          }
        }
      }
    )
  }

  const handleSendPrompt = async (prompt: string) => {
    setPnlError(null)
    setPnlResult(null)

    if (!selectedChatId) {
      const optimistic: ChatMessage = {
        id: `pending-${Date.now()}`,
        role: 'user',
        content: prompt,
        createdAt: new Date().toISOString()
      }
      setPendingMessages([optimistic])
    }

    try {
      const response = await chatSession.sendPrompt({
        chatId: selectedChatId,
        prompt,
        documentId: selectedDocumentId
      })

      if (!selectedChatId || selectedChatId !== response.chatId) {
        setSelectedChatId(response.chatId)
      }
      setPendingMessages([])
    } catch (error) {
      console.error('Chat request failed', error)
      setPendingMessages([])
      throw error
    }
  }

  const handleGeneratePnl = async (property: string) => {
    setPnlError(null)
    try {
      const result = await pnlMutation.mutateAsync({
        property,
        documentId: selectedDocumentId
      })
      setPnlResult(result)
      return result
    } catch (error) {
      console.error('Failed to generate P&L', error)
      setPnlResult(null)
      setPnlError('Unable to generate P&L package. Please verify source data and try again.')
    }
  }

  const uploadError = uploadMutation.error as Error | undefined

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar
        documents={documents}
        chats={chats}
        selectedDocumentId={selectedDocumentId}
        onSelectDocument={id => {
          setSelectedDocumentId(id)
          setSidebarOpen(false)
        }}
        selectedChatId={selectedChatId}
        onSelectChat={id => {
          setPendingMessages([])
          setSelectedChatId(id)
          setSidebarOpen(false)
        }}
        onUploadFiles={handleUpload}
        isUploading={uploadMutation.isPending}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="flex min-h-screen flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600"
          >
            <Bars3Icon className="h-5 w-5" aria-hidden="true" />
            Menu
          </button>
          {activeDocument && (
            <span className="text-xs font-semibold text-brand-600">{activeDocument.name}</span>
          )}
        </div>
        {(docsQuery.error || chatsQuery.error) && (
          <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-600">
            {docsQuery.error ? 'Failed to load documents. ' : ''}
            {chatsQuery.error ? 'Failed to load chats.' : ''}
          </div>
        )}
        {uploadError && (
          <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-600">
            {uploadError.message}
          </div>
        )}
        <Chat
          messages={messages}
          isLoading={chatSession.isLoading}
          isSending={chatSession.isSending}
          onSend={handleSendPrompt}
          activeDocumentName={activeDocument?.name}
          onGeneratePnl={handleGeneratePnl}
          pnlResult={pnlResult}
          pnlError={pnlError}
          isGeneratingPnl={pnlMutation.isPending}
        />
      </main>
    </div>
  )
}

export default App