import fs from 'fs/promises'
import path from 'path'
import * as XLSX from 'xlsx'
import { embedText } from './embeddings'
import type { InMemoryVectorStore, SearchResult } from '../store/vectorStore'

interface GeneratePnlOptions {
  property: string
  documentId?: string | null
  vectorStore: InMemoryVectorStore
  outputDir: string
}

interface AggregatedFigures {
  property: string
  revenue: number
  expenses: number
  noi: number
  sources: string[]
}

export interface GeneratedPnlPayload {
  property: string
  summary: string
  csvPath: string
  xlsxPath: string
  totals: {
    revenue: number
    expenses: number
    noi: number
  }
  retrievedChunks: number
  sources: string[]
}

export async function generatePnlPackage({ property, documentId, vectorStore, outputDir }: GeneratePnlOptions): Promise<GeneratedPnlPayload> {
  const queryEmbedding = await embedText([`profit and loss statement for property ${property}`])
  const embedding = queryEmbedding.at(0)
  const results: SearchResult[] = embedding
    ? vectorStore.search(embedding, { topK: 8, documentId: documentId ?? null })
    : []

  const figures = aggregateFigures(property, results)
  const fileBase = slugify(`${property}-${Date.now()}`)
  const csvPath = path.join(outputDir, `${fileBase}.csv`)
  const xlsxPath = path.join(outputDir, `${fileBase}.xlsx`)

  const csvContent = buildCsv(figures, results.length)
  await fs.writeFile(csvPath, csvContent, 'utf8')

  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet(buildSheetRows(figures, results.length))
  XLSX.utils.book_append_sheet(workbook, sheet, 'Summary')
  XLSX.writeFile(workbook, xlsxPath)

  const summary = figures.revenue || figures.expenses
    ? `Net operating income for ${figures.property} is $${figures.noi.toLocaleString()} across ${results.length} retrieved chunk(s).`
    : `No structured financial values detected for ${figures.property}. Generated templated outputs for completion.`

  return {
    property: figures.property,
    summary,
    csvPath,
    xlsxPath,
    totals: {
      revenue: figures.revenue,
      expenses: figures.expenses,
      noi: figures.noi
    },
    retrievedChunks: results.length,
    sources: figures.sources
  }
}

function aggregateFigures(property: string, results: SearchResult[]): AggregatedFigures {
  const revenueKeywords = /(revenue|rent|income|collections|sales|gross)/i
  const expenseKeywords = /(expense|cost|tax|insurance|maintenance|capex|debt service|interest)/i
  let revenue = 0
  let expenses = 0
  const sources = new Set<string>()

  for (const result of results) {
    sources.add(result.document.name)
    const lines = result.chunk.text.split(/\n|\r|\.|;/).map(line => line.trim()).filter(Boolean)
    for (const line of lines) {
      const numbers = [...line.matchAll(/[-+]?\$?[\d,]+(?:\.\d{1,2})?/g)]
      if (numbers.length === 0) continue
      for (const match of numbers) {
        const value = parseCurrency(match[0] ?? '')
        if (Number.isNaN(value) || value === 0) continue
        if (revenueKeywords.test(line)) {
          revenue += Math.abs(value)
        } else if (expenseKeywords.test(line)) {
          expenses += Math.abs(value)
        }
      }
    }
  }

  if (revenue === 0 && expenses === 0) {
    revenue = 0
    expenses = 0
  }

  const noi = revenue - expenses
  return {
    property,
    revenue: roundCurrency(revenue),
    expenses: roundCurrency(expenses),
    noi: roundCurrency(noi),
    sources: Array.from(sources)
  }
}

function buildCsv(figures: AggregatedFigures, retrieved: number): string {
  const rows = buildSheetRows(figures, retrieved)
  return rows
    .map(row => row.map(value => formatCsvCell(value)).join(','))
    .join('\n')
}

function buildSheetRows(figures: AggregatedFigures, retrieved: number): (string | number)[][] {
  return [
    ['Property', figures.property],
    ['Source Documents', figures.sources.join('; ') || 'N/A'],
    [],
    ['Metric', 'Amount'],
    ['Revenue', figures.revenue],
    ['Expenses', figures.expenses],
    ['NOI', figures.noi],
    [],
    ['Retrieved Chunks', retrieved]
  ]
}

function formatCsvCell(value: string | number): string {
  if (typeof value === 'number') {
    return value.toString()
  }
  const sanitized = value.replace(/"/g, '""')
  return `"${sanitized}"`
}

function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d.-]/g, '')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function roundCurrency(value: number): number {
  return Math.round(value)
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}