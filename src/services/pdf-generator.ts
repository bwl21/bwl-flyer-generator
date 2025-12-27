import { generate } from '@pdfme/generator'
import { text, barcodes, image, rectangle } from '@pdfme/schemas'
import type { FlyerData, LayoutFormat } from '../types/flyer'
import { LAYOUT_CONFIGS } from '../types/flyer'
import { getTemplate, flyerDataToInput, getAllFormats } from './pdfme-templates'

// pdfme plugins
const plugins = {
  Text: text,
  QRCode: barcodes.qrcode,
  Image: image,
  Rectangle: rectangle,
}

// Generate a single PDF for a specific format
export const generatePdf = async (
  data: FlyerData,
  format: LayoutFormat
): Promise<Uint8Array> => {
  const template = getTemplate(format)
  const inputs = [flyerDataToInput(data)]

  const pdf = await generate({
    template,
    inputs,
    plugins,
  })

  return pdf
}

// Generate all PDFs for all formats
export const generateAllPdfs = async (
  data: FlyerData,
  onProgress?: (format: LayoutFormat, index: number, total: number) => void
): Promise<Map<LayoutFormat, Uint8Array>> => {
  const formats = getAllFormats()
  const results = new Map<LayoutFormat, Uint8Array>()

  for (let i = 0; i < formats.length; i++) {
    const format = formats[i]
    if (onProgress) {
      onProgress(format, i, formats.length)
    }

    const pdf = await generatePdf(data, format)
    results.set(format, pdf)
  }

  return results
}

// Get filename for a format
export const getFilename = (format: LayoutFormat): string => {
  return LAYOUT_CONFIGS[format].filename
}
