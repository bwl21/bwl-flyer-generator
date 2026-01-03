import JSZip from 'jszip'
import type { FlyerData, LayoutFormat } from '../types/flyer'
import { generateAllPdfs, getFilename } from './pdf-generator'

export interface ZipProgress {
  stage: 'generating' | 'zipping' | 'downloading'
  format?: LayoutFormat
  current: number
  total: number
}

// Create ZIP archive from PDFs
export const createZipFromPdfs = async (
  pdfs: Map<LayoutFormat, Uint8Array>
): Promise<Blob> => {
  const zip = new JSZip()

  for (const [format, pdfData] of pdfs) {
    const filename = getFilename(format)
    zip.file(filename, pdfData)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  return blob
}

// Trigger browser download
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Main function: generate all PDFs and download as ZIP
export const generateAndDownloadZip = async (
  data: FlyerData,
  templateSet?: any,
  onProgress?: (progress: ZipProgress) => void
): Promise<void> => {
  // Validate required fields
  if (!data.title?.trim()) {
    throw new Error('Titel ist erforderlich')
  }

  // Generate PDFs
  const pdfs = await generateAllPdfs(data, templateSet, (format, index, total) => {
    if (onProgress) {
      onProgress({
        stage: 'generating',
        format,
        current: index + 1,
        total,
      })
    }
  })

  // Create ZIP
  if (onProgress) {
    onProgress({
      stage: 'zipping',
      current: 1,
      total: 1,
    })
  }

  const zipBlob = await createZipFromPdfs(pdfs)

  // Download
  if (onProgress) {
    onProgress({
      stage: 'downloading',
      current: 1,
      total: 1,
    })
  }

  const timestamp = new Date().toISOString().slice(0, 10)
  const safeTitle = data.title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '-').slice(0, 30)
  const zipFilename = `flyer-${safeTitle}-${timestamp}.zip`

  downloadBlob(zipBlob, zipFilename)
}
