import type { Template } from '@pdfme/common'

export interface TemplateSet {
  version: string
  name: string
  description?: string
  mainTemplate: string
  metadata?: {
    author?: string
    created?: string
    updated?: string
  }
  templates: Record<string, Template>
}

export interface SyncOptions {
  properties?: string[]
  fields?: string[]
  templates?: string[]
  syncBasePdf?: boolean
}

export interface FieldDiff {
  fieldName: string
  property?: string
  type: 'missing' | 'different' | 'extra'
  mainValue?: any
  targetValue?: any
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export class TemplateSyncService {
  /**
   * Sync properties from main template to other templates
   */
  syncFromMain(templateSet: TemplateSet, options: SyncOptions = {}): TemplateSet {
    const mainTemplateId = templateSet.mainTemplate
    const mainTemplate = templateSet.templates[mainTemplateId]

    if (!mainTemplate) {
      throw new Error(`Main template '${mainTemplateId}' not found`)
    }

    // Default: sync all templates except main
    const targetTemplates =
      options.templates || Object.keys(templateSet.templates).filter((id) => id !== mainTemplateId)

    // Default: sync common properties
    const propertiesToSync = options.properties || [
      'type',
      'name',
      'fontColor',
      'color',
      'alignment',
      'borderWidth',
    ]

    // Clone templateSet to avoid mutation
    const result = JSON.parse(JSON.stringify(templateSet))

    // Sync each target template
    for (const targetId of targetTemplates) {
      const targetTemplate = result.templates[targetId]
      if (!targetTemplate) continue

      // Sync basePdf if requested
      if (options.syncBasePdf && typeof mainTemplate.basePdf === 'object' && mainTemplate.basePdf !== null) {
        // Only sync padding, not dimensions
        const mainPdf = mainTemplate.basePdf as any
        const targetPdf = targetTemplate.basePdf as any
        if (mainPdf.padding && targetPdf) {
          targetPdf.padding = [...mainPdf.padding]
        }
      }

      // Sync schemas
      targetTemplate.schemas = targetTemplate.schemas.map((page: any, pageIdx: number) => {
        const mainPage = mainTemplate.schemas[pageIdx]
        if (!mainPage) return page

        return page.map((field: any) => {
          // Find corresponding field in main template
          const mainField = mainPage.find((f) => f.name === field.name)
          if (!mainField) return field

          // Filter fields if specified
          if (options.fields && !options.fields.includes(field.name)) {
            return field
          }

          // Sync specified properties
          const synced = { ...field }
          for (const prop of propertiesToSync) {
            if (mainField[prop] !== undefined) {
              synced[prop] = mainField[prop]
            }
          }

          return synced
        })
      })
    }

    return result
  }

  /**
   * Sync specific field across all templates
   */
  syncField(templateSet: TemplateSet, fieldName: string, properties?: string[]): TemplateSet {
    return this.syncFromMain(templateSet, {
      fields: [fieldName],
      properties,
    })
  }

  /**
   * Sync all color properties
   */
  syncColors(templateSet: TemplateSet): TemplateSet {
    return this.syncFromMain(templateSet, {
      properties: ['fontColor', 'color'],
    })
  }

  /**
   * Get diff between main and other templates
   */
  getDiff(templateSet: TemplateSet, targetTemplateId: string): FieldDiff[] {
    const mainTemplateId = templateSet.mainTemplate
    const mainTemplate = templateSet.templates[mainTemplateId]
    const targetTemplate = templateSet.templates[targetTemplateId]

    if (!mainTemplate || !targetTemplate) {
      return []
    }

    const diffs: FieldDiff[] = []
    const mainPage = mainTemplate.schemas[0]
    const targetPage = targetTemplate.schemas[0]

    // Check for missing fields
    for (const mainField of mainPage) {
      const targetField = targetPage.find((f) => f.name === mainField.name)
      if (!targetField) {
        diffs.push({
          fieldName: mainField.name,
          type: 'missing',
          message: `Field '${mainField.name}' missing in ${targetTemplateId}`,
        })
        continue
      }

      // Check common properties
      const commonProps = ['type', 'fontColor', 'color', 'alignment', 'borderWidth']
      for (const prop of commonProps) {
        if (mainField[prop] !== undefined && mainField[prop] !== targetField[prop]) {
          diffs.push({
            fieldName: mainField.name,
            property: prop,
            type: 'different',
            mainValue: mainField[prop],
            targetValue: targetField[prop],
            message: `${mainField.name}.${prop}: ${targetField[prop]} → ${mainField[prop]}`,
          })
        }
      }
    }

    // Check for extra fields
    for (const targetField of targetPage) {
      const mainField = mainPage.find((f) => f.name === targetField.name)
      if (!mainField) {
        diffs.push({
          fieldName: targetField.name,
          type: 'extra',
          message: `Field '${targetField.name}' exists in ${targetTemplateId} but not in main`,
        })
      }
    }

    return diffs
  }

  /**
   * Get diff count for a template
   */
  getDiffCount(templateSet: TemplateSet, targetTemplateId: string): number {
    return this.getDiff(templateSet, targetTemplateId).length
  }

  /**
   * Validate that all templates have same fields
   */
  validate(templateSet: TemplateSet): ValidationResult {
    const mainTemplateId = templateSet.mainTemplate
    const mainTemplate = templateSet.templates[mainTemplateId]

    if (!mainTemplate) {
      return {
        valid: false,
        errors: [`Main template '${mainTemplateId}' not found`],
        warnings: [],
      }
    }

    const mainFields = mainTemplate.schemas[0].map((f) => f.name)

    const errors: string[] = []
    const warnings: string[] = []

    for (const [templateId, template] of Object.entries(templateSet.templates)) {
      if (templateId === mainTemplateId) continue

      const templateFields = template.schemas[0].map((f) => f.name)

      // Check missing fields
      const missing = mainFields.filter((f) => !templateFields.includes(f))
      if (missing.length > 0) {
        errors.push(`Template '${templateId}' missing fields: ${missing.join(', ')}`)
      }

      // Check extra fields
      const extra = templateFields.filter((f) => !mainFields.includes(f))
      if (extra.length > 0) {
        warnings.push(`Template '${templateId}' has extra fields: ${extra.join(', ')}`)
      }

      // Check field order
      if (JSON.stringify(templateFields) !== JSON.stringify(mainFields)) {
        warnings.push(`Template '${templateId}' has different field order`)
      }

      // Check for property differences
      const diffs = this.getDiff(templateSet, templateId)
      const propertyDiffs = diffs.filter((d) => d.type === 'different')
      if (propertyDiffs.length > 0) {
        warnings.push(
          `Template '${templateId}' has ${propertyDiffs.length} property differences from main`
        )
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }
}
