import type { Template } from '@pdfme/common'
import type { LayoutFormat } from '../types/flyer'

const STORAGE_KEY = 'bwl-flyer-templates'

export interface StoredTemplates {
  version: string
  templates: Record<LayoutFormat, Template>
  updatedAt: string
}

/**
 * Service for persisting edited templates to localStorage
 */
export class TemplateStorageService {
  /**
   * Save templates to localStorage
   */
  saveTemplates(templates: Record<LayoutFormat, Template>): void {
    try {
      const data: StoredTemplates = {
        version: '1.0',
        templates,
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
  loadTemplates(): Record<LayoutFormat, Template> | null {
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
