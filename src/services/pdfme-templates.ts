import type { Template, Schema } from '@pdfme/common'
import type { LayoutFormat, FlyerData } from '../types/flyer'
import { templateStorage } from './template-storage'

// Base schema fields used across all templates
const createTextSchema = (
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
  fontColor: string = '#000000',
  alignment: 'left' | 'center' | 'right' = 'left'
): Schema => ({
  type: 'text',
  name,
  position: { x, y },
  width,
  height,
  fontSize,
  fontColor,
  alignment,
})

const createQrSchema = (
  name: string,
  x: number,
  y: number,
  size: number
): Schema => ({
  type: 'qrcode',
  name,
  position: { x, y },
  width: size,
  height: size,
})

// A5 Portrait (148mm x 210mm)
const createA5PortraitTemplate = (): Template => {
  const width = 148
  const height = 210
  const padding = 10
  const headerHeight = 40
  const qrSize = 35

  return {
    basePdf: {
      width,
      height,
      padding: [0, 0, 0, 0],
    },
    schemas: [
      [
        // Header background
        {
          type: 'rectangle',
          name: 'header-bg',
          position: { x: 0, y: 0 },
          width: width,
          height: headerHeight,
          color: '#1e40af',
          borderWidth: 0,
        },
        // Title in header
        createTextSchema('title', padding, headerHeight / 2 + 3, width - padding * 2, 20, 14, '#ffffff', 'left'),
        // Content
        createTextSchema('datetime', padding, headerHeight + 15, width - padding * 2, 10, 10, '#374151'),
        createTextSchema('location', padding, headerHeight + 30, width - padding * 2, 10, 10, '#374151'),
        createTextSchema('speaker', padding, headerHeight + 50, width - padding * 2, 10, 9, '#6b7280'),
        createTextSchema('desc', padding, headerHeight + 70, width - padding * 2 - qrSize - 5, 100, 9, '#374151'),
        // QR Code
        createQrSchema('qr', width - padding - qrSize, height - padding - qrSize, qrSize),
      ],
    ],
  }
}

// A5 Landscape (210mm x 148mm)
const createA5LandscapeTemplate = (): Template => {
  const width = 210
  const height = 148
  const padding = 10
  const headerHeight = 35
  const qrSize = 30

  return {
    basePdf: {
      width,
      height,
      padding: [0, 0, 0, 0],
    },
    schemas: [
      [
        // Header background
        {
          type: 'rectangle',
          name: 'header-bg',
          position: { x: 0, y: 0 },
          width: width,
          height: headerHeight,
          color: '#1e40af',
          borderWidth: 0,
        },
        // Title in header
        createTextSchema('title', padding, headerHeight / 2 + 2, width - padding * 2, 18, 12, '#ffffff', 'left'),
        // Content
        createTextSchema('datetime', padding, headerHeight + 15, 90, 10, 9, '#374151'),
        createTextSchema('location', padding, headerHeight + 30, 90, 10, 9, '#374151'),
        createTextSchema('speaker', padding, headerHeight + 50, 90, 10, 8, '#6b7280'),
        createTextSchema('desc', padding, headerHeight + 70, width - padding * 2 - qrSize - 5, 40, 8, '#374151'),
        // QR Code
        createQrSchema('qr', width - padding - qrSize, height - padding - qrSize, qrSize),
      ],
    ],
  }
}

// A6 Long Portrait (105mm x 210mm)
const createA6LongPortraitTemplate = (): Template => {
  const width = 105
  const height = 210
  const padding = 6
  const headerHeight = 25
  const qrSize = 25

  return {
    basePdf: {
      width,
      height,
      padding: [0, 0, 0, 0],
    },
    schemas: [
      [
        // Header background
        {
          type: 'rectangle',
          name: 'header-bg',
          position: { x: 0, y: 0 },
          width: width,
          height: headerHeight,
          color: '#1e40af',
          borderWidth: 0,
        },
        // Title in header
        createTextSchema('title', padding, headerHeight / 2 + 1, width - padding * 2, 12, 10, '#ffffff', 'left'),
        // Content
        createTextSchema('datetime', padding, headerHeight + 10, width - padding * 2, 8, 6, '#374151'),
        createTextSchema('location', padding, headerHeight + 20, width - padding * 2, 8, 6, '#374151'),
        createTextSchema('speaker', padding, headerHeight + 35, width - padding * 2, 8, 5, '#6b7280'),
        createTextSchema('desc', padding, headerHeight + 50, width - padding * 2, 120, 5, '#374151'),
        // QR Code
        createQrSchema('qr', width - padding - qrSize, height - padding - qrSize, qrSize),
      ],
    ],
  }
}

// A6 Long Landscape (210mm x 105mm)
const createA6LongLandscapeTemplate = (): Template => {
  const width = 210
  const height = 105
  const padding = 8
  const headerHeight = 25
  const qrSize = 25

  return {
    basePdf: {
      width,
      height,
      padding: [0, 0, 0, 0],
    },
    schemas: [
      [
        // Header background
        {
          type: 'rectangle',
          name: 'header-bg',
          position: { x: 0, y: 0 },
          width: width,
          height: headerHeight,
          color: '#1e40af',
        },
        // Title in header
        createTextSchema('title', padding, headerHeight / 2 + 1, width - padding * 2, 12, 12, '#ffffff', 'left'),
        // Content - two columns for better space usage
        createTextSchema('datetime', padding, headerHeight + 10, 90, 8, 7, '#374151'),
        createTextSchema('location', 110, headerHeight + 10, 90, 8, 7, '#374151'),
        createTextSchema('speaker', padding, headerHeight + 22, 90, 8, 6, '#6b7280'),
        createTextSchema('desc', padding, headerHeight + 35, width - padding * 2 - qrSize - 5, 45, 6, '#374151'),
        // QR Code
        createQrSchema('qr', width - padding - qrSize, height - padding - qrSize, qrSize),
      ],
    ],
  }
}

// Get default templates (factory functions)
const getDefaultTemplates = (): Record<LayoutFormat, Template> => ({
  'a5-portrait': createA5PortraitTemplate(),
  'a5-landscape': createA5LandscapeTemplate(),
  'a6-long-portrait': createA6LongPortraitTemplate(),
  'a6-long-landscape': createA6LongLandscapeTemplate(),
})

// Template factory - uses stored templates if available
export const getTemplate = (format: LayoutFormat): Template => {
  const storedTemplates = templateStorage.loadTemplates()
  if (storedTemplates && storedTemplates[format]) {
    return storedTemplates[format]
  }

  // Fall back to default templates
  switch (format) {
    case 'a5-portrait':
      return createA5PortraitTemplate()
    case 'a5-landscape':
      return createA5LandscapeTemplate()
    case 'a6-long-portrait':
      return createA6LongPortraitTemplate()
    case 'a6-long-landscape':
      return createA6LongLandscapeTemplate()
    default:
      throw new Error(`Unknown layout format: ${format}`)
  }
}

// Get all templates - uses stored templates if available
export const getAllTemplates = (): Record<LayoutFormat, Template> => {
  const storedTemplates = templateStorage.loadTemplates()
  if (storedTemplates) {
    return storedTemplates
  }
  
  // Fall back to default templates
  return getDefaultTemplates()
}

// Placeholder image for empty image fields (1x1 transparent PNG)
const PLACEHOLDER_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

// Convert FlyerData to pdfme input format (now supports dynamic fields)
export const flyerDataToInput = (data: FlyerData | Record<string, string>): Record<string, string> => {
  // Get all templates to check field types
  const templates = getAllTemplates()
  const imageFields = new Set<string>()
  
  // Collect all image field names
  Object.values(templates).forEach(template => {
    template.schemas[0]?.forEach(schema => {
      if (schema.type === 'image') {
        imageFields.add(schema.name)
      }
    })
  })
  
  // If data is already a Record<string, string>, process it
  if (!('title' in data) && !('datetime' in data)) {
    const result = { ...(data as Record<string, string>) }
    // Ensure image fields have valid data URLs
    imageFields.forEach(fieldName => {
      if (!result[fieldName] || result[fieldName].trim() === '') {
        result[fieldName] = PLACEHOLDER_IMAGE
      }
    })
    return result
  }
  
  // Otherwise, convert FlyerData to Record<string, string>
  const flyerData = data as FlyerData
  const result: Record<string, string> = {
    title: flyerData.title || '',
    datetime: flyerData.datetime || '',
    location: flyerData.location || '',
    speaker: flyerData.speaker || '',
    desc: flyerData.desc || '',
    qr: flyerData.qr || 'https://example.com',
  }
  
  // Add any additional fields from data
  Object.keys(data).forEach(key => {
    if (!(key in result)) {
      const value = (data as any)[key] || ''
      // For image fields, use placeholder if empty
      result[key] = (imageFields.has(key) && !value) ? PLACEHOLDER_IMAGE : value
    }
  })
  
  return result
}

// Get all layout formats
export const getAllFormats = (): LayoutFormat[] => [
  'a5-portrait',
  'a5-landscape',
  'a6-long-portrait',
  'a6-long-landscape',
]
