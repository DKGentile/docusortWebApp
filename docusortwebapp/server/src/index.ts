import cors from 'cors'
import express from 'express'
import multer from 'multer'
import path from 'path'

import { CHAT_MODEL, GENERATED_DIR, PORT, UPLOADS_DIR, ensureDirectories } from './config'
import { ChatStore } from './store/chatStore'
import { InMemoryVectorStore, type DocumentMetadata, type SearchResult } from './store/vectorStore'
import { answerWithContext } from './services/answer'
import { embedText, fallbackEmbedding } from './services/embeddings'
import { generatePnlPackage } from './services/pnl'
import { extractTextFromFile } from './services/parsing'
import type { ChatMessage, GeneratedPnlMetadata, RetrievedChunk } from './types'
import { chunkText, summarize } from './utils/chunkText'

ensureDirectories()

const app = express()

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '16mb' }))
app.use('/uploads', express.static(UPLOADS_DIR))
app.use('/generated', express.static(GENERATED_DIR))

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, UPLOADS_DIR),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname)
    const base = path.basename(file.originalname, extension).replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    const timestamp = Date.now()
    callback(null, `${timestamp}-${base}${extension}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }
})

const vectorStore = new InMemoryVectorStore()
const chatStore = new ChatStore()

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', model: CHAT_MODEL })
})

app.get('/api/docs', (_req, res) => {
  const documents = vectorStore.listDocuments().map(publicDocument)
  res.json({ documents })
})

app.get('/api/chats', (_req, res) => {
  res.json({ chats: chatStore.list() })
})

app.get('/api/chats/:id', (req, res) => {
  const chat = chatStore.get(req.params.id)
  if (!chat) {
    res.status(404).json({ error: 'Chat not found' })
    return
  }
  res.json({ chat })
})

app.post('/api/upload', upload.array('files', 10), async (req, res) => {
  const files = req.files as Express.Multer.File[] | undefined
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'No files uploaded' })
    return
  }

  try {
    const processed = []

    for (const file of files) {
      const text = await extractTextFromFile(file.path, file.mimetype)
      const documentText = text || 'No extractable text found in document.'
      const baseChunks = chunkText(documentText)
      const chunks = baseChunks.length > 0 ? baseChunks : [{ text: documentText.slice(0, 800), index: 0 }]
      const inputs = chunks.map(chunk => chunk.text)

      let embeddings: number[][]
      try {
        embeddings = await embedText(inputs)
      } catch (error) {
        console.error('Embedding generation failed, falling back to offline vectors', error)
        embeddings = inputs.map(chunk => fallbackEmbedding(chunk))
      }

      const document = vectorStore.addDocument(
        {
          name: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          summary: summarize(documentText),
          path: file.path,
          fullText: documentText
        },
        chunks.map((chunk, index) => ({
          text: chunk.text,
          embedding: embeddings[index] ?? fallbackEmbedding(chunk.text),
          order: chunk.index
        }))
      )

      processed.push(publicDocument(document))
    }

    res.json({ documents: processed })
  } catch (error) {
    console.error('Upload processing failed', error)
    res.status(500).json({ error: 'Failed to process uploaded documents' })
  }
})

app.post('/api/chat', async (req, res) => {
  const { chatId, prompt, documentId } = req.body as {
    chatId?: string | null
    prompt?: string
    documentId?: string | null
  }

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Prompt is required' })
    return
  }

  try {
    const [queryEmbedding] = await embedText([prompt])
    const results = queryEmbedding
      ? vectorStore.search(queryEmbedding, { topK: 6, documentId: documentId ?? null })
      : []

    const contextSections = results.map(result => ({
      header: result.document.name,
      text: result.chunk.text
    }))

    const answer = await answerWithContext(prompt, contextSections)

    const timestamp = new Date().toISOString()

    const focusedDocument = documentId ? vectorStore.getDocument(documentId) : undefined

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      createdAt: timestamp,
      metadata: {
        documentName: focusedDocument?.name ?? null
      }
    }

    const relatedDocuments: RetrievedChunk[] = results.map(result => ({
      docId: result.document.id,
      chunkId: result.chunk.id,
      score: Number(result.score.toFixed(4)),
      snippet: result.chunk.text.slice(0, 280),
      documentName: result.document.name
    }))

    const pnlMetadata = await maybeGeneratePnlPackages({
      prompt,
      results,
      focusedDocument
    })

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: answer,
      createdAt: new Date().toISOString(),
      metadata: {
        retrievedChunks: results.length,
        relatedDocuments,
        documentName: focusedDocument?.name ?? null,
        generatedPnl: pnlMetadata.length > 0 ? pnlMetadata : undefined
      }
    }

    let targetChatId = chatId ?? ''

    if (targetChatId) {
      chatStore.append(targetChatId, [userMessage, assistantMessage], buildChatTitle(prompt))
    } else {
      const chat = chatStore.create(buildChatTitle(prompt), [userMessage, assistantMessage])
      targetChatId = chat.id
    }

    res.json({
      chatId: targetChatId,
      message: assistantMessage,
      retrievedChunks: results.length,
      relatedDocuments,
      generatedPnl: pnlMetadata
    })
  } catch (error) {
    console.error('Chat generation failed', error)
    res.status(500).json({ error: 'Failed to generate response' })
  }
})

app.post('/api/generate/pnl', async (req, res) => {
  const { property, documentId } = req.body as {
    property?: string
    documentId?: string | null
  }

  if (!property) {
    res.status(400).json({ error: 'Property name is required' })
    return
  }

  try {
    const result = await generatePnlPackage({
      property,
      documentId,
      vectorStore,
      outputDir: GENERATED_DIR
    })

    res.json({
      property: result.property,
      summary: result.summary,
      csvUrl: toPublicUrl(result.csvPath, GENERATED_DIR, 'generated'),
      xlsxUrl: toPublicUrl(result.xlsxPath, GENERATED_DIR, 'generated'),
      totals: result.totals,
      retrievedChunks: result.retrievedChunks,
      sources: result.sources
    })
  } catch (error) {
    console.error('Failed to generate P&L', error)
    res.status(500).json({ error: 'Failed to generate P&L package' })
  }
})

app.listen(PORT, () => {
  console.log(`DocuSort server running on http://localhost:${PORT}`)
})

async function maybeGeneratePnlPackages({
  prompt,
  results,
  focusedDocument
}: {
  prompt: string
  results: SearchResult[]
  focusedDocument?: DocumentMetadata
}): Promise<GeneratedPnlMetadata[]> {
  if (!isPnlIntent(prompt) || results.length === 0) {
    return []
  }

  const targets = resolvePnlTargets({ prompt, results, focusedDocument })
  const packages: GeneratedPnlMetadata[] = []

  for (const target of targets) {
    try {
      const pnl = await generatePnlPackage({
        property: target.property,
        documentId: target.documentId,
        vectorStore,
        outputDir: GENERATED_DIR
      })

      packages.push({
        property: pnl.property,
        summary: pnl.summary,
        csvUrl: toPublicUrl(pnl.csvPath, GENERATED_DIR, 'generated'),
        xlsxUrl: toPublicUrl(pnl.xlsxPath, GENERATED_DIR, 'generated'),
        totals: pnl.totals,
        retrievedChunks: pnl.retrievedChunks,
        sources: pnl.sources
      })
    } catch (error) {
      console.error('Auto P&L generation failed', error)
    }
  }

  return packages
}

function publicDocument(document: DocumentMetadata) {
  const { fullText: _fullText, path: _path, ...publicFields } = document
  return publicFields
}

function toPublicUrl(filePath: string, directory: string, route: string): string {
  const relative = path.relative(directory, filePath).replace(/\\/g, '/')
  return `/${route}/${relative}`
}

function buildChatTitle(prompt: string): string {
  const trimmed = prompt.trim()
  if (!trimmed) return 'Conversation'
  return trimmed.length > 60 ? `${trimmed.slice(0, 60)}...` : trimmed
}

function isPnlIntent(prompt: string): boolean {
  return /(p&l|p\s*&\s*l|profit\s*(and|&)\s*loss|income statement|net operating income|noi)/i.test(prompt)
}

function resolvePnlTargets({
  prompt,
  results,
  focusedDocument
}: {
  prompt: string
  results: SearchResult[]
  focusedDocument?: DocumentMetadata
}): Array<{ property: string; documentId?: string | null }> {
  const targets = new Map<string, { property: string; documentId?: string | null }>()
  const lowerPrompt = prompt.toLowerCase()

  if (focusedDocument) {
    targets.set(focusedDocument.id, { property: focusedDocument.name, documentId: focusedDocument.id })
  }

  for (const result of results) {
    if (!targets.has(result.document.id)) {
      targets.set(result.document.id, {
        property: result.document.name,
        documentId: result.document.id
      })
    }
  }

  if (targets.size === 0) {
    const fallbackName = lowerPrompt.includes('portfolio') || lowerPrompt.includes('all') ? 'Workspace Portfolio' : 'Document Set'
    targets.set('fallback', { property: fallbackName, documentId: undefined })
  }

  const wantsEach = /(each property|every property|all properties|portfolio)/i.test(prompt)
  const limit = wantsEach ? 5 : 1

  return Array.from(targets.values()).slice(0, limit)
}