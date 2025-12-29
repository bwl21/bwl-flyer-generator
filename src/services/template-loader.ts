import type { TemplateSet } from './template-sync'

export interface TemplateSetMetadata {
  id: string
  name: string
  description?: string
  version: string
  source: 'asset' | 'wiki'
  path: string
  mainTemplate?: string
  templateCount?: number
}

export class TemplateLoader {
  /**
   * List available template sets from assets folder
   */
  async listAssetTemplates(): Promise<TemplateSetMetadata[]> {
    // For now, return hardcoded list
    // In production, this could scan the public/templates folder
    // or read from a manifest file
    return [
      {
        id: 'default-church-flyers',
        name: 'Church Flyers Default',
        description: 'Standard-Vorlagen für Gemeinde-Flyer',
        version: '1.0',
        source: 'asset',
        path: '/templates/default-church-flyers.json',
        mainTemplate: 'a5-portrait',
        templateCount: 4,
      },
    ]
  }

  /**
   * Load template set from asset
   */
  async loadFromAsset(path: string): Promise<TemplateSet> {
    try {
      const response = await fetch(path)
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.statusText}`)
      }

      const data = await response.json()
      return this.validateTemplateSet(data)
    } catch (error: any) {
      console.error('Failed to load template from asset:', error)
      throw new Error(`Template konnte nicht geladen werden: ${error?.message || 'Unbekannter Fehler'}`)
    }
  }

  /**
   * Load template set by ID
   */
  async loadById(id: string): Promise<TemplateSet> {
    const templates = await this.listAssetTemplates()
    const metadata = templates.find((t) => t.id === id)

    if (!metadata) {
      throw new Error(`Template set '${id}' not found`)
    }

    return this.loadFromAsset(metadata.path)
  }

  /**
   * Save template set as JSON blob
   */
  saveAsJson(templateSet: TemplateSet): Blob {
    const json = JSON.stringify(templateSet, null, 2)
    return new Blob([json], { type: 'application/json' })
  }

  /**
   * Download template set as JSON file
   */
  downloadAsJson(templateSet: TemplateSet, filename?: string): void {
    const blob = this.saveAsJson(templateSet)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `${templateSet.name.toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Validate template set structure
   */
  private validateTemplateSet(data: any): TemplateSet {
    if (!data.version) {
      throw new Error('Template set missing version')
    }

    if (!data.name) {
      throw new Error('Template set missing name')
    }

    if (!data.templates || typeof data.templates !== 'object') {
      throw new Error('Template set missing templates')
    }

    if (!data.mainTemplate) {
      throw new Error('Template set missing mainTemplate')
    }

    if (!data.templates[data.mainTemplate]) {
      throw new Error(`Main template '${data.mainTemplate}' not found in templates`)
    }

    // Validate each template has required structure
    for (const [id, template] of Object.entries(data.templates)) {
      const t = template as any
      if (!t.basePdf) {
        throw new Error(`Template '${id}' missing basePdf`)
      }

      if (!t.schemas || !Array.isArray(t.schemas)) {
        throw new Error(`Template '${id}' missing schemas`)
      }
    }

    return data as TemplateSet
  }

  /**
   * Get metadata from template set
   */
  getMetadata(templateSet: TemplateSet): TemplateSetMetadata {
    return {
      id: templateSet.name.toLowerCase().replace(/\s+/g, '-'),
      name: templateSet.name,
      description: templateSet.description,
      version: templateSet.version,
      source: 'asset',
      path: '',
      mainTemplate: templateSet.mainTemplate,
      templateCount: Object.keys(templateSet.templates).length,
    }
  }
}
