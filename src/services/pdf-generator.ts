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
  let template = getTemplate(format)
  
  if (!template) {
    throw new Error(`Template not found for format: ${format}`)
  }

  // Deep clone um Proxy-Probleme zu vermeiden
  template = JSON.parse(JSON.stringify(template))
  
  // Stelle sicher, dass basePdf das richtige Format hat
  if (template.basePdf && typeof template.basePdf === 'object' && 'width' in template.basePdf && !template.basePdf.padding) {
    (template.basePdf as any).padding = [0, 0, 0, 0] as [number, number, number, number]
  }
  
  // Filtere image-Felder aus dem Template, wenn keine Bilddaten vorhanden sind
  const filteredTemplate = {
    ...template,
    schemas: template.schemas.map((page: any[]) =>
      page.filter((field: any) => {
        if (field.type === 'image') {
          // Prüfe ob Bilddaten vorhanden sind
          const imageData = (data as any)[field.name] || (data as any)[`${field.name}_url`]
          if (!imageData) {
            console.debug(`[pdf-generator] Filtering out image field "${field.name}" - no image data provided`)
            return false
          }
        }
        return true
      })
    )
  }
  
  // Erstelle Inputs für jede Seite des Templates
  const baseInput = flyerDataToInput(data)
  const inputs = filteredTemplate.schemas.map(() => baseInput)

  const pdf = await generate({
    template: filteredTemplate,
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
