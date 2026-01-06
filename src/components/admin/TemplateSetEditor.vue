// Initialisiere beim Mounten, falls selectedTemplateSet.value schon gesetzt ist
onMounted(() => {
  if (selectedTemplateSet.value) {
    console.debug('[TemplateSetEditor] onMounted: initialisiere mit selectedTemplateSet', selectedTemplateSet.value)
    // Das gleiche wie im watch, aber direkt beim Mount
    const newSet = selectedTemplateSet.value
    templateSetName.value = newSet.name
    if (newSet.templates && typeof newSet.templates === 'object') {
      templateEntries.value = Object.entries(newSet.templates).map(([id, template]) => {
        const config = LAYOUT_CONFIGS[id as LayoutFormat] || { name: id, width: (template as Template).basePdf?.width, height: (template as Template).basePdf?.height }
        const fields = (template && (template as Template).schemas && (template as Template).schemas[0])
          ? (template as Template).schemas[0].map((s: any) => s.name)
          : []
        return {
          id: id as LayoutFormat,
          name: config.name,
          format: `${config.width}×${config.height}mm`,
          fields,
          template: template as Template,
        }
      })
      if (newSet.mainTemplate) {
        mainTemplateId.value = newSet.mainTemplate as LayoutFormat
      }
    }
  }
})
<template>
  <div class="template-admin">


    <div class="admin-content">
      <!-- Template Set Management -->
      <section class="section-card">
        <h2 class="section-title">aktives TemplateSet</h2>
        <div class="template-set-actions">
          <span class="template-set-name">
            {{ templateSetName }}
            <span v-if="usingCustomTemplates" class="badge badge-warning">Angepasst</span>
            <span v-else class="badge badge-success">Standard</span>
          </span>
          <label class="btn btn-secondary">
            ZIP hochladen
            <input type="file" accept=".zip" @change="handleUploadTemplateSet" hidden />
          </label>
          <button type="button" class="btn btn-secondary" @click="downloadTemplateSet">
            ZIP herunterladen
          </button>
          <button 
            v-if="usingCustomTemplates" 
            type="button" 
            class="btn btn-secondary"
            @click="resetToDefaults"
          >
            Zurücksetzen
          </button>
        </div>
      </section>

      <!-- Templates List -->
      <section class="section-card">
        <h2 class="section-title">Vorlagen im Set</h2>
        <div class="templates-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Format</th>
                <th>Felder</th>
                <th>Sync Status</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in templateEntries" :key="entry.id">
                <td>
                  {{ entry.id }}
                  <span v-if="entry.id === mainTemplateId" class="badge badge-main">Main</span>
                </td>
                <td>{{ entry.name }}</td>
                <td class="fields-cell">{{ entry.fields.join(', ') }}</td>
                <td>
                  <span v-if="entry.id !== mainTemplateId" class="sync-status">
                    <span v-if="getDiffCount(entry.id) === 0" class="badge badge-success">✓ Synced</span>
                    <span v-else class="badge badge-warning">{{ getDiffCount(entry.id) }} diffs</span>
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button
                      type="button"
                      class="btn btn-primary btn-sm"
                      @click="openEditor(entry.id)"
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      @click="openMappingEditor(entry.id)"
                    >
                      Mapping
                    </button>
                    <button
                      v-if="entry.id !== mainTemplateId"
                      type="button"
                      class="btn btn-danger btn-sm"
                      @click="confirmDeleteTemplate(entry)"
                    >
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="table-actions">
          <button type="button" class="btn btn-secondary" @click="openAddLayoutDialog">
            Neues Layout hinzufügen
          </button>
          <button 
            type="button" 
            class="btn btn-secondary"
            @click="showDeletedTemplates = true"
            :disabled="deletedTemplates.length === 0"
          >
            Gelöschte Templates anzeigen
          </button>
          <button type="button" class="btn btn-primary" @click="toggleSyncPanel">
            {{ showSyncPanel ? 'Sync Panel schließen' : 'Sync Panel öffnen' }}
          </button>
          <button type="button" class="btn btn-success" @click="exportTemplatesJson">
            Templates als JSON exportieren
          </button>
        </div>
        
        <div v-if="usingCustomTemplates" class="info-note">
          ℹ️ Änderungen werden automatisch gespeichert und im Flyer-Generator verwendet
        </div>
      </section>

      <!-- Sync Panel -->
      <section v-if="showSyncPanel" class="section-card sync-panel">
        <h2 class="section-title">Template Synchronization</h2>
        
        <div class="sync-controls">
          <div class="sync-control-group">
            <label>Main Template:</label>
            <select v-model="mainTemplateId" @change="calculateDiffs" class="sync-select">
              <option v-for="entry in templateEntries" :key="entry.id" :value="entry.id">
                {{ entry.id }} - {{ entry.name }}
              </option>
            </select>
          </div>
          
          <button type="button" class="btn btn-primary" @click="syncFromMain">
            Sync All from Main
          </button>
        </div>

        <div class="diffs-container">
          <div v-for="entry in templateEntries" :key="entry.id" class="diff-section">
            <div v-if="entry.id !== mainTemplateId && templateDiffs[entry.id]">
              <h3 class="diff-title">
                {{ entry.id }}
                <span class="diff-count">{{ templateDiffs[entry.id].length }} differences</span>
              </h3>
              
              <div v-if="templateDiffs[entry.id].length === 0" class="diff-empty">
                ✓ No differences - template is in sync
              </div>
              
              <div v-else class="diff-list">
                <div v-for="(diff, idx) in templateDiffs[entry.id]" :key="idx" class="diff-item" :class="`diff-${diff.type}`">
                  <span class="diff-type-badge">{{ diff.type }}</span>
                  <span class="diff-message">{{ diff.message }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Status -->
      <div v-if="status" class="status-card" :class="statusClass">
        {{ status }}
      </div>

      <!-- No Active Set Info -->
      <div v-if="noActiveSet" class="no-active-set-info">
        <p>ℹ️ Kein aktives Vorlagenset gefunden. Bitte wählen Sie ein Vorlagenset aus oder erstellen Sie ein neues.</p>
      </div>
    </div>



    <!-- Editor Modal -->
    <div v-if="editorVisible" class="editor-modal">
      <div class="editor-modal-content">
        <div class="editor-header">
          <h3>Template bearbeiten: {{ editingTemplateId }}</h3>
          <div class="editor-actions">
            <button type="button" class="btn btn-warning" @click="applyDefaultSchemaToCurrentTemplate">
              Default Schema
            </button>
            <button type="button" class="btn btn-primary" @click="saveTemplate">
              Speichern
            </button>
            <button type="button" class="btn btn-secondary" @click="closeEditor">
              Schließen
            </button>
          </div>
        </div>
        <div ref="editorContainer" class="editor-container"></div>
      </div>
    </div>

    <!-- Mapping Editor Modal -->
    <div v-if="mappingEditorVisible" class="editor-modal">
      <div class="mapping-modal-content">
        <div class="editor-header">
          <h3>Appointment-Mapping: {{ editingMappingId }}</h3>
          <div class="editor-actions">
            <button type="button" class="btn btn-primary" @click="saveMappingConfig">
              Speichern
            </button>
            <button type="button" class="btn btn-secondary" @click="closeMappingEditor">
              Schließen
            </button>
          </div>
        </div>
        <div class="mapping-editor-content">
          <p class="mapping-description">
            Ordnen Sie ChurchTools-Termin-Daten den Template-Feldern zu:
          </p>
          <div class="mapping-list">
            <div v-for="field in currentTemplateFields" :key="field" class="mapping-row">
              <label class="mapping-field-label">{{ field }}</label>
              <select v-model="currentMapping[field]" class="mapping-select">
                <option value="">-- Nicht zuordnen --</option>
                <option 
                  v-for="(label, key) in appointmentFieldLabels" 
                  :key="key" 
                  :value="key"
                >
                  {{ label }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Add Layout Dialog -->
    <div v-if="showAddLayoutDialog" class="editor-modal">
      <div class="editor-modal-content">
        <div class="editor-header">
          <h3>Neues Layout hinzufügen</h3>
        </div>
        <div class="editor-body">
          <div class="form-group">
            <label>Papierformat</label>
            <select v-model="newLayout.format" class="form-control">
              <option v-for="size in paperSizes" :key="size.id" :value="size.id">
                {{ size.name }} ({{ PAPER_SIZES[size.id].width }} × {{ PAPER_SIZES[size.id].height }} mm)
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Ausrichtung</label>
            <div class="form-check">
              <input 
                id="orientation-portrait" 
                v-model="newLayout.orientation" 
                type="radio" 
                value="portrait" 
                class="form-check-input"
              >
              <label for="orientation-portrait" class="form-check-label">Hochformat</label>
            </div>
            <div class="form-check">
              <input 
                id="orientation-landscape" 
                v-model="newLayout.orientation" 
                type="radio" 
                value="landscape" 
                class="form-check-input"
              >
              <label for="orientation-landscape" class="form-check-label">Querformat</label>
            </div>
          </div>
          <div class="form-group">
            <label>Name des Layouts</label>
            <input 
              v-model="newLayout.name" 
              type="text" 
              class="form-control" 
              :placeholder="generatedLayoutName"
            >
            <small class="form-text text-muted">Leer lassen, um den Standardnamen zu verwenden: {{ generatedLayoutName }}</small>
          </div>
          <div class="form-group mt-3 p-3 bg-light rounded">
            <div class="mb-2"><strong>Vorschau:</strong></div>
            <div>Name: {{ newLayout.name || generatedLayoutName }}</div>
            <div>Format: {{ PAPER_SIZES[newLayout.format]?.name }} ({{ newLayout.orientation === 'portrait' ? 'Hochformat' : 'Querformat' }})</div>
            <div>Abmessungen: 
              {{ newLayout.orientation === 'portrait' 
                ? `${Math.min(PAPER_SIZES[newLayout.format]?.width, PAPER_SIZES[newLayout.format]?.height)} × ${Math.max(PAPER_SIZES[newLayout.format]?.width, PAPER_SIZES[newLayout.format]?.height)} mm`
                : `${Math.max(PAPER_SIZES[newLayout.format]?.width, PAPER_SIZES[newLayout.format]?.height)} × ${Math.min(PAPER_SIZES[newLayout.format]?.width, PAPER_SIZES[newLayout.format]?.height)} mm`
              }}
            </div>
          </div>
        </div>
        <div class="editor-actions">
          <button class="btn btn-secondary" @click="closeAddLayoutDialog">Abbrechen</button>
          <button class="btn btn-primary" @click="addLayoutToSet">Hinzufügen</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Deleted Templates Modal -->
  <div v-if="showDeletedTemplates" class="modal-overlay" @click.self="showDeletedTemplates = false">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Gelöschte Templates</h3>
        <button type="button" class="close" @click="showDeletedTemplates = false">
          &times;
        </button>
      </div>
      <div class="modal-body">
        <div v-if="deletedTemplates.length === 0" class="text-muted">
          Keine gelöschten Templates vorhanden.
        </div>
        <div v-else>
          <div v-for="deleted in deletedTemplates" :key="deleted.id" class="deleted-item">
            <div class="deleted-item-info">
              <div class="deleted-item-name">{{ deleted.name }}</div>
              <div class="deleted-item-time">
                Gelöscht am {{ new Date(deleted.timestamp).toLocaleString() }}
              </div>
            </div>
            <button 
              @click="restoreTemplate(deleted.id)" 
              class="btn btn-sm btn-primary"
            >
              Wiederherstellen
            </button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="showDeletedTemplates = false">
          Schließen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, inject, watch, onMounted } from 'vue'
import { toast } from '../../services/toast-service'
// Reagiere auf Tab-Wechsel und lade das aktuelle Set neu, wenn auf Admin gewechselt wird
const activeTab = inject('activeTab', ref('generator'))
watch(activeTab, (tab) => {
  if (tab === 'admin' && selectedTemplateSet.value) {
    // Trigger UI-Update durch erneutes Setzen
    console.debug('[TemplateSetEditor] activeTab switched to admin, reloading selectedTemplateSet', selectedTemplateSet.value)
    // Der bestehende watch auf selectedTemplateSet.value übernimmt das eigentliche Laden
    // Wir können hier ggf. templateSetName.value = selectedTemplateSet.value.name setzen, aber der bestehende watch reicht aus
  }
})
import type { Ref } from 'vue'
import type { TemplateSet, LayoutFormat } from '../../types/flyer'
import type { Template } from '@pdfme/common'
const selectedTemplateSet = inject<Ref<TemplateSet | null>>('selectedTemplateSet')
console.debug('[TemplateSetEditor] script setup: selectedTemplateSet injected', selectedTemplateSet)
// Exportiere die aktuellen Templates als JSON-Datei
function exportTemplatesJson() {
  const exportData = {
    version: '1.0',
    name: templateSetName.value,
    mainTemplate: mainTemplateId.value,
    templates: Object.fromEntries(templateEntries.value.map(e => [e.id, e.template])),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${templateSetName.value}-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success('Templates exportiert', 'Templates wurden als JSON exportiert');
}
// Import PAPER_SIZES and LayoutFormat from flyer types
import { PAPER_SIZES, type LayoutFormat, type LayoutConfig } from '../../types/flyer'

// Dialog-Logik für neues Layout
const showAddLayoutDialog = ref(false)
const newLayout = ref({
  id: '',
  name: '',
  format: 'a5',
  orientation: 'portrait' as 'portrait' | 'landscape'
})

// Get available paper sizes for dropdown (only A4, A5, A6, and DIN Lang)
const paperSizes = Object.entries(PAPER_SIZES)
  .filter(([key]) => ['a4', 'a5', 'a6', 'dl'].includes(key))
  .map(([key, value]) => ({
    id: key,
    name: value.name
  }))

// Generate layout name based on selection
const generatedLayoutName = computed(() => {
  const size = PAPER_SIZES[newLayout.value.format as keyof typeof PAPER_SIZES]?.name || ''
  const orientation = newLayout.value.orientation === 'portrait' ? 'hoch' : 'quer'
  return `${size} ${orientation}`
})

function openAddLayoutDialog() {
  newLayout.value = { 
    id: '', 
    name: '',
    format: 'a5',
    orientation: 'portrait'
  }
  showAddLayoutDialog.value = true
}

function closeAddLayoutDialog() {
  showAddLayoutDialog.value = false
}

const addLayoutToSet = () => {
  const format = `${newLayout.value.format}-${newLayout.value.orientation}` as LayoutFormat
  const size = PAPER_SIZES[newLayout.value.format as keyof typeof PAPER_SIZES]
  
  if (!size) {
    toast.error('Fehler', 'Ungültiges Format ausgewählt')
    return
  }
  
  // Use the generated name or custom name if provided
  const name = newLayout.value.name || generatedLayoutName.value
  
  // Generate ID from name
  const id = name.trim().toLowerCase().replace(/\s+/g, '-') as LayoutFormat
  
  if (!id) {
    toast.error('Fehler', 'Name darf nicht leer sein')
    return
  }
  
  if (templateEntries.value.some(e => e.id === id)) {
    toast.error('Fehler', 'Layout mit dieser ID existiert bereits')
    return
  }
  
  // Calculate dimensions based on orientation
  const isLandscape = newLayout.value.orientation === 'landscape'
  const width = isLandscape ? Math.max(size.width, size.height) : Math.min(size.width, size.height)
  const height = isLandscape ? Math.min(size.width, size.height) : Math.max(size.width, size.height)
  
  // Create template with calculated dimensions
  const template = {
    basePdf: { 
      width, 
      height, 
      padding: [0, 0, 0, 0] as [number, number, number, number] 
    },
    schemas: [[], []],
  }
  
  templateEntries.value.push({
    id,
    name,
    format: `${width}×${height} mm`,
    fields: [],
    template
  })
  
  console.debug('[TemplateSetEditor] Adding new layout:', { id, name, width, height })
  saveTemplatesToStorage()
  toast.success('Layout hinzugefügt', `Layout "${name}" wurde erfolgreich hinzugefügt`)
  showAddLayoutDialog.value = false
}
import { Designer } from '@pdfme/ui'
import { text, barcodes, rectangle, image, line } from '@pdfme/schemas'
import type { Template } from '@pdfme/common'
import JSZip from 'jszip'
import type { TemplateSetEntry } from '../../types/flyer'
import { LAYOUT_CONFIGS } from '../../types/flyer'
import { getTemplate, getAllTemplates, createA5PortraitTemplate, createA5LandscapeTemplate, createA6LongPortraitTemplate, createA6LongLandscapeTemplate } from '../../services/pdfme-templates'
import { 
  TemplateSyncService, 
  type FieldDiff,
  type TemplateSet as SyncTemplateSet 
} from '../../services/template-sync'
import { templateStorage } from '../../services/template-storage'
import { 
  APPOINTMENT_FIELD_LABELS,
  type FieldMapping 
} from '../../services/appointment-mapper'
import { templateSetStorage } from '../../services/template-set-storage'

// State
const templateSetName = ref('')
const templateEntries = ref<TemplateSetEntry[]>([])
// Debug-Ausgabe bei Änderung
watch(templateSetName, (val) => console.debug('[TemplateSetEditor] templateSetName geändert:', val))
watch(templateEntries, (val) => console.debug('[TemplateSetEditor] templateEntries geändert:', val), { deep: true })
const status = ref('')
const statusType = ref<'info' | 'success' | 'error'>('info')

const editorVisible = ref(false)
const editingTemplateId = ref<LayoutFormat | null>(null)
const editorContainer = ref<HTMLDivElement | null>(null)
let designer: Designer | null = null

// Sync state
const syncService = new TemplateSyncService()
const mainTemplateId = ref<LayoutFormat>('a5-portrait')
const templateDiffs = ref<Record<string, FieldDiff[]>>({})
const showSyncPanel = ref(false)

// Mapping editor state
const mappingEditorVisible = ref(false)
const editingMappingId = ref<LayoutFormat | null>(null)
const currentMapping = ref<FieldMapping>({})
const currentTemplateFields = ref<string[]>([])
const appointmentFieldLabels = APPOINTMENT_FIELD_LABELS

const statusClass = computed(() => ({
  'status-info': statusType.value === 'info',
  'status-success': statusType.value === 'success',
  'status-error': statusType.value === 'error',
}))

// Initialize with templates (stored or default)
const initializeTemplates = () => {
  const allTemplates = getAllTemplates()
  if (!allTemplates) {
    console.error('No templates available')
    return
  }
  console.debug('[TemplateSetEditor] initializeTemplates: Default-Templates werden geladen', allTemplates)
  templateEntries.value = Object.entries(allTemplates)
    .filter(([id, template]) => {
      const config = LAYOUT_CONFIGS[id as LayoutFormat]
      return config && template
    })
    .map(([id, template]) => {
      const config = LAYOUT_CONFIGS[id as LayoutFormat]
      const fields = (template && template.schemas && template.schemas[0]) 
        ? template.schemas[0].map((s) => s.name) 
        : []
      return {
        id: id as LayoutFormat,
        name: config.name,
        format: `${config.width}×${config.height}mm`,
        fields,
        template,
      }
    })
}

// initializeTemplates() wird nur noch beim Reset aufgerufen, nicht mehr automatisch beim Laden

// Check if using custom templates
const usingCustomTemplates = ref(templateStorage.hasCustomTemplates())

// Status helper
const setStatus = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
  status.value = message
  statusType.value = type
  if (type !== 'error') {
    setTimeout(() => {
      if (status.value === message) {
        status.value = ''
      }
    }, 3000)
  }
}

// Prepare template for Designer (convert basePdf object to serializable format)
const prepareTemplateForDesigner = (template: Template): Template => {
  // Deep clone the template to avoid mutation
  const cloned = JSON.parse(JSON.stringify(template))
  return cloned
}

// Open pdfme Designer
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
    // Prepare template - JSON serialize/deserialize to ensure it's cloneable
    const preparedTemplate = prepareTemplateForDesigner(entry.template)

    designer = new Designer({
      domContainer: editorContainer.value,
      template: preparedTemplate,
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

// Save template from editor
const saveTemplate = () => {
  if (!designer || !editingTemplateId.value) return

  const updatedTemplate = designer.getTemplate()
  const entryIndex = templateEntries.value.findIndex((e) => e.id === editingTemplateId.value)

  if (entryIndex !== -1) {
    const fields = updatedTemplate.schemas[0]?.map((s) => s.name) || []
    templateEntries.value[entryIndex] = {
      ...templateEntries.value[entryIndex],
      fields,
      template: updatedTemplate,
    }
    
    // Save to storage
    saveTemplatesToStorage()
    setStatus('Template gespeichert', 'success')
  }

  closeEditor()
}

// Save all templates to storage
const saveTemplatesToStorage = () => {
  try {
    // Speichere in templateStorage (für einzelne Templates)
    const templates: Record<LayoutFormat, Template> = {}
    for (const entry of templateEntries.value) {
      templates[entry.id] = entry.template
    }
    templateStorage.saveTemplates(templates)
    usingCustomTemplates.value = true
    
    // Speichere auch im TemplateSet (global)
    if (selectedTemplateSet.value) {
      const updatedSet = {
        ...selectedTemplateSet.value,
        templates: templates,
        updatedAt: new Date().toISOString()
      }
      
      selectedTemplateSet.value = updatedSet
      templateSetStorage.saveTemplateSet(updatedSet)
      console.debug('[TemplateSetEditor] TemplateSet updated and saved globally')
    }
    
    console.debug('[TemplateSetEditor] Templates saved to storage')
  } catch (error) {
    console.error('Failed to save templates:', error)
    setStatus('Fehler beim Speichern', 'error')
  }
}

// Reset to default templates
const resetToDefaults = () => {
  if (!confirm('Möchten Sie wirklich alle Änderungen verwerfen und zu den Standard-Templates zurückkehren?')) {
    return
  }
  
  templateStorage.clearTemplates()
  usingCustomTemplates.value = false
  initializeTemplates()
  calculateDiffs()
  setStatus('Templates auf Standard zurückgesetzt', 'success')
}

// Close editor
const closeEditor = () => {
  if (designer) {
    designer.destroy()
    designer = null
  }
  editorVisible.value = false
  editingTemplateId.value = null
}

// Upload template set ZIP
const handleUploadTemplateSet = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const zip = await JSZip.loadAsync(file)
    const newEntries: TemplateSetEntry[] = []

    // Look for manifest.json or individual template files
    const manifestFile = zip.file('manifest.json')
    if (manifestFile) {
      const manifestContent = await manifestFile.async('string')
      const manifest = JSON.parse(manifestContent) as TemplateSet

      for (const entry of manifest.templates) {
        const templateFile = zip.file(`${entry.id}.json`)
        if (templateFile) {
          const templateContent = await templateFile.async('string')
          const template = JSON.parse(templateContent) as Template
          newEntries.push({
            ...entry,
            template,
          })
        }
      }

      templateSetName.value = manifest.name || file.name.replace('.zip', '')
    } else {
      // Try to load individual JSON files
      for (const [filename, zipEntry] of Object.entries(zip.files)) {
        if (filename.endsWith('.json') && !zipEntry.dir) {
          const content = await zipEntry.async('string')
          const template = JSON.parse(content) as Template
          const id = filename.replace('.json', '') as LayoutFormat

          if (LAYOUT_CONFIGS[id]) {
            const config = LAYOUT_CONFIGS[id]
            const fields = template.schemas[0]?.map((s) => s.name) || []
            newEntries.push({
              id,
              name: config.name,
              format: `${config.width}×${config.height}mm`,
              fields,
              template,
            })
          }
        }
      }

      templateSetName.value = file.name.replace('.zip', '')
    }

    if (newEntries.length > 0) {
      templateEntries.value = newEntries
      saveTemplatesToStorage()
      
      // Erstelle TemplateSet-Objekt und setze es als aktives Set
      const uploadedSet: TemplateSet = {
        version: '1.0',
        name: templateSetName.value,
        mainTemplate: mainTemplateId.value,
        templates: Object.fromEntries(newEntries.map(e => [e.id, e.template])),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      // Speichere als TemplateSet in localStorage
      await templateSetStorage.saveTemplateSet(uploadedSet)
      await templateSetStorage.setActiveTemplateSet(uploadedSet.name)
      
      // Setze selectedTemplateSet für die globale State-Verwaltung
      selectedTemplateSet.value = uploadedSet
      
      console.debug('[TemplateSetEditor] Uploaded set saved as active template set', uploadedSet)
      
      // Recalculate diffs if sync panel is open
      if (showSyncPanel.value) {
        calculateDiffs()
      }
      
      setStatus(`${newEntries.length} Vorlagen geladen und als aktives Set gespeichert`, 'success')
    } else {
      setStatus('Keine gültigen Vorlagen gefunden', 'error')
    }
  } catch (error) {
    console.error('Failed to load template set:', error)
    setStatus('Fehler beim Laden des Vorlagensets', 'error')
  }

  input.value = ''
}

// Download template set as ZIP
const downloadTemplateSet = async () => {
  try {
    const zip = new JSZip()

    // Create manifest
    const manifest: TemplateSet = {
      version: '1.0',
      name: templateSetName.value,
      templates: templateEntries.value.map((e) => ({
        id: e.id,
        name: e.name,
        format: e.format,
        fields: e.fields,
        template: e.template,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    zip.file('manifest.json', JSON.stringify(manifest, null, 2))

    // Add individual template files
    for (const entry of templateEntries.value) {
      zip.file(`${entry.id}.json`, JSON.stringify(entry.template, null, 2))
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const customSuffix = usingCustomTemplates.value ? '-custom' : ''
    link.download = `${templateSetName.value}${customSuffix}-${timestamp}.zip`
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    const templateCount = templateEntries.value.length
    const customNote = usingCustomTemplates.value ? ' (angepasst)' : ''
    setStatus(`${templateCount} Templates heruntergeladen${customNote}`, 'success')
  } catch (error) {
    console.error('Failed to download template set:', error)
    setStatus('Fehler beim Herunterladen', 'error')
  }
}

// Add new layout (öffnet Dialog)
const addNewLayout = () => {
  openAddLayoutDialog()
}

// Sync functionality
const buildTemplateSet = (): SyncTemplateSet => {
  const templates: Record<string, Template> = {}
  for (const entry of templateEntries.value) {
    templates[entry.id] = entry.template
  }
  
  return {
    version: '1.0',
    name: templateSetName.value,
    mainTemplate: mainTemplateId.value,
    templates,
    metadata: {
      updated: new Date().toISOString(),
    },
  }
}

const calculateDiffs = () => {
  const templateSet = buildTemplateSet()
  const diffs: Record<string, FieldDiff[]> = {}
  
  for (const entry of templateEntries.value) {
    if (entry.id !== mainTemplateId.value) {
      diffs[entry.id] = syncService.getDiff(templateSet, entry.id)
    }
  }
  
  templateDiffs.value = diffs
}

const toggleSyncPanel = () => {
  if (!showSyncPanel.value) {
    calculateDiffs()
  }
  showSyncPanel.value = !showSyncPanel.value
}

const syncFromMain = () => {
  try {
    const templateSet = buildTemplateSet()
    const synced = syncService.syncFromMain(templateSet, {
      syncBasePdf: false,
      addMissingFields: true,
    })
    
    // Update template entries with synced templates
    for (const entry of templateEntries.value) {
      if (entry.id !== mainTemplateId.value && synced.templates[entry.id]) {
        entry.template = synced.templates[entry.id]
        const fields = entry.template.schemas[0]?.map((s) => s.name) || []
        entry.fields = fields
      }
    }
    
    // Save to storage
    saveTemplatesToStorage()
    calculateDiffs()
    setStatus('Templates synchronized', 'success')
  } catch (error) {
    console.error('Sync failed:', error)
    setStatus('Fehler beim Synchronisieren', 'error')
  }
}

const getDiffCount = (templateId: string): number => {
  return templateDiffs.value[templateId]?.length || 0
}

// Default Schema in das aktuell bearbeitete Template einfügen
const applyDefaultSchemaToCurrentTemplate = () => {
  console.debug('[TemplateSetEditor] applyDefaultSchemaToCurrentTemplate called')
  
  if (!editingTemplateId.value) {
    setStatus('Kein Template ausgewählt', 'error')
    return
  }
  
  // Finde den aktuellen Template-Eintrag
  const currentEntry = templateEntries.value.find(e => e.id === editingTemplateId.value)
  if (!currentEntry) {
    setStatus('Template nicht gefunden', 'error')
    return
  }
  
  // Hole das Default-Schema für diesen Template-Typ
  let defaultSchema = null
  try {
    switch (editingTemplateId.value) {
      case 'a5-portrait':
        defaultSchema = createA5PortraitTemplate().schemas[0]
        break
      case 'a5-landscape':
        defaultSchema = createA5LandscapeTemplate().schemas[0]
        break
      case 'a6-long-portrait':
        defaultSchema = createA6LongPortraitTemplate().schemas[0]
        break
      case 'a6-long-landscape':
        defaultSchema = createA6LongLandscapeTemplate().schemas[0]
        break
      default:
        setStatus('Unbekanntes Template-Format', 'error')
        return
    }
  } catch (error) {
    console.error('Fehler beim Erstellen des Default-Schemas:', error)
    setStatus('Fehler beim Erstellen des Default-Schemas', 'error')
    return
  }
  
  if (!defaultSchema) {
    setStatus('Konnte Default-Schema nicht erstellen', 'error')
    return
  }
  
  console.debug('[TemplateSetEditor] Applying default schema to current template', defaultSchema)
  
  // Entferne leere Image-Felder aus dem Default-Schema
  const filteredSchema = defaultSchema.filter((field: any) => field.type !== 'image')
  
  // Füge das Default-Schema dem aktuellen Template hinzu
  const updatedTemplate = {
    ...currentEntry.template,
    schemas: [filteredSchema] // Ersetze das gesamte Schema mit Default-Werten (ohne leere Images)
  }
  
  // Aktualisiere den Eintrag
  currentEntry.template = updatedTemplate
  currentEntry.fields = filteredSchema.map((s: any) => s.name)
  
  // Speichere die Änderungen
  saveTemplatesToStorage()
  
  // Aktualisiere das selectedTemplateSet global
  if (selectedTemplateSet.value) {
    const updatedTemplates: Record<LayoutFormat, any> = {}
    for (const entry of templateEntries.value) {
      updatedTemplates[entry.id] = entry.template
    }
    
    const updatedSet = {
      ...selectedTemplateSet.value,
      templates: updatedTemplates,
      updatedAt: new Date().toISOString()
    }
    
    selectedTemplateSet.value = updatedSet
    templateSetStorage.saveTemplateSet(updatedSet)
  }
  
  // Aktualisiere den Designer, falls geöffnet
  updateDesigner(updatedTemplate)
  
  setStatus('Default-Schema eingefügt', 'success')
  console.debug('[TemplateSetEditor] Default schema applied to current template')
}

// Hilfsfunktion zum Aktualisieren des Designers
const updateDesigner = async (template: any) => {
  if (designer) {
    try {
      // Zerstöre den aktuellen Designer und erstelle ihn neu mit dem neuen Template
      designer.destroy()
      designer = null
      
      await nextTick()
      
      if (editorContainer.value) {
        designer = new Designer({
          domContainer: editorContainer.value,
          template: template,
          plugins: {
            Text: text,
            QRCode: barcodes.qrcode,
            Rectangle: rectangle,
            Image: image,
            Line: line,
          },
        })
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Designers:', error)
      setStatus('Fehler beim Aktualisieren des Designers', 'error')
    }
  }
}

// Mapping editor functions
const openMappingEditor = (templateId: LayoutFormat) => {
  editingMappingId.value = templateId
  
  // Get template fields
  const entry = templateEntries.value.find(e => e.id === templateId)
  if (!entry) return
  
  currentTemplateFields.value = entry.fields.filter(f => f !== 'header-bg')
  
  // Load existing mapping or create empty one
  const existingMapping = templateStorage.getMapping(templateId)
  currentMapping.value = existingMapping || {}
  
  // Ensure all fields have an entry
  currentTemplateFields.value.forEach(field => {
    if (!(field in currentMapping.value)) {
      currentMapping.value[field] = ''
    }
  })
  
  mappingEditorVisible.value = true
}

const closeMappingEditor = () => {
  mappingEditorVisible.value = false
  editingMappingId.value = null
  currentMapping.value = {}
  currentTemplateFields.value = []
}

const saveMappingConfig = () => {
  if (!editingMappingId.value) return
  
  // Save mapping to storage
  templateStorage.saveMapping(editingMappingId.value, currentMapping.value)
  
  setStatus('Mapping gespeichert', 'success')
  closeMappingEditor()
}

const noActiveSet = ref(true) // Standardmäßig auf true setzen

// Funktion zum Verarbeiten eines Template-Sets
function processTemplateSet(newSet: TemplateSet | null) {
  console.debug('[TemplateSetEditor] processTemplateSet', newSet)
  console.debug('[TemplateSetEditor] newSet type:', typeof newSet)
  console.debug('[TemplateSetEditor] newSet.name:', newSet?.name)
  if (newSet && typeof newSet === 'object' && newSet.name) {
    console.debug('[TemplateSetEditor] Processing new set with name:', newSet.name)
    templateSetName.value = newSet.name
    if (newSet.templates && typeof newSet.templates === 'object') {
      console.debug('[TemplateSetEditor] Processing templates:', Object.keys(newSet.templates))
      templateEntries.value = Object.entries(newSet.templates).map(([id, template]) => {
        const config = LAYOUT_CONFIGS[id as LayoutFormat] || { name: id, width: (template as Template).basePdf?.width, height: (template as Template).basePdf?.height }
        const fields = (template && (template as Template).schemas && (template as Template).schemas[0])
          ? (template as Template).schemas[0].map((s: any) => s.name)
          : []
        return {
          id: id as LayoutFormat,
          name: config.name,
          format: `${config.width}×${config.height}mm`,
          fields,
          template: template as Template,
        }
      })
      if (newSet.mainTemplate) {
        mainTemplateId.value = newSet.mainTemplate as LayoutFormat
      }
    }
    // Wichtig: Setze noActiveSet auf false, wenn wir ein Set haben
    console.debug('[TemplateSetEditor] Setting noActiveSet to false')
    noActiveSet.value = false
  } else {
    // Wenn kein Set vorhanden, setze noActiveSet auf true
    console.debug('[TemplateSetEditor] Setting noActiveSet to true')
    noActiveSet.value = true
  }
}

onMounted(() => {
  console.debug('[TemplateSetEditor] onMounted called')
  // Prüfe, ob schon ein selectedTemplateSet vorhanden ist
  if (selectedTemplateSet.value) {
    console.debug('[TemplateSetEditor] selectedTemplateSet already set, processing it')
    processTemplateSet(selectedTemplateSet.value)
  } else {
    console.debug('[TemplateSetEditor] no selectedTemplateSet, checking localStorage')
    // Fallback zu localStorage
    templateSetStorage.getActiveTemplateSet().then(async (activeName) => {
      if (activeName) {
        const set = await templateSetStorage.loadTemplateSet(activeName)
        if (set) {
          processTemplateSet(set)
        }
      }
    })
  }
})

// watch für selectedTemplateSet: baute TemplateSetEntry[] für die UI aus dem Record
watch(selectedTemplateSet, (newSet: TemplateSet | null) => {
  console.debug('[TemplateSetEditor] selectedTemplateSet changed', newSet)
  processTemplateSet(newSet)
})

// Deleted templates state
const showDeletedTemplates = ref(false);
const deletedTemplates = ref<Array<{
  id: LayoutFormat;
  name: string;
  data: any;
  timestamp: number;
}>>([]);

// Load deleted templates from localStorage when component mounts
onMounted(() => {
  loadDeletedTemplates();
});

// Load deleted templates from localStorage
const loadDeletedTemplates = () => {
  try {
    const saved = localStorage.getItem('deletedTemplates');
    if (saved) {
      deletedTemplates.value = JSON.parse(saved);
    }
  } catch (error) {
    console.error('Fehler beim Laden des Papierkorbs:', error);
  }
};

// Save deleted templates to localStorage
const saveDeletedTemplates = () => {
  try {
    localStorage.setItem('deletedTemplates', JSON.stringify(deletedTemplates.value));
  } catch (error) {
    console.error('Fehler beim Speichern des Papierkorbs:', error);
  }
};

// Show confirmation dialog before deleting
const confirmDeleteTemplate = (entry: { id: LayoutFormat; name: string; template: any }) => {
  if (confirm(`Möchten Sie das Template "${entry.name}" wirklich löschen?`)) {
    deleteTemplate(entry);
  }
};

// Delete a template
const deleteTemplate = (entry: { id: LayoutFormat; name: string; template: any }) => {
  try {
    // Store the template in deletedTemplates
    deletedTemplates.value.unshift({
      id: entry.id,
      name: entry.name,
      data: JSON.parse(JSON.stringify(entry.template)), // Deep clone
      timestamp: Date.now()
    });
    
    // Keep only the last 10 deleted templates
    if (deletedTemplates.value.length > 10) {
      deletedTemplates.value.pop();
    }
    
    // Save deleted templates
    saveDeletedTemplates();
    
    // Remove the template from the active list
    const index = templateEntries.value.findIndex(t => t.id === entry.id);
    if (index !== -1) {
      templateEntries.value.splice(index, 1);
      saveTemplatesToStorage();
      toast.success('Template gelöscht', `"${entry.name}" wurde in den Papierkorb verschoben.`);
    }
  } catch (error) {
    console.error('Fehler beim Löschen des Templates:', error);
    toast.error('Fehler', 'Das Template konnte nicht gelöscht werden.');
  }
};

// Restore a deleted template
const restoreTemplate = (templateId: LayoutFormat) => {
  const deletedIndex = deletedTemplates.value.findIndex(t => t.id === templateId);
  if (deletedIndex === -1) return;
  
  const templateToRestore = deletedTemplates.value[deletedIndex];
  
  // Add back to active templates if it doesn't exist
  if (!templateEntries.value.some(t => t.id === templateToRestore.id)) {
    templateEntries.value.push({
      id: templateToRestore.id,
      name: templateToRestore.name,
      template: templateToRestore.data,
      format: `${templateToRestore.data.basePdf.width}×${templateToRestore.data.basePdf.height}mm`,
      fields: templateToRestore.data.schemas[0]?.map((s: any) => s.name) || []
    });
    
    saveTemplatesToStorage();
    
    // Remove from deleted templates
    deletedTemplates.value.splice(deletedIndex, 1);
    saveDeletedTemplates();
    
    // Close the modal if no more deleted templates
    if (deletedTemplates.value.length === 0) {
      showDeletedTemplates.value = false;
    }
    
    toast.success('Wiederhergestellt', `"${templateToRestore.name}" wurde erfolgreich wiederhergestellt.`);
  }
};

// selectedTemplateSet is now injected at the top
</script>

<style scoped>
/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}

.modal-content {
  background: white;
  border-radius: 0.5rem;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 1rem;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.modal-body {
  padding: 1rem;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid #dee2e6;
  display: flex;
  justify-content: flex-end;
}

.deleted-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background-color: #f8f9fa;
  border-radius: 0.25rem;
}

.deleted-item:last-child {
  margin-bottom: 0;
}

.deleted-item-info {
  flex: 1;
  margin-right: 1rem;
}

.deleted-item-name {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.deleted-item-time {
  font-size: 0.8rem;
  color: #6c757d;
}

.close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  line-height: 1;
}

/* Ensure the modal is above other content */
.modal-overlay {
  z-index: 2000;
}

/* Add some spacing between buttons */
.table-actions > * {
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
}

/* Make sure the table is responsive */
.table-responsive {
  overflow-x: auto;
}

/* Style for the table */
.table {
  width: 100%;
  margin-bottom: 1rem;
  color: #212529;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 0.75rem;
  vertical-align: top;
  border-top: 1px solid #dee2e6;
}

.table thead th {
  vertical-align: bottom;
  border-bottom: 2px solid #dee2e6;
}

/* Style for buttons */
.btn {
  display: inline-block;
  font-weight: 400;
  text-align: center;
  white-space: nowrap;
  vertical-align: middle;
  user-select: none;
  border: 1px solid transparent;
  padding: 0.375rem 0.75rem;
  font-size: 0.9rem;
  line-height: 1.5;
  border-radius: 0.25rem;
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out,
    border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
  border-radius: 0.2rem;
}

.btn-primary {
  color: #fff;
  background-color: #007bff;
  border-color: #007bff;
}

.btn-primary:hover {
  background-color: #0069d9;
  border-color: #0062cc;
}

.btn-secondary {
  color: #fff;
  background-color: #6c757d;
  border-color: #6c757d;
}

.btn-secondary:hover {
  background-color: #5a6268;
  border-color: #545b62;
}

.btn-danger {
  color: #fff;
  background-color: #dc3545;
  border-color: #dc3545;
}

.btn-danger:hover {
  background-color: #c82333;
  border-color: #bd2130;
}

.btn-success {
  color: #fff;
  background-color: #28a745;
  border-color: #28a745;
}

.btn-success:hover {
  background-color: #218838;
  border-color: #1e7e34;
}

/* Disabled state for buttons */
.btn:disabled,
.btn.disabled {
  opacity: 0.65;
  pointer-events: none;
}

/* Text utilities */
.text-muted {
  color: #6c757d !important;
}

/* Responsive utilities */
@media (max-width: 768px) {
  .table-actions {
    display: flex;
    flex-wrap: wrap;
  }
  
  .table-actions > * {
    flex: 1 0 auto;
    margin-bottom: 0.5rem;
  }
}
/* Verbesserte Dialog-Form für Layout-Hinzufügen */
.editor-modal-content {
  max-width: 90vw; /* Breiter für bessere Benutzererfahrung */
  width: 90vw;
  max-height: 85vh; /* Höher für bessere Benutzererfahrung */
  margin: auto;
  box-shadow: 0 4px 32px rgba(0,0,0,0.12);
}

.mapping-modal-content {
  max-width: 600px;
  width: 100%;
  margin: auto;
  box-shadow: 0 4px 32px rgba(0,0,0,0.12);
}
.editor-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.form-control {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 1rem;
  background: #f9fafb;
  transition: border-color 0.2s;
}
.form-control:focus {
  outline: none;
  border-color: #3b82f6;
  background: #fff;
}
.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  flex-wrap: wrap; /* Erlaube Umbruch bei vielen Buttons */
}

.editor-container {
  width: 100%;
  height: 60vh; /* Feste Höhe für bessere Benutzererfahrung */
  min-height: 400px;
  overflow: auto;
  padding: 1rem;
}
.template-admin {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.admin-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.admin-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
}

.admin-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
}

.section-title {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
}

.template-set-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.template-set-name {
  font-family: monospace;
  background: #f3f4f6;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  flex: 1;
}

.templates-table {
  overflow-x: auto;
  margin-bottom: 1rem;
}

.templates-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.templates-table th,
.templates-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.templates-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.fields-cell {
  font-family: monospace;
  font-size: 0.75rem;
  color: #6b7280;
}

.table-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.625rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-warning {
  background-color: #f59e0b;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background-color: #d97706;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #e5e7eb;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.status-card {
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.status-info {
  background-color: #eff6ff;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}

.status-success {
  background-color: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.status-error {
  background-color: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

/* Editor Modal */
.editor-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.editor-modal-content {
  background: white;
  border-radius: 0.5rem;
  width: 95vw;
  height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.editor-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.editor-actions {
  display: flex;
  gap: 0.5rem;
}

.editor-container {
  flex: 1;
  overflow: hidden;
}

/* Badges */
.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 0.25rem;
  margin-left: 0.5rem;
}

.badge-main {
  background-color: #dbeafe;
  color: #1e40af;
}

.badge-success {
  background-color: #d1fae5;
  color: #065f46;
}

.badge-warning {
  background-color: #fef3c7;
  color: #92400e;
}

/* Sync Panel */
.sync-panel {
  background: #f9fafb;
  border: 2px solid #3b82f6;
}

.sync-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: white;
  border-radius: 0.375rem;
}

.sync-control-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.sync-control-group label {
  font-weight: 500;
  color: #374151;
}

.sync-select {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  flex: 1;
  max-width: 300px;
}

.diffs-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.diff-section {
  background: white;
  border-radius: 0.375rem;
  padding: 1rem;
}

.diff-title {
  margin: 0 0 0.75rem 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.diff-count {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #6b7280;
}

.diff-empty {
  padding: 0.75rem;
  background: #ecfdf5;
  color: #065f46;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.diff-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.diff-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem;
  border-radius: 0.25rem;
  font-size: 0.8125rem;
}

.diff-missing {
  background: #fef2f2;
  border-left: 3px solid #dc2626;
}

.diff-different {
  background: #fef3c7;
  border-left: 3px solid #f59e0b;
}

.diff-extra {
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
}

.diff-type-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 0.25rem;
  text-transform: uppercase;
  min-width: 80px;
  text-align: center;
}

.diff-missing .diff-type-badge {
  background: #dc2626;
  color: white;
}

.diff-different .diff-type-badge {
  background: #f59e0b;
  color: white;
}

.diff-extra .diff-type-badge {
  background: #3b82f6;
  color: white;
}

.diff-message {
  font-family: monospace;
  color: #374151;
}

.sync-status {
  display: flex;
  align-items: center;
}

.info-note {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: #1e40af;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

/* Mapping Editor Modal */
.mapping-modal-content {
  background: white;
  border-radius: 0.5rem;
  width: 90vw;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mapping-editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.mapping-description {
  margin: 0 0 1.5rem 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.mapping-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mapping-row {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 1rem;
  align-items: center;
}

.mapping-field-label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.mapping-select {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background: white;
}

.mapping-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* No Active Set Info */
.no-active-set-info {
  padding: 1rem;
  background: #fef3c7;
  border-left: 4px solid #92400e;
  border-radius: 0.375rem;
  color: #92400e;
  font-size: 0.875rem;
  margin-top: 1rem;
}
</style>
