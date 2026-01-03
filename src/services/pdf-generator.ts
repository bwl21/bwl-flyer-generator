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
  format: LayoutFormat,
  templateSet?: any
): Promise<Uint8Array> => {
  let template = null
  
  // Versuche zuerst, das Template aus dem TemplateSet zu holen
  if (templateSet && templateSet.templates && templateSet.templates[format]) {
    // Deep clone um Proxy-Probleme zu vermeiden
    template = JSON.parse(JSON.stringify(templateSet.templates[format]))
    console.debug(`[pdf-generator] Using template from templateSet for ${format}`)
  } else {
    // Fallback zur Standard-Funktion
    template = getTemplate(format)
    console.debug(`[pdf-generator] Using fallback template for ${format}`)
  }
  
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
  
  // Erstelle Input für das Template (nur einen für alle Seiten)
  const baseInput = flyerDataToInput(data)
  const inputs = [baseInput] // Nur ein Input für alle Seiten

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
  templateSet?: any,
  onProgress?: (format: LayoutFormat, index: number, total: number) => void
): Promise<Map<LayoutFormat, Uint8Array>> => {
  // Get formats from templateSet or fallback to default
  let formats: string[]
  if (templateSet && templateSet.templates) {
    formats = Object.keys(templateSet.templates)
    console.debug(`[pdf-generator] Using ${formats.length} formats from templateSet`)
  } else {
    formats = getAllFormats()
    console.debug(`[pdf-generator] Using ${formats.length} default formats`)
  }
  
  const results = new Map<LayoutFormat, Uint8Array>()

  for (let i = 0; i < formats.length; i++) {
    const format = formats[i]
    if (onProgress) {
      onProgress(format as LayoutFormat, i, formats.length)
    }

    const pdf = await generatePdf(data, format as LayoutFormat, templateSet)
    results.set(format as LayoutFormat, pdf)
  }

  return results
}

// Get filename for a format
export const getFilename = (format: LayoutFormat): string => {
  // Try to get filename from LAYOUT_CONFIGS first
  if (LAYOUT_CONFIGS[format]) {
    return LAYOUT_CONFIGS[format].filename
  }
  
  // Fallback for custom layouts
  return `flyer-${format}.pdf`
}
