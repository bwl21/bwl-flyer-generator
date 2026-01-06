// Flyer data schema matching pdfme template fields
export interface FlyerData {
  title: string
  datetime: string
  location: string
  speaker: string
  desc: string
  qr: string
  image1?: string
}

// Standard DIN paper sizes in mm
export const PAPER_SIZES = {
  'a0': { width: 841, height: 1189, name: 'DIN A0' },
  'a1': { width: 594, height: 841, name: 'DIN A1' },
  'a2': { width: 420, height: 594, name: 'DIN A2' },
  'a3': { width: 297, height: 420, name: 'DIN A3' },
  'a4': { width: 210, height: 297, name: 'DIN A4' },
  'a5': { width: 148, height: 210, name: 'DIN A5' },
  'a6': { width: 105, height: 148, name: 'DIN A6' },
  'a7': { width: 74, height: 105, name: 'DIN A7' },
  'a8': { width: 52, height: 74, name: 'DIN A8' },
  'a9': { width: 37, height: 52, name: 'DIN A9' },
  'a10': { width: 26, height: 37, name: 'DIN A10' },
  'dl': { width: 99, height: 210, name: 'DIN Lang (DL)' },
  'c6': { width: 114, height: 162, name: 'C6 (114 x 162 mm)' },
  'c5': { width: 162, height: 229, name: 'C5 (162 x 229 mm)' },
  'c4': { width: 229, height: 324, name: 'C4 (229 x 324 mm)' },
} as const

type PaperSize = keyof typeof PAPER_SIZES
type Orientation = 'portrait' | 'landscape'

// Layout format definitions
export type LayoutFormat = `${PaperSize}-${Orientation}` | string

export interface LayoutConfig {
  id: LayoutFormat
  name: string
  width: number // in mm
  height: number // in mm
  filename: string
  format: string // DIN format name
}

// Helper function to create layout config
const createLayoutConfig = (
  size: PaperSize,
  orientation: Orientation,
  customName?: string
): LayoutConfig => {
  const base = PAPER_SIZES[size]
  const isLandscape = orientation === 'landscape'
  const width = isLandscape ? Math.max(base.width, base.height) : Math.min(base.width, base.height)
  const height = isLandscape ? Math.min(base.width, base.height) : Math.max(base.width, base.height)
  
  return {
    id: `${size}-${orientation}` as LayoutFormat,
    name: customName || `${base.name} ${orientation === 'portrait' ? 'hoch' : 'quer'}`,
    width,
    height,
    filename: `einladung-${size}-${orientation}.pdf`,
    format: base.name
  }
}

export const LAYOUT_CONFIGS: Record<LayoutFormat, LayoutConfig> = {
  // A4 Format
  'a4-portrait': createLayoutConfig('a4', 'portrait', 'A4 hoch'),
  'a4-landscape': createLayoutConfig('a4', 'landscape', 'A4 quer'),
  
  // A5 Format
  'a5-portrait': createLayoutConfig('a5', 'portrait', 'A5 hoch'),
  'a5-landscape': createLayoutConfig('a5', 'landscape', 'A5 quer'),
  
  // A6 Format
  'a6-portrait': createLayoutConfig('a6', 'portrait', 'A6 hoch'),
  'a6-landscape': createLayoutConfig('a6', 'landscape', 'A6 quer'),
  
  // DIN Lang Format (DL)
  'dl-portrait': createLayoutConfig('dl', 'portrait', 'DIN Lang hoch'),
  'dl-landscape': createLayoutConfig('dl', 'landscape', 'DIN Lang quer'),
}

// Project file structure for saving/loading
export interface FlyerProject {
  version: string
  data: FlyerData
  templateSetId?: string
  createdAt: string
  updatedAt: string
}

// Template set for admin management

// TemplateSetEntry bleibt für UI-Tabellen, aber TemplateSet.templates ist jetzt ein Record
export interface TemplateSetEntry {
  id: LayoutFormat
  name: string
  format: string
  fields: string[]
  template: import('@pdfme/common').Template
}

export interface TemplateSet {
  version: string
  name: string
  templates: Record<LayoutFormat, import('@pdfme/common').Template>
  mainTemplate?: LayoutFormat
  createdAt: string
  updatedAt: string
}
