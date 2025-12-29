# Main Template Sync Concept

## Grundidee

**Problem:** Änderungen an gemeinsamen Eigenschaften (Farben, Feldnamen) müssen in allen Templates wiederholt werden.

**Lösung:** Ein "Main Template" als Referenz + Sync-Funktionen für andere Templates.

## Konzept

### Template-Set Struktur

```json
{
  "version": "1.0",
  "name": "Church Flyers Default",
  "mainTemplate": "a5-portrait",
  "templates": {
    "a5-portrait": {
      "name": "A5 hoch",
      "basePdf": { "width": 148, "height": 210, "padding": [0, 0, 0, 0] },
      "schemas": [[
        {
          "type": "rectangle",
          "name": "header-bg",
          "position": { "x": 0, "y": 0 },
          "width": 148,
          "height": 40,
          "color": "#1e40af",
          "borderWidth": 0
        },
        {
          "type": "text",
          "name": "title",
          "position": { "x": 10, "y": 23 },
          "width": 128,
          "height": 20,
          "fontSize": 14,
          "fontColor": "#ffffff",
          "alignment": "left"
        }
      ]]
    },
    "a5-landscape": {
      "name": "A5 quer",
      "basePdf": { "width": 210, "height": 148, "padding": [0, 0, 0, 0] },
      "schemas": [[
        {
          "type": "rectangle",
          "name": "header-bg",
          "position": { "x": 0, "y": 0 },
          "width": 210,
          "height": 35,
          "color": "#1e40af",
          "borderWidth": 0
        },
        {
          "type": "text",
          "name": "title",
          "position": { "x": 10, "y": 19.5 },
          "width": 190,
          "height": 18,
          "fontSize": 12,
          "fontColor": "#ffffff",
          "alignment": "left"
        }
      ]]
    }
  }
}
```

### Gemeinsame Eigenschaften (aus Main Template)

**Feldnamen:** `header-bg`, `title`, `datetime`, `location`, `speaker`, `desc`, `qr`

**Gemeinsame Properties pro Feld:**
- `type` (text, rectangle, qrcode)
- `name` (Feldname)
- `fontColor` (bei text)
- `color` (bei rectangle)
- `alignment` (bei text)
- `borderWidth` (bei rectangle)

**Template-spezifische Properties:**
- `position` (x, y)
- `width`
- `height`
- `fontSize` (kann variieren)

## Sync-Funktionen

### 1. Sync Field Properties

Synchronisiert gemeinsame Eigenschaften eines Feldes von Main → andere Templates.

```typescript
// src/services/template-sync.ts

export interface SyncOptions {
  properties?: string[]  // Welche Properties syncen? Default: alle gemeinsamen
  fields?: string[]      // Welche Felder syncen? Default: alle
  templates?: string[]   // Welche Templates syncen? Default: alle außer main
}

export class TemplateSyncService {
  /**
   * Sync properties from main template to other templates
   */
  syncFromMain(
    templateSet: TemplateSet,
    options: SyncOptions = {}
  ): TemplateSet {
    const mainTemplateId = templateSet.mainTemplate || 'a5-portrait'
    const mainTemplate = templateSet.templates[mainTemplateId]
    
    if (!mainTemplate) {
      throw new Error(`Main template '${mainTemplateId}' not found`)
    }
    
    // Default: sync alle Templates außer main
    const targetTemplates = options.templates || 
      Object.keys(templateSet.templates).filter(id => id !== mainTemplateId)
    
    // Default: sync alle gemeinsamen Properties
    const propertiesToSync = options.properties || [
      'type', 'name', 'fontColor', 'color', 'alignment', 'borderWidth'
    ]
    
    // Für jedes Ziel-Template
    for (const targetId of targetTemplates) {
      const targetTemplate = templateSet.templates[targetId]
      if (!targetTemplate) continue
      
      // Sync schemas
      targetTemplate.schemas = targetTemplate.schemas.map((page, pageIdx) => {
        const mainPage = mainTemplate.schemas[pageIdx]
        if (!mainPage) return page
        
        return page.map(field => {
          // Finde entsprechendes Feld im Main Template
          const mainField = mainPage.find(f => f.name === field.name)
          if (!mainField) return field
          
          // Sync nur gewünschte Properties
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
    
    return templateSet
  }
  
  /**
   * Sync specific field across all templates
   */
  syncField(
    templateSet: TemplateSet,
    fieldName: string,
    properties?: string[]
  ): TemplateSet {
    return this.syncFromMain(templateSet, {
      fields: [fieldName],
      properties
    })
  }
  
  /**
   * Sync all color properties
   */
  syncColors(templateSet: TemplateSet): TemplateSet {
    return this.syncFromMain(templateSet, {
      properties: ['fontColor', 'color']
    })
  }
  
  /**
   * Get diff between main and other templates
   */
  getDiff(
    templateSet: TemplateSet,
    targetTemplateId: string
  ): FieldDiff[] {
    const mainTemplateId = templateSet.mainTemplate || 'a5-portrait'
    const mainTemplate = templateSet.templates[mainTemplateId]
    const targetTemplate = templateSet.templates[targetTemplateId]
    
    if (!mainTemplate || !targetTemplate) {
      return []
    }
    
    const diffs: FieldDiff[] = []
    const mainPage = mainTemplate.schemas[0]
    const targetPage = targetTemplate.schemas[0]
    
    for (const mainField of mainPage) {
      const targetField = targetPage.find(f => f.name === mainField.name)
      if (!targetField) {
        diffs.push({
          fieldName: mainField.name,
          type: 'missing',
          message: `Field '${mainField.name}' missing in ${targetTemplateId}`
        })
        continue
      }
      
      // Check gemeinsame Properties
      const commonProps = ['type', 'fontColor', 'color', 'alignment']
      for (const prop of commonProps) {
        if (mainField[prop] !== undefined && 
            mainField[prop] !== targetField[prop]) {
          diffs.push({
            fieldName: mainField.name,
            property: prop,
            type: 'different',
            mainValue: mainField[prop],
            targetValue: targetField[prop],
            message: `${prop}: ${mainField[prop]} → ${targetField[prop]}`
          })
        }
      }
    }
    
    return diffs
  }
  
  /**
   * Validate that all templates have same fields
   */
  validate(templateSet: TemplateSet): ValidationResult {
    const mainTemplateId = templateSet.mainTemplate || 'a5-portrait'
    const mainTemplate = templateSet.templates[mainTemplateId]
    const mainFields = mainTemplate.schemas[0].map(f => f.name)
    
    const errors: string[] = []
    const warnings: string[] = []
    
    for (const [templateId, template] of Object.entries(templateSet.templates)) {
      if (templateId === mainTemplateId) continue
      
      const templateFields = template.schemas[0].map(f => f.name)
      
      // Check missing fields
      const missing = mainFields.filter(f => !templateFields.includes(f))
      if (missing.length > 0) {
        errors.push(
          `Template '${templateId}' missing fields: ${missing.join(', ')}`
        )
      }
      
      // Check extra fields
      const extra = templateFields.filter(f => !mainFields.includes(f))
      if (extra.length > 0) {
        warnings.push(
          `Template '${templateId}' has extra fields: ${extra.join(', ')}`
        )
      }
      
      // Check field order
      if (JSON.stringify(templateFields) !== JSON.stringify(mainFields)) {
        warnings.push(
          `Template '${templateId}' has different field order`
        )
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }
}

interface FieldDiff {
  fieldName: string
  property?: string
  type: 'missing' | 'different' | 'extra'
  mainValue?: any
  targetValue?: any
  message: string
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}
```

## UI Integration

### Template Admin mit Sync-Funktionen

```vue
<template>
  <div class="template-admin">
    <!-- Template Set Info -->
    <div class="template-set-info">
      <h2>{{ templateSetName }}</h2>
      <div class="main-template-badge">
        Main Template: {{ mainTemplate }}
      </div>
    </div>

    <!-- Templates List -->
    <div class="templates-list">
      <div 
        v-for="template in templates"
        :key="template.id"
        class="template-item"
        :class="{ 'is-main': template.id === mainTemplate }"
      >
        <div class="template-header">
          <h3>{{ template.name }}</h3>
          <span v-if="template.id === mainTemplate" class="badge">Main</span>
        </div>
        
        <!-- Diff Indicator -->
        <div v-if="template.id !== mainTemplate" class="diff-indicator">
          <span v-if="getDiffCount(template.id) > 0" class="warning">
            ⚠️ {{ getDiffCount(template.id) }} Unterschiede zum Main Template
          </span>
          <span v-else class="success">
            ✓ Synchron mit Main Template
          </span>
        </div>
        
        <!-- Actions -->
        <div class="template-actions">
          <button @click="editTemplate(template.id)">
            Bearbeiten
          </button>
          
          <button 
            v-if="template.id !== mainTemplate"
            @click="showSyncDialog(template.id)"
            :disabled="getDiffCount(template.id) === 0"
          >
            Synchronisieren
          </button>
          
          <button 
            v-if="template.id !== mainTemplate"
            @click="showDiff(template.id)"
          >
            Unterschiede anzeigen
          </button>
        </div>
      </div>
    </div>

    <!-- Sync All Button -->
    <div class="global-actions">
      <button @click="syncAllFromMain" class="btn-primary">
        Alle Templates mit Main synchronisieren
      </button>
      
      <button @click="validateTemplates" class="btn-secondary">
        Templates validieren
      </button>
    </div>

    <!-- Sync Dialog -->
    <div v-if="syncDialogVisible" class="modal">
      <div class="modal-content">
        <h3>Template synchronisieren</h3>
        
        <p>
          Synchronisiere <strong>{{ syncTargetTemplate }}</strong> 
          mit Main Template <strong>{{ mainTemplate }}</strong>
        </p>
        
        <!-- Diff Preview -->
        <div class="diff-preview">
          <h4>Änderungen:</h4>
          <div 
            v-for="diff in currentDiff"
            :key="diff.fieldName + diff.property"
            class="diff-item"
          >
            <strong>{{ diff.fieldName }}</strong>
            <span v-if="diff.property">
              .{{ diff.property }}
            </span>
            <div class="diff-values">
              <span class="old-value">{{ diff.targetValue }}</span>
              →
              <span class="new-value">{{ diff.mainValue }}</span>
            </div>
          </div>
        </div>
        
        <!-- Sync Options -->
        <div class="sync-options">
          <h4>Was synchronisieren?</h4>
          <label>
            <input type="checkbox" v-model="syncOptions.colors" checked>
            Farben (fontColor, color)
          </label>
          <label>
            <input type="checkbox" v-model="syncOptions.alignment" checked>
            Ausrichtung (alignment)
          </label>
          <label>
            <input type="checkbox" v-model="syncOptions.types" checked>
            Feldtypen (type)
          </label>
        </div>
        
        <!-- Actions -->
        <div class="modal-actions">
          <button @click="performSync" class="btn-primary">
            Synchronisieren
          </button>
          <button @click="closeSyncDialog" class="btn-secondary">
            Abbrechen
          </button>
        </div>
      </div>
    </div>

    <!-- Validation Results -->
    <div v-if="validationResults" class="validation-results">
      <h3>Validierungs-Ergebnisse</h3>
      
      <div v-if="validationResults.valid" class="success">
        ✓ Alle Templates sind konsistent
      </div>
      
      <div v-if="validationResults.errors.length > 0" class="errors">
        <h4>Fehler:</h4>
        <ul>
          <li v-for="error in validationResults.errors" :key="error">
            {{ error }}
          </li>
        </ul>
      </div>
      
      <div v-if="validationResults.warnings.length > 0" class="warnings">
        <h4>Warnungen:</h4>
        <ul>
          <li v-for="warning in validationResults.warnings" :key="warning">
            {{ warning }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { TemplateSyncService } from '../../services/template-sync'

const syncService = new TemplateSyncService()

const templateSetName = ref('Church Flyers Default')
const mainTemplate = ref('a5-portrait')
const templates = ref([
  { id: 'a5-portrait', name: 'A5 hoch' },
  { id: 'a5-landscape', name: 'A5 quer' },
  { id: 'a6-long-portrait', name: 'A6 lang hoch' },
  { id: 'a6-long-landscape', name: 'A6 lang quer' },
])

const syncDialogVisible = ref(false)
const syncTargetTemplate = ref('')
const currentDiff = ref<FieldDiff[]>([])
const syncOptions = ref({
  colors: true,
  alignment: true,
  types: true
})

const validationResults = ref<ValidationResult | null>(null)

// Get diff count for a template
function getDiffCount(templateId: string): number {
  const diff = syncService.getDiff(currentTemplateSet.value, templateId)
  return diff.length
}

// Show sync dialog
function showSyncDialog(templateId: string) {
  syncTargetTemplate.value = templateId
  currentDiff.value = syncService.getDiff(currentTemplateSet.value, templateId)
  syncDialogVisible.value = true
}

// Perform sync
function performSync() {
  const properties: string[] = []
  if (syncOptions.value.colors) {
    properties.push('fontColor', 'color')
  }
  if (syncOptions.value.alignment) {
    properties.push('alignment')
  }
  if (syncOptions.value.types) {
    properties.push('type')
  }
  
  currentTemplateSet.value = syncService.syncFromMain(
    currentTemplateSet.value,
    {
      templates: [syncTargetTemplate.value],
      properties
    }
  )
  
  closeSyncDialog()
  showSuccess('Template synchronisiert')
}

// Sync all templates
function syncAllFromMain() {
  currentTemplateSet.value = syncService.syncFromMain(currentTemplateSet.value)
  showSuccess('Alle Templates synchronisiert')
}

// Validate templates
function validateTemplates() {
  validationResults.value = syncService.validate(currentTemplateSet.value)
}
</script>
```

## Workflow

### 1. Main Template bearbeiten

```
1. Öffne Main Template (z.B. a5-portrait) im Designer
2. Ändere Farbe von "title" von #ffffff → #f0f0f0
3. Speichere
```

### 2. Änderungen synchronisieren

```
Option A: Automatisch
  → Nach Speichern: "Änderungen in andere Templates übernehmen?"
  → Ja → Sync läuft automatisch

Option B: Manuell
  → Gehe zu Template-Liste
  → Sehe "⚠️ 1 Unterschied zum Main Template" bei anderen Templates
  → Klicke "Synchronisieren"
  → Wähle was syncen (Farben, Alignment, etc.)
  → Bestätige
```

### 3. Unterschiede prüfen

```
1. Klicke "Unterschiede anzeigen"
2. Sehe Liste:
   - title.fontColor: #ffffff → #f0f0f0
   - header-bg.color: #1e40af → #1e40af (gleich)
3. Entscheide welche Änderungen übernehmen
```

## Vorteile

### ✅ Bleibt bei PDFme-Format
- Keine Custom-Syntax
- Volle Kompatibilität
- Teilnahme an Weiterentwicklung

### ✅ Designer voll nutzbar
- Keine Konvertierung nötig
- Alle Features verfügbar
- Echtzeit-Vorschau

### ✅ Flexibel
- Wähle was synchronisiert wird
- Selektive Sync (nur Farben, nur Alignment, etc.)
- Kann Sync auch ablehnen

### ✅ Transparent
- Sehe Unterschiede vor Sync
- Validierung zeigt Inkonsistenzen
- Keine versteckten Änderungen

## Beispiel-Szenarien

### Szenario 1: Farbe ändern

```typescript
// Main Template: Ändere title.fontColor
mainTemplate.schemas[0][1].fontColor = '#f0f0f0'

// Sync zu allen anderen
syncService.syncColors(templateSet)

// Resultat: Alle Templates haben jetzt #f0f0f0
```

### Szenario 2: Neues Feld hinzufügen

```typescript
// Main Template: Füge "subtitle" hinzu
mainTemplate.schemas[0].push({
  type: 'text',
  name: 'subtitle',
  position: { x: 10, y: 45 },
  width: 128,
  height: 10,
  fontSize: 10,
  fontColor: '#374151'
})

// Andere Templates: Manuell hinzufügen mit angepassten Positionen
// (Kann nicht automatisch syncen, da Position template-spezifisch ist)

// Dann: Sync nur gemeinsame Properties
syncService.syncField(templateSet, 'subtitle', ['type', 'fontColor'])
```

### Szenario 3: Validierung

```typescript
// Prüfe ob alle Templates konsistent sind
const result = syncService.validate(templateSet)

if (!result.valid) {
  console.log('Fehler:', result.errors)
  // ["Template 'a5-landscape' missing fields: subtitle"]
}

if (result.warnings.length > 0) {
  console.log('Warnungen:', result.warnings)
  // ["Template 'a6-long-portrait' has different field order"]
}
```

## Template-Set Datei-Format

```json
{
  "version": "1.0",
  "name": "Church Flyers Default",
  "description": "Standard-Vorlagen für Gemeinde-Flyer",
  "mainTemplate": "a5-portrait",
  "metadata": {
    "author": "Gemeinde XYZ",
    "created": "2025-12-27",
    "updated": "2025-12-29"
  },
  "templates": {
    "a5-portrait": {
      "name": "A5 hoch",
      "basePdf": { 
        "width": 148, 
        "height": 210, 
        "padding": [0, 0, 0, 0] 
      },
      "schemas": [[ /* PDFme schemas */ ]]
    },
    "a5-landscape": {
      "name": "A5 quer",
      "basePdf": { 
        "width": 210, 
        "height": 148, 
        "padding": [0, 0, 0, 0] 
      },
      "schemas": [[ /* PDFme schemas */ ]]
    }
  }
}
```

## Migration

Bestehende Templates können einfach migriert werden:

```typescript
// Alte Struktur (einzelne Templates)
const oldTemplates = {
  'a5-portrait': getTemplate('a5-portrait'),
  'a5-landscape': getTemplate('a5-landscape'),
}

// Neue Struktur (Template-Set)
const newTemplateSet = {
  version: '1.0',
  name: 'Church Flyers Default',
  mainTemplate: 'a5-portrait',
  templates: oldTemplates
}

// Speichern
await saveTemplateSet(newTemplateSet)
```

## Persistierung

### Format: Ein JSON-File pro Template-Set ✅

```
public/templates/default-church-flyers.json
```

**Struktur:**
```json
{
  "version": "1.0",
  "name": "Church Flyers Default",
  "mainTemplate": "a5-portrait",
  "templates": {
    "a5-portrait": { /* PDFme Template */ },
    "a5-landscape": { /* PDFme Template */ },
    "a6-long-portrait": { /* PDFme Template */ },
    "a6-long-landscape": { /* PDFme Template */ }
  }
}
```

**Begründung:**
- ✅ Git-freundlich (lesbare Diffs)
- ✅ Einfach zu implementieren
- ✅ Ausreichend für 4 Templates (~80 KB)
- ✅ Keine ZIP-Komplexität nötig

### Sync erweitern für basePdf

Auch Hintergrundbilder/basePdf synchronisieren:

```typescript
syncService.syncFromMain(templateSet, {
  properties: ['fontColor', 'color', 'alignment', 'type', 'name'],
  syncBasePdf: true  // ✅ Auch basePdf vom Main Template übernehmen
})
```

## Nächste Schritte

1. ✅ Konzept dokumentiert
2. ✅ Format entschieden (JSON)
3. [ ] `TemplateSyncService` implementieren
4. [ ] UI-Komponenten für Sync
5. [ ] Validierung und Diff-Anzeige
6. [ ] Tests schreiben
7. [ ] Migration bestehender Templates
