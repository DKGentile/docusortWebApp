import fs from 'fs/promises'
import mammoth from 'mammoth'
// @ts-expect-error pdf-parse does not ship types for deep import
import pdfParse from 'pdf-parse/lib/pdf-parse.js'

export async function extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
  const buffer = await fs.readFile(filePath)
  if (mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf')) {
    try {
      const result = await pdfParse(buffer)
      return result.text ?? ''
    } catch (error) {
      console.error('Failed to parse PDF', error)
    }
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    filePath.toLowerCase().endsWith('.docx')
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer })
      return result.value ?? ''
    } catch (error) {
      console.error('Failed to parse DOCX', error)
    }
  }

  return buffer.toString('utf8')
}