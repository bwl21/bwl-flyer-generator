import type { Template, Schema } from '@pdfme/common'
import type { LayoutFormat, FlyerData } from '../types/flyer'

// Convert mm to points (1mm = 2.83465 points)
const mmToPt = (mm: number): number => mm * 2.83465

// Base64 encoded 1x1 pixel blue image for header background
const bluePixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/n4EIwDiqH6kfVQAAAABJRU5ErkJggg=='

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
      width: mmToPt(width),
      height: mmToPt(height),
      padding: [0, 0, 0, 0],
    },
    schemas: [
      [
        // Header background
        {
          type: 'rect',
          name: 'header-bg',
          position: { x: 0, y: 0 },
          width: width,
          height: headerHeight,
          backgroundColor: '#1e40af',
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
      width: mmToPt(width),
      height: mmToPt(height),
      padding: [0, 0, 0, 0],
    },
    schemas: [
      [
        // Header background
        {
          type: 'rect',
          name: 'header-bg',
          position: { x: 0, y: 0 },
          width: width,
          height: headerHeight,
          backgroundColor: '#1e40af',
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
      width: mmToPt(width),
      height: mmToPt(height),
      padding: [0, 0, 0, 0],
    },
    schemas: [
      [
        // Header background
        {
          type: 'rect',
          name: 'header-bg',
          position: { x: 0, y: 0 },
          width: width,
          height: headerHeight,
          backgroundColor: '#1e40af',
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
      width: mmToPt(width),
      height: mmToPt(height),
      padding: [0, 0, 0, 0],
    },
    schemas: [
      [
        // Header background
        {
          type: 'rect',
          name: 'header-bg',
          position: { x: 0, y: 0 },
          width: width,
          height: headerHeight,
          backgroundColor: '#1e40af',
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

// Template factory
export const getTemplate = (format: LayoutFormat): Template => {
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

// Get all templates
export const getAllTemplates = (): Record<LayoutFormat, Template> => ({
  'a5-portrait': createA5PortraitTemplate(),
  'a5-landscape': createA5LandscapeTemplate(),
  'a6-long-portrait': createA6LongPortraitTemplate(),
  'a6-long-landscape': createA6LongLandscapeTemplate(),
})

// Convert FlyerData to pdfme input format
export const flyerDataToInput = (data: FlyerData): Record<string, string> => ({
  title: data.title || '',
  datetime: data.datetime || '',
  location: data.location || '',
  speaker: data.speaker || '',
  desc: data.desc || '',
  qr: data.qr || 'https://example.com',
})

// Get all layout formats
export const getAllFormats = (): LayoutFormat[] => [
  'a5-portrait',
  'a5-landscape',
  'a6-long-portrait',
  'a6-long-landscape',
]
