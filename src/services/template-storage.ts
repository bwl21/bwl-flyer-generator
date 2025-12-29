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

/**
 * Service for persisting edited templates to localStorage
 */
export class TemplateStorageService {
  /**
   * Save templates to localStorage
   */
  saveTemplates(templates: Record<LayoutFormat, Template | TemplateWithMapping>): void {
    try {
      // Load existing data to preserve mappings
      const existing = this.loadTemplates()
      
      // Normalize templates to TemplateWithMapping format
      const normalizedTemplates: Partial<Record<LayoutFormat, TemplateWithMapping>> = {}
      
      for (const [key, value] of Object.entries(templates) as [LayoutFormat, Template | TemplateWithMapping][]) {
        const isTemplateWithMapping = (val: any): val is TemplateWithMapping => {
          return val && typeof val === 'object' && 'template' in val
        }
        
        if (isTemplateWithMapping(value)) {
          // Already in TemplateWithMapping format
          normalizedTemplates[key] = value
        } else {
          // Plain Template, wrap it and preserve existing mapping
          normalizedTemplates[key] = {
            template: value as Template,
            appointmentMapping: existing?.[key]?.appointmentMapping
          }
        }
      }
      
      const data: StoredTemplates = {
        version: '1.0',
        templates: normalizedTemplates as Record<LayoutFormat, TemplateWithMapping>,
        updatedAt: new Date().toISOString(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save templates:', error)
      throw new Error('Failed to save templates to storage')
    }
  }

  /**
   * Load templates from localStorage
   */
  loadTemplates(): Record<LayoutFormat, TemplateWithMapping> | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null

      const data: StoredTemplates = JSON.parse(stored)
      return data.templates
    } catch (error) {
      console.error('Failed to load templates:', error)
      return null
    }
  }
  
  /**
   * Load only the Template objects (without mapping)
   */
  loadTemplatesOnly(): Record<LayoutFormat, Template> | null {
    const stored = this.loadTemplates()
    if (!stored) return null
    
    const result: Record<LayoutFormat, Template> = {} as Record<LayoutFormat, Template>
    for (const [key, value] of Object.entries(stored)) {
      result[key as LayoutFormat] = value.template
    }
    return result
  }
  
  /**
   * Get appointment mapping for a specific template
   */
  getMapping(format: LayoutFormat): FieldMapping | null {
    const stored = this.loadTemplates()
    if (!stored || !stored[format]) return null
    return stored[format].appointmentMapping || null
  }
  
  /**
   * Save appointment mapping for a specific template
   */
  saveMapping(format: LayoutFormat, mapping: FieldMapping): void {
    const stored = this.loadTemplates()
    if (!stored) return
    
    if (stored[format]) {
      stored[format].appointmentMapping = mapping
      this.saveTemplates(stored)
    }
  }

  /**
   * Check if custom templates exist
   */
  hasCustomTemplates(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null
  }

  /**
   * Clear stored templates (reset to defaults)
   */
  clearTemplates(): void {
    localStorage.removeItem(STORAGE_KEY)
  }

  /**
   * Get last update timestamp
   */
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
