<template>
  <div class="flyer-generator">
    <header class="generator-header">
      <h1>ChurchTools Flyer Generator</h1>
      <div class="template-info">
        <span class="current-template">Vorlagenset: {{ currentTemplateSetName }}</span>
        <button @click="showTemplateSelector = true" class="btn-secondary">
          Vorlagen wechseln
        </button>
      </div>
    </header>

    <!-- Template Selector Modal -->
    <TemplateSelectorModal
      v-if="showTemplateSelector"
      @close="showTemplateSelector = false"
      @select="loadTemplateSet"
    />

    <!-- Appointment Picker Modal -->
    <div v-if="showAppointmentPicker" class="modal-overlay" @click="showAppointmentPicker = false">
      <div @click.stop>
        <AppointmentPicker
          @close="showAppointmentPicker = false"
          @select="handleAppointmentSelect"
        />
      </div>
    </div>

    <main class="generator-main">
      <!-- Form Section -->
      <section class="form-section">
        <div class="section-card">
          <div class="section-header">
            <h2 class="section-title">Veranstaltungsdaten</h2>
            <button type="button" class="btn btn-secondary btn-sm" @click="showAppointmentPicker = true">
              📅 Termin laden
            </button>
          </div>
          <FlyerForm ref="flyerFormRef" @update="handleFormUpdate" />
        </div>

        <!-- Actions -->
        <div class="actions-card">
          <button type="button" class="btn btn-primary" @click="updatePreview" :disabled="isGenerating">
            Vorschau aktualisieren
          </button>
          <button
            type="button"
            class="btn btn-success"
            @click="downloadZip"
            :disabled="isGenerating || !flyerData.title"
          >
            {{ isGenerating ? 'Wird erstellt...' : 'PDFs als ZIP herunterladen' }}
          </button>
        </div>

        <!-- Status -->
        <div v-if="status" class="status-card" :class="statusClass">
          {{ status }}
        </div>

        <!-- Project Management -->
        <div class="section-card project-section">
          <h3 class="section-subtitle">Projektverwaltung</h3>
          <div class="project-actions">
            <button type="button" class="btn btn-secondary btn-sm" @click="saveProject">
              Projekt speichern
            </button>
            <label class="btn btn-secondary btn-sm">
              Projekt laden
              <input type="file" accept=".json" @change="loadProject" hidden />
            </label>
          </div>
        </div>
      </section>

      <!-- Preview Section -->
      <section class="preview-section">
        <h2 class="section-title">Vorschau</h2>
        <div class="preview-grid">
          <FlyerPreviewPdfme
            v-for="config in layoutConfigs"
            :key="config.id"
            :data="previewData"
            :config="config"
            :template-set="selectedTemplateSet"
          />
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, inject, watch, onMounted } from 'vue'
import FlyerForm from './FlyerForm.vue'
import FlyerPreviewPdfme from './FlyerPreviewPdfme.vue'
import TemplateSelectorModal from '../TemplateSelectorModal.vue'
import AppointmentPicker from './AppointmentPicker.vue'
import { generateAndDownloadZip, type ZipProgress } from '../../services/zip-download'
import type { FlyerData, LayoutConfig, FlyerProject } from '../../types/flyer'
import { LAYOUT_CONFIGS } from '../../types/flyer'
import type { TemplateSet } from '../../services/template-sync'
import type { AppointmentBase, AppointmentCalculated } from '../../ct-types'
import { templateStorage } from '../../services/template-storage'
import { applyMapping, DEFAULT_MAPPING } from '../../services/appointment-mapper'

type Appointment = AppointmentBase | AppointmentCalculated

// Layout configurations - werden dynamisch aus selectedTemplateSet geladen
const layoutConfigs = ref<LayoutConfig[]>(Object.values(LAYOUT_CONFIGS))

// Form data (now supports dynamic fields)
const flyerData = reactive<Record<string, string>>({})

// Preview data (updated on button click)
const previewData = reactive<Record<string, string>>({})

// State
const isGenerating = ref(false)
const status = ref('')
const statusType = ref<'info' | 'success' | 'error'>('info')

const statusClass = computed(() => ({
  'status-info': statusType.value === 'info',
  'status-success': statusType.value === 'success',
  'status-error': statusType.value === 'error',
}))

// Template management
const showTemplateSelector = ref(false)
const currentTemplateSetName = ref('Church Flyers Default')

// Appointment picker
const showAppointmentPicker = ref(false)
const flyerFormRef = ref<InstanceType<typeof FlyerForm> | null>(null)

import type { Ref } from 'vue'
// import type { TemplateSet } from '../../types/flyer' // entfernt wegen Alias-Konflikt
const selectedTemplateSet = inject<Ref<TemplateSet|null>>('selectedTemplateSet', null)

watch(selectedTemplateSet, (newSet) => {
  console.debug('[FlyerGenerator] selectedTemplateSet changed', newSet)
  if (newSet && typeof newSet === 'object' && newSet.name) {
    // Rufe loadTemplateSet auf, wenn ein neues Set ausgewählt wird
    loadTemplateSet(newSet)
  }
})

// FlyerGenerator.vue: Beim Mounten aktives TemplateSet aus localStorage laden, falls vorhanden
import { templateSetStorage } from '../../services/template-set-storage'

onMounted(async () => {
  console.debug('[FlyerGenerator] onMounted called')
  
  // Prüfe zuerst, ob schon ein selectedTemplateSet vorhanden ist
  if (selectedTemplateSet.value) {
    console.debug('[FlyerGenerator] selectedTemplateSet already set, loading it')
    loadTemplateSet(selectedTemplateSet.value)
  } else {
    console.debug('[FlyerGenerator] no selectedTemplateSet, checking localStorage')
    // Fallback zu localStorage
    const activeName = await templateSetStorage.getActiveTemplateSet()
    if (activeName) {
      const set = await templateSetStorage.loadTemplateSet(activeName)
      if (set) {
        loadTemplateSet(set)
      }
    } else {
      showTemplateSelector.value = true
    }
  }
})

function loadTemplateSet(templateSet: TemplateSet) {
  console.debug('[FlyerGenerator] loadTemplateSet called with', templateSet.name)
  console.debug('[FlyerGenerator] templateSet.templates', templateSet.templates)
  console.debug('[FlyerGenerator] templateSet.templates keys', Object.keys(templateSet.templates))
  
  currentTemplateSetName.value = templateSet.name
  
  // Erstelle LayoutConfigs aus den Templates im TemplateSet
  const newLayoutConfigs: LayoutConfig[] = []
  for (const [id, template] of Object.entries(templateSet.templates)) {
    console.debug('[FlyerGenerator] Processing template', id, template)
    const layoutFormat = id as LayoutFormat
    const basePdf = template.basePdf
    
    console.debug('[FlyerGenerator] basePdf for', id, ':', basePdf)
    
    if (basePdf && basePdf.width && basePdf.height) {
      newLayoutConfigs.push({
        id: layoutFormat,
        name: LAYOUT_CONFIGS[layoutFormat]?.name || id,
        width: basePdf.width,
        height: basePdf.height,
        filename: `${layoutFormat}.pdf`,
      })
      console.debug('[FlyerGenerator] Added layout config for', id)
    } else {
      console.debug('[FlyerGenerator] Skipping template', id, '- missing basePdf data')
    }
  }
  
  console.debug('[FlyerGenerator] Final newLayoutConfigs', newLayoutConfigs)
  layoutConfigs.value = newLayoutConfigs
  console.debug('[FlyerGenerator] layoutConfigs.value after update', layoutConfigs.value)
  
  // Speichere als aktives TemplateSet
  templateSetStorage.setActiveTemplateSet(templateSet.name)
  showTemplateSelector.value = false
  setStatus(`Vorlagenset "${templateSet.name}" mit ${newLayoutConfigs.length} Vorlagen geladen`, 'success')
}

// Handle appointment selection
const handleAppointmentSelect = (appointment: Appointment) => {
  const base = 'base' in appointment ? appointment.base : appointment
  
  // Get mapping from first template (a5-portrait as default)
  // In the future, we could let the user choose which template's mapping to use
  const mapping = templateStorage.getMapping('a5-portrait') || DEFAULT_MAPPING
  
  // Apply mapping to convert appointment data to form data
  const appointmentData = applyMapping(appointment, mapping)
  
  // Update form data
  Object.assign(flyerData, appointmentData)
  Object.assign(previewData, appointmentData)
  
  // Update form component if available
  if (flyerFormRef.value) {
    flyerFormRef.value.setData(appointmentData)
  }
  
  setStatus(`Termin "${base.title}" geladen`, 'success')
}

// Handle form updates
const handleFormUpdate = (data: Record<string, string>) => {
  Object.assign(flyerData, data)
  // Don't auto-update preview - user must click button
}

// Update preview manually
const updatePreview = () => {
  console.log('Updating preview with data:', flyerData)
  Object.assign(previewData, flyerData)
  setStatus('Vorschau aktualisiert', 'success')
}

// Set status message
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

// Download ZIP
const downloadZip = async () => {
  if (!flyerData.title?.trim()) {
    setStatus('Bitte geben Sie einen Titel ein', 'error')
    return
  }

  isGenerating.value = true
  setStatus('PDFs werden erstellt...', 'info')

  try {
    await generateAndDownloadZip(flyerData, (progress: ZipProgress) => {
      switch (progress.stage) {
        case 'generating':
          setStatus(`PDF ${progress.current}/${progress.total} wird erstellt...`, 'info')
          break
        case 'zipping':
          setStatus('ZIP-Archiv wird erstellt...', 'info')
          break
        case 'downloading':
          setStatus('Download wird gestartet...', 'info')
          break
      }
    })
    setStatus('Download erfolgreich!', 'success')
  } catch (error) {
    console.error('PDF generation failed:', error)
    setStatus(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, 'error')
  } finally {
    isGenerating.value = false
  }
}

// Save project to JSON file
const saveProject = () => {
  const project = {
    version: '1.0',
    data: { ...flyerData },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `flyer-projekt-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  setStatus('Projekt gespeichert', 'success')
}

// Load project from JSON file
const loadProject = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const project = JSON.parse(e.target?.result as string)
      if (project.data) {
        Object.assign(flyerData, project.data)
        Object.assign(previewData, project.data)
        setStatus('Projekt geladen', 'success')
      }
    } catch (error) {
      setStatus('Fehler beim Laden der Projektdatei', 'error')
    }
  }
  reader.readAsText(file)
  input.value = '' // Reset input
}
</script>

<style scoped>
.flyer-generator {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.generator-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.generator-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
}

.generator-main {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 1.5rem;
}

@media (max-width: 1024px) {
  .generator-main {
    grid-template-columns: 1fr;
  }
}

.form-section {
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

.section-subtitle {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
}

.actions-card {
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

.btn-success {
  background-color: #10b981;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: #059669;
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

.project-section {
  margin-top: 0.5rem;
}

.project-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.preview-section {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
}

.preview-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: center;
  align-items: flex-start;
}

/* Modal overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

/* Section header with button */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header .section-title {
  margin: 0;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}
</style>
