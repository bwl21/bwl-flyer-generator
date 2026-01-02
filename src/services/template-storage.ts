import type { Template } from '@pdfme/common'
import type { LayoutFormat } from '../types/flyer'
import type { FieldMapping } from './appointment-mapper'

const STORAGE_KEY = 'bwl-flyer-templates'

export interface TemplateWithMapping {
  template: Template
  appointmentMapping?: FieldMapping
}

export interface StoredTemplates {
  version: string
  templates: Record<LayoutFormat, TemplateWithMapping>
  updatedAt: string
}

export class TemplateStorageService {
  saveTemplates(templates: Record<LayoutFormat, Template | TemplateWithMapping>): void {
    try {
      const data: StoredTemplates = {
        version: '1.0',
        templates: templates as Record<LayoutFormat, TemplateWithMapping>,
        updatedAt: new Date().toISOString()
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save templates:', error)
    }
  }

  loadTemplates(): Record<LayoutFormat, TemplateWithMapping> | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null
      const data = JSON.parse(stored)
      // Migration logic for old format
      if (data.templates) {
        const firstTemplate = Object.values(data.templates)[0] as any
        if (firstTemplate && firstTemplate.schemas && !firstTemplate.template) {
          // Old format detected - migrate
          const migratedTemplates: Record<LayoutFormat, TemplateWithMapping> = {} as Record<LayoutFormat, TemplateWithMapping>
          for (const [key, template] of Object.entries(data.templates)) {
            migratedTemplates[key as LayoutFormat] = {
              template: template as Template,
              appointmentMapping: undefined
            }
          }
          const migratedData: StoredTemplates = {
            version: '1.0',
            templates: migratedTemplates,
            updatedAt: new Date().toISOString()
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedData))
          return migratedTemplates
        }
      }
      return data.templates
    } catch (error) {
      console.error('Failed to load templates:', error)
      return null
    }
  }

  loadTemplatesOnly(): Record<LayoutFormat, Template> | null {
    const stored = this.loadTemplates()
    if (!stored) return null
    const result: Record<LayoutFormat, Template> = {} as Record<LayoutFormat, Template>
    for (const [key, value] of Object.entries(stored)) {
      result[key as LayoutFormat] = value.template
    }
    return result
  }

  getMapping(format: LayoutFormat): FieldMapping | null {
    const stored = this.loadTemplates()
    if (!stored || !stored[format]) return null
    return stored[format].appointmentMapping || null
  }

  saveMapping(format: LayoutFormat, mapping: FieldMapping): void {
    const stored = this.loadTemplates()
    if (!stored) return
    if (stored[format]) {
      stored[format].appointmentMapping = mapping
      this.saveTemplates(stored)
    }
  }

  hasCustomTemplates(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null
  }

  clearTemplates(): void {
    localStorage.removeItem(STORAGE_KEY)
  }

  getLastUpdate(): string | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null
      const data: StoredTemplates = JSON.parse(stored)
      return data.updatedAt
    } catch (error) {
      return null
    }
  }
}

export const templateStorage = new TemplateStorageService()

// --- TemplateSet-Storage-Interfaces und Engines ---

export interface TemplateSetStorageEngine {
  listSets(): Promise<string[]>
  loadSet(name: string): Promise<TemplateSet | null>
  saveSet(set: TemplateSet): Promise<void>
  deleteSet(name: string): Promise<void>
  exportSet?(name: string): Promise<string>
  importSet?(json: string): Promise<void>
  getType(): string
}

export interface TemplateSet {
  name: string
  templates: Record<string, any>
  [key: string]: any
}

export class LocalStorageTemplateSetEngine implements TemplateSetStorageEngine {
  private prefix = 'templateSet:'

  async listSets(): Promise<string[]> {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(this.prefix))
    return keys.map(k => k.replace(this.prefix, ''))
  }

  async loadSet(name: string): Promise<TemplateSet | null> {
    const raw = localStorage.getItem(this.prefix + name)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  async saveSet(set: TemplateSet): Promise<void> {
    localStorage.setItem(this.prefix + set.name, JSON.stringify(set))
  }

  async deleteSet(name: string): Promise<void> {
    localStorage.removeItem(this.prefix + name)
  }

  async exportSet(name: string): Promise<string> {
    const set = await this.loadSet(name)
    return set ? JSON.stringify(set, null, 2) : ''
  }

  async importSet(json: string): Promise<void> {
    const set = JSON.parse(json)
    if (set && set.name) {
      await this.saveSet(set)
    }
  }

  getType(): string {
    return 'localstorage'
  }
}

// Placeholder for ChurchTools KV-Store Funktionen (nicht verwendet in dieser Implementierung)
async function getKvStore(): Promise<any> { return {} }
async function setKvStore(): Promise<void> { }
async function deleteKvStore(): Promise<void> { }

export class ChurchToolsKvStoreTemplateSetEngine implements TemplateSetStorageEngine {
  private prefix = 'templateSet:'

  async listSets(): Promise<string[]> {
    const all = await getKvStore()
    const serialized = Object.keys(all).filter(k => k.startsWith(this.prefix)).map(k => k.replace(this.prefix, ''))
    return serialized
  }

  async loadSet(name: string): Promise<TemplateSet | null> {
    const all = await getKvStore()
    const serialized = all[this.prefix + name]
    return serialized ? JSON.parse(serialized) : null
  }

  async saveSet(_set: TemplateSet): Promise<void> {
    await setKvStore()
  }

  async deleteSet(_name: string): Promise<void> {
    await deleteKvStore()
  }

  async exportSet(name: string): Promise<string> {
    const set = await this.loadSet(name)
    return set ? JSON.stringify(set, null, 2) : ''
  }

  async importSet(json: string): Promise<void> {
    const set = JSON.parse(json)
    if (set && set.name) {
      await this.saveSet(set)
    }
  }

  getType(): string {
    return 'churchtools'
  }
}