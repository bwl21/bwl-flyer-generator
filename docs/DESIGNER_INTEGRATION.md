# PDFme Designer Integration mit Custom Template Format

## Problem

PDFme Designer erwartet das **Standard PDFme Template-Format**:

```typescript
{
  basePdf: { width: 148, height: 210 },
  schemas: [[
    {
      type: "text",
      name: "title",
      position: { x: 10, y: 23 },
      width: 128,
      height: 20,
      fontSize: 14,
      fontColor: "#ffffff"
    }
  ]]
}
```

Unser **Custom Format** mit Shared Fields:

```json
{
  "shared": {
    "fieldDefinitions": {
      "title": {
        "type": "text",
        "name": "title",
        "fontColor": "#ffffff"
      }
    }
  },
  "templates": {
    "a5-portrait": {
      "schemas": [[
        {
          "$field": "title",
          "position": { "x": 10, "y": 23 },
          "width": 128,
          "height": 20
        }
      ]]
    }
  }
}
```

**Frage:** Kann der Designer mit unserem Custom-Format arbeiten?

**Antwort:** Nein, direkt nicht. Aber wir können konvertieren!

## Lösung: Bidirektionale Konvertierung

### Architektur

```
┌─────────────────────────────────────────────────────┐
│              Custom Template Format                 │
│  (mit $field-Referenzen und shared definitions)    │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   Template Converter          │
        │   ├─ expand()                 │
        │   └─ compress()               │
        └───────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│           Standard PDFme Template Format            │
│     (vollständig aufgelöst, für Designer)          │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
                ┌───────────────┐
                │ PDFme Designer│
                └───────────────┘
```

### Workflow

#### 1. Template laden → Designer öffnen

```typescript
// 1. Lade Custom Template
const customTemplate = await templateLoader.loadFromAsset('default.json')

// 2. Wähle spezifisches Layout
const layout = customTemplate.templates['a5-portrait']

// 3. Expandiere zu PDFme-Format
const pdfmeTemplate = templateConverter.expand(layout, customTemplate.shared)

// 4. Öffne Designer
designer = new Designer({
  domContainer: container,
  template: pdfmeTemplate,  // ✅ Standard PDFme Format
  plugins: { ... }
})
```

#### 2. Designer speichern → Custom Format

```typescript
// 1. Hole geändertes Template vom Designer
const editedTemplate = designer.getTemplate()

// 2. Komprimiere zurück zu Custom Format
const compressed = templateConverter.compress(
  editedTemplate, 
  customTemplate.shared.fieldDefinitions
)

// 3. Update Custom Template
customTemplate.templates['a5-portrait'] = compressed

// 4. Speichere Custom Template
await templateLoader.save(customTemplate)
```

## Implementation

### Template Converter

```typescript
// src/services/template-converter.ts

export interface SharedDefinitions {
  colors?: Record<string, string>
  fonts?: Record<string, number>
  fieldDefinitions?: Record<string, any>
}

export class TemplateConverter {
  /**
   * Expand: Custom Format → PDFme Format
   * Löst $field-Referenzen und Variablen auf
   */
  expand(
    customTemplate: any,
    shared: SharedDefinitions
  ): Template {
    const { basePdf, schemas } = customTemplate
    
    // Resolve schemas
    const expandedSchemas = schemas.map(page =>
      page.map(field => {
        // Hat $field-Referenz?
        if (field.$field) {
          const fieldDef = shared.fieldDefinitions?.[field.$field]
          if (!fieldDef) {
            throw new Error(`Field definition '${field.$field}' not found`)
          }
          
          // Merge Definition + Template-Werte
          const { $field, ...templateValues } = field
          const merged = { ...fieldDef, ...templateValues }
          
          // Resolve Variablen
          return this.resolveVariables(merged, shared)
        }
        
        // Kein $field, nur Variablen resolven
        return this.resolveVariables(field, shared)
      })
    )
    
    return {
      basePdf,
      schemas: expandedSchemas
    }
  }
  
  /**
   * Compress: PDFme Format → Custom Format
   * Extrahiert gemeinsame Eigenschaften zurück zu $field-Referenzen
   */
  compress(
    pdfmeTemplate: Template,
    fieldDefinitions: Record<string, any>
  ): any {
    const { basePdf, schemas } = pdfmeTemplate
    
    // Komprimiere schemas
    const compressedSchemas = schemas.map(page =>
      page.map(field => {
        // Finde passende Field Definition
        const fieldDef = this.findMatchingFieldDef(field, fieldDefinitions)
        
        if (fieldDef) {
          // Extrahiere nur Template-spezifische Werte
          const templateSpecific = this.extractTemplateSpecific(field, fieldDef.definition)
          
          return {
            $field: fieldDef.name,
            ...templateSpecific
          }
        }
        
        // Keine passende Definition, behalte vollständig
        return field
      })
    )
    
    return {
      basePdf,
      schemas: compressedSchemas
    }
  }
  
  /**
   * Resolve {{variable}} placeholders
   */
  private resolveVariables(obj: any, shared: SharedDefinitions): any {
    if (typeof obj === 'string') {
      // {{colors.primary}} → #1e40af
      return obj.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const value = this.getNestedValue(shared, path)
        return value !== undefined ? value : match
      })
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const result: any = Array.isArray(obj) ? [] : {}
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.resolveVariables(value, shared)
      }
      return result
    }
    
    return obj
  }
  
  /**
   * Get nested value from object (e.g., "colors.primary")
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }
  
  /**
   * Find matching field definition by name and type
   */
  private findMatchingFieldDef(
    field: any,
    fieldDefinitions: Record<string, any>
  ): { name: string; definition: any } | null {
    for (const [name, def] of Object.entries(fieldDefinitions)) {
      if (def.name === field.name && def.type === field.type) {
        return { name, definition: def }
      }
    }
    return null
  }
  
  /**
   * Extract only template-specific properties
   * (position, width, height, fontSize)
   */
  private extractTemplateSpecific(
    field: any,
    fieldDef: any
  ): any {
    const templateSpecific: any = {}
    
    // Diese Properties sind immer template-spezifisch
    const alwaysTemplateSpecific = [
      'position', 'width', 'height', 'fontSize'
    ]
    
    for (const key of alwaysTemplateSpecific) {
      if (field[key] !== undefined) {
        templateSpecific[key] = field[key]
      }
    }
    
    // Andere Properties nur wenn sie von Definition abweichen
    for (const [key, value] of Object.entries(field)) {
      if (alwaysTemplateSpecific.includes(key)) continue
      if (key === 'name' || key === 'type') continue
      
      if (fieldDef[key] !== value) {
        templateSpecific[key] = value
      }
    }
    
    return templateSpecific
  }
}
```

### Integration in TemplateAdmin

```typescript
// src/components/admin/TemplateAdmin.vue

import { TemplateConverter } from '../../services/template-converter'

const converter = new TemplateConverter()
let currentCustomTemplate: any = null
let currentShared: SharedDefinitions = {}

// Open Designer
const openEditor = async (templateId: LayoutFormat) => {
  editingTemplateId.value = templateId
  editorVisible.value = true
  await nextTick()

  const entry = templateEntries.value.find((e) => e.id === templateId)
  if (!entry || !editorContainer.value) return

  // Destroy existing designer
  if (designer) {
    designer.destroy()
    designer = null
  }

  try {
    // Store custom template for later compression
    currentCustomTemplate = entry.customTemplate
    currentShared = entry.shared
    
    // Expand to PDFme format
    const pdfmeTemplate = converter.expand(
      currentCustomTemplate,
      currentShared
    )

    designer = new Designer({
      domContainer: editorContainer.value,
      template: pdfmeTemplate,  // ✅ Expanded format
      plugins: {
        Text: text,
        QRCode: barcodes.qrcode,
        Rectangle: rectangle,
        Image: image,
        Line: line,
      },
    })
  } catch (error) {
    console.error('Failed to initialize designer:', error)
    setStatus('Fehler beim Öffnen des Editors', 'error')
  }
}

// Save from Designer
const saveTemplate = () => {
  if (!designer || !editingTemplateId.value) return

  // Get edited template from designer
  const editedPdfmeTemplate = designer.getTemplate()
  
  // Compress back to custom format
  const compressed = converter.compress(
    editedPdfmeTemplate,
    currentShared.fieldDefinitions || {}
  )
  
  // Update entry
  const entryIndex = templateEntries.value.findIndex(
    (e) => e.id === editingTemplateId.value
  )
  
  if (entryIndex !== -1) {
    templateEntries.value[entryIndex].customTemplate = compressed
    templateEntries.value[entryIndex].template = editedPdfmeTemplate
    setStatus('Template gespeichert', 'success')
  }

  closeEditor()
}
```

## Vorteile dieser Lösung

### ✅ Designer bleibt voll funktionsfähig
- Alle Designer-Features nutzbar
- Drag & Drop
- Visuelles Editing
- Echtzeit-Vorschau

### ✅ Custom Format bleibt erhalten
- Shared Field Definitions
- Variablen
- Kompakte Speicherung

### ✅ Bidirektional
- Custom → PDFme: Für Designer
- PDFme → Custom: Nach Bearbeitung

### ✅ Transparent für Benutzer
- Benutzer sieht nur Designer
- Konvertierung im Hintergrund
- Keine manuelle Anpassung nötig

## Einschränkungen

### ⚠️ Verlust von Shared-Informationen

Wenn im Designer ein Feld komplett neu erstellt wird:

```typescript
// Benutzer fügt neues Feld im Designer hinzu
{
  type: "text",
  name: "newField",
  position: { x: 50, y: 100 },
  width: 100,
  height: 20,
  fontColor: "#000000"
}
```

**Problem:** Wir wissen nicht, ob `fontColor: "#000000"` eine gemeinsame Eigenschaft sein sollte oder template-spezifisch.

**Lösung 1: Heuristik**
```typescript
// Wenn fontColor mit einer shared color übereinstimmt, verwende Variable
if (field.fontColor === shared.colors.textDark) {
  compressed.fontColor = "{{colors.textDark}}"
}
```

**Lösung 2: Neue Felder als vollständig speichern**
```typescript
// Neue Felder ohne $field-Referenz
{
  type: "text",
  name: "newField",
  position: { x: 50, y: 100 },
  width: 100,
  height: 20,
  fontColor: "#000000"  // Vollständig, kein $field
}
```

**Lösung 3: Warnung anzeigen**
```typescript
// Nach Designer-Speicherung
if (hasNewFields) {
  showWarning(
    "Neue Felder wurden hinzugefügt. " +
    "Bitte prüfen Sie, ob diese zu shared.fieldDefinitions hinzugefügt werden sollten."
  )
}
```

### ⚠️ Manuelle Änderungen können verloren gehen

Wenn Benutzer das Custom-Format manuell bearbeitet (z.B. neue Variable hinzufügt), und dann den Designer öffnet:

```json
// Manuell hinzugefügt
"fieldDefinitions": {
  "title": {
    "fontColor": "{{colors.brandNew}}"  // Neue Variable
  }
}
```

Beim Speichern aus Designer:
```typescript
// Designer kennt nur aufgelösten Wert
{
  fontColor: "#ff0000"  // Variable ist aufgelöst
}
```

**Lösung:** Warnung beim Öffnen des Designers
```typescript
if (hasUnresolvedVariables(customTemplate)) {
  showWarning(
    "Template enthält Variablen. " +
    "Änderungen im Designer können diese überschreiben."
  )
}
```

## Empfehlung

### Workflow für Benutzer

**Option A: Designer-First (Einfach)**
```
1. Lade Template-Set
2. Öffne Designer für Layout
3. Bearbeite visuell
4. Speichere
   → Automatische Kompression zu Custom Format
```

**Option B: Code-First (Fortgeschritten)**
```
1. Bearbeite JSON direkt
2. Definiere shared.fieldDefinitions
3. Verwende $field-Referenzen
4. Teste im Designer (Read-Only)
```

**Option C: Hybrid (Empfohlen)**
```
1. Erstelle Basis-Layout im Designer
2. Exportiere als Custom Format
3. Extrahiere gemeinsame Eigenschaften manuell zu fieldDefinitions
4. Verwende Designer nur für Position/Größe-Anpassungen
```

### UI-Hinweise

```vue
<template>
  <div class="designer-warning" v-if="hasSharedFields">
    ℹ️ Dieses Template verwendet gemeinsame Feld-Definitionen.
    Änderungen an Farben und Typen sollten in der JSON-Datei gemacht werden.
    
    <button @click="showFieldDefinitions">
      Feld-Definitionen anzeigen
    </button>
  </div>
</template>
```

## Testing

### Unit Tests

```typescript
describe('TemplateConverter', () => {
  const converter = new TemplateConverter()
  
  it('should expand $field references', () => {
    const custom = {
      basePdf: { width: 148, height: 210 },
      schemas: [[
        {
          $field: 'title',
          position: { x: 10, y: 20 },
          width: 100,
          height: 20
        }
      ]]
    }
    
    const shared = {
      fieldDefinitions: {
        title: {
          type: 'text',
          name: 'title',
          fontColor: '#ffffff'
        }
      }
    }
    
    const expanded = converter.expand(custom, shared)
    
    expect(expanded.schemas[0][0]).toEqual({
      type: 'text',
      name: 'title',
      fontColor: '#ffffff',
      position: { x: 10, y: 20 },
      width: 100,
      height: 20
    })
  })
  
  it('should compress back to $field references', () => {
    const pdfme = {
      basePdf: { width: 148, height: 210 },
      schemas: [[
        {
          type: 'text',
          name: 'title',
          fontColor: '#ffffff',
          position: { x: 10, y: 20 },
          width: 100,
          height: 20
        }
      ]]
    }
    
    const fieldDefs = {
      title: {
        type: 'text',
        name: 'title',
        fontColor: '#ffffff'
      }
    }
    
    const compressed = converter.compress(pdfme, fieldDefs)
    
    expect(compressed.schemas[0][0]).toEqual({
      $field: 'title',
      position: { x: 10, y: 20 },
      width: 100,
      height: 20
    })
  })
  
  it('should resolve variables', () => {
    const custom = {
      schemas: [[
        {
          fontColor: '{{colors.primary}}'
        }
      ]]
    }
    
    const shared = {
      colors: { primary: '#1e40af' }
    }
    
    const expanded = converter.expand(custom, shared)
    
    expect(expanded.schemas[0][0].fontColor).toBe('#1e40af')
  })
})
```

## Fazit

**Ja, der PDFme Designer kann weiterhin verwendet werden!** ✅

Durch bidirektionale Konvertierung:
- Custom Format für Speicherung (kompakt, DRY)
- PDFme Format für Designer (vollständig aufgelöst)
- Automatische Konvertierung im Hintergrund

**Empfehlung:**
- Designer für Layout und Positionen
- Manuelle JSON-Bearbeitung für shared definitions
- Hybrid-Workflow für beste Ergebnisse
