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

// Layout format definitions
export type LayoutFormat = 'a5-portrait' | 'a5-landscape' | 'a6-long-portrait' | 'a6-long-landscape'

export interface LayoutConfig {
  id: LayoutFormat
  name: string
  width: number // in mm
  height: number // in mm
  filename: string
}

export const LAYOUT_CONFIGS: Record<LayoutFormat, LayoutConfig> = {
  'a5-portrait': {
    id: 'a5-portrait',
    name: 'A5 hoch',
    width: 148,
    height: 210,
    filename: 'einladung-a5-hoch.pdf',
  },
  'a5-landscape': {
    id: 'a5-landscape',
    name: 'A5 quer',
    width: 210,
    height: 148,
    filename: 'einladung-a5-quer.pdf',
  },
  'a6-long-portrait': {
    id: 'a6-long-portrait',
    name: 'A6 lang hoch',
    width: 105,
    height: 210,
    filename: 'einladung-a6lang-hoch.pdf',
  },
  'a6-long-landscape': {
    id: 'a6-long-landscape',
    name: 'A6 lang quer',
    width: 210,
    height: 105,
    filename: 'einladung-a6lang-quer.pdf',
  },
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
