<template>
    <!-- Dialog für neues Design -->
    <div v-if="showAddDesignDialog" class="modal-overlay" @click.self="closeAddDesignDialog">
      <div class="modal-content">
        <header class="modal-header">
          <h2>Neues Design hinzufügen</h2>
          <button class="close-btn" @click="closeAddDesignDialog">×</button>
        </header>
        <div class="modal-body">
          <label>
            Name:
            <input v-model="newDesign.name" type="text" placeholder="Design-Name" />
          </label>
          <label>
            Breite (mm):
            <input v-model.number="newDesign.width" type="number" min="10" max="1000" />
          </label>
          <label>
            Höhe (mm):
            <input v-model.number="newDesign.height" type="number" min="10" max="1000" />
          </label>
        </div>
        <footer class="modal-footer">
          <button @click="closeAddDesignDialog" class="btn-secondary">Abbrechen</button>
          <button @click="addDesignToSet" class="btn-primary">Hinzufügen</button>
        </footer>
      </div>
    </div>
  <div class="template-set-manager">
    <header class="manager-header">
      <div>
        <h1>Template-Set Verwaltung</h1>
        <p class="subtitle">{{ currentTemplateSet?.name || 'Kein Set geladen' }}</p>
      </div>
      <div class="header-actions">
        <button @click="showLoadDialog = true" class="btn-secondary">
          Set laden
        </button>
        <button @click="downloadTemplateSet" :disabled="!currentTemplateSet" class="btn-secondary">
          Set exportieren
        </button>
      </div>
    </header>

    <div v-if="currentTemplateSet" class="manager-content">
      <!-- Main Template Info -->
      <section class="info-card">
        <h2>Main Template: {{ currentTemplateSet.mainTemplate }}</h2>
        <p>Änderungen am Main Template können auf andere Templates synchronisiert werden.</p>
      </section>

      <!-- Templates Grid -->
      <div class="templates-grid">
        <div
          v-for="(template, id) in currentTemplateSet.templates"
          :key="id"
          class="template-card"
          :class="{ 'is-main': id === currentTemplateSet.mainTemplate }"
        >
          <div class="card-header">
            <h3>{{ template.name || id }}</h3>
            <span v-if="id === currentTemplateSet.mainTemplate" class="badge-main">Main</span>
          </div>

          <div class="card-body">
            <div class="template-info">
              <p><strong>Format:</strong> {{ template.basePdf.width }}×{{ template.basePdf.height }}mm</p>
              <p><strong>Felder:</strong> {{ template.schemas[0].length }}</p>
            </div>

            <!-- Diff Indicator -->
            <div v-if="id !== currentTemplateSet.mainTemplate" class="diff-section">
              <div v-if="getDiffCount(id) > 0" class="diff-warning">
                ⚠️ {{ getDiffCount(id) }} Unterschiede zum Main Template
              </div>
              <div v-else class="diff-success">
                ✓ Synchron mit Main Template
              </div>
            </div>
          </div>

          <div class="card-actions">
            <button @click="editTemplate(id)" class="btn-primary">
              Bearbeiten
            </button>
            <button
              v-if="id !== currentTemplateSet.mainTemplate"
              @click="showSyncDialog(id)"
              :disabled="getDiffCount(id) === 0"
              class="btn-secondary"
            >
              Synchronisieren
            </button>
          </div>
        </div>
      </div>

      <!-- Global Actions -->
      <section class="global-actions">
        <button @click="addNewDesign" class="btn-primary">
          Neues Design hinzufügen
        </button>
        <button @click="syncAllTemplates" class="btn-primary btn-large">
          Alle Templates mit Main synchronisieren
        </button>
        <button @click="validateTemplates" class="btn-secondary">
          Templates validieren
        </button>
      </section>

      <!-- Validation Results -->
      <div v-if="validationResult" class="validation-results">
        <h3>Validierungs-Ergebnisse</h3>
        <div v-if="validationResult.valid" class="success-message">
          ✓ Alle Templates sind konsistent
        </div>
        <div v-if="validationResult.errors.length > 0" class="error-messages">
          <h4>Fehler:</h4>
          <ul>
            <li v-for="(error, idx) in validationResult.errors" :key="idx">{{ error }}</li>
          </ul>
        </div>
        <div v-if="validationResult.warnings.length > 0" class="warning-messages">
          <h4>Warnungen:</h4>
          <ul>
            <li v-for="(warning, idx) in validationResult.warnings" :key="idx">{{ warning }}</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <p>📦 Kein Template-Set geladen</p>
      <button @click="showLoadDialog = true" class="btn-primary">
        Template-Set laden
      </button>
    </div>

    <!-- Load Dialog -->
    <TemplateSelectorModal
      v-if="showLoadDialog"
      @close="showLoadDialog = false"
      @select="loadTemplateSet"
    />

    <!-- Sync Dialog -->
    <div v-if="syncDialogVisible" class="modal-overlay" @click.self="closeSyncDialog">
      <div class="modal-content">
        <header class="modal-header">
          <h2>Template synchronisieren</h2>
          <button class="close-btn" @click="closeSyncDialog">×</button>
        </header>

        <div class="modal-body">
          <p>
            Synchronisiere <strong>{{ syncTargetId }}</strong> mit Main Template
            <strong>{{ currentTemplateSet?.mainTemplate }}</strong>
          </p>

          <!-- Diff Preview -->
          <div v-if="currentDiff.length > 0" class="diff-preview">
            <h3>Änderungen ({{ currentDiff.length }}):</h3>
            <div v-for="(diff, idx) in currentDiff" :key="idx" class="diff-item">
              <div class="diff-field">{{ diff.fieldName }}</div>
              <div v-if="diff.property" class="diff-change">
                <span class="property">{{ diff.property }}:</span>
                <span class="old-value">{{ diff.targetValue }}</span>
                →
                <span class="new-value">{{ diff.mainValue }}</span>
              </div>
              <div v-else class="diff-message">{{ diff.message }}</div>
            </div>
          </div>

          <!-- Sync Options -->
          <div class="sync-options">
            <h3>Was synchronisieren?</h3>
            <label>
              <input type="checkbox" v-model="syncOptions.colors" />
              Farben (fontColor, color)
            </label>
            <label>
              <input type="checkbox" v-model="syncOptions.alignment" />
              Ausrichtung (alignment)
            </label>
            <label>
              <input type="checkbox" v-model="syncOptions.types" />
              Feldtypen (type, name)
            </label>
          </div>
        </div>

        <footer class="modal-footer">
          <button @click="closeSyncDialog" class="btn-secondary">Abbrechen</button>
          <button @click="performSync" class="btn-primary">Synchronisieren</button>
        </footer>
      </div>
    </div>

    <!-- Status Messages -->
    <div v-if="statusMessage" class="status-toast" :class="statusType">
      {{ statusMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
// Dialog-Logik für neues Design
import { ref, reactive, computed } from 'vue'
const showAddDesignDialog = ref(false)
const newDesign = reactive({
  name: '',
  width: 210,
  height: 297
})

function openAddDesignDialog() {
  newDesign.name = ''
  newDesign.width = 210
  newDesign.height = 297
  showAddDesignDialog.value = true
}

function closeAddDesignDialog() {
  showAddDesignDialog.value = false
}

function addDesignToSet() {
  if (!currentTemplateSet.value) return
  if (!newDesign.name) {
    showStatus('Name darf nicht leer sein', 'error')
    return
  }
  // ID generieren (z.B. aus Name)
  const id = newDesign.name.trim().toLowerCase().replace(/\s+/g, '-')
  if (currentTemplateSet.value.templates[id]) {
    showStatus('Design mit dieser ID existiert bereits', 'error')
    return
  }
  currentTemplateSet.value.templates[id] = {
    name: newDesign.name,
    basePdf: { width: newDesign.width, height: newDesign.height },
    schemas: [[]],
    // ggf. weitere Felder initialisieren
  }
  showStatus(`Design "${newDesign.name}" hinzugefügt`, 'success')
  showAddDesignDialog.value = false
}
// Handler für neuen Button
function addNewDesign() {
  openAddDesignDialog()
}
import TemplateSelectorModal from './TemplateSelectorModal.vue'
import { TemplateSyncService, type TemplateSet, type FieldDiff, type ValidationResult } from '../services/template-sync'
import { TemplateLoader } from '../services/template-loader'

const syncService = new TemplateSyncService()
const loader = new TemplateLoader()

const currentTemplateSet = ref<TemplateSet | null>(null)
const showLoadDialog = ref(false)
const syncDialogVisible = ref(false)
const syncTargetId = ref('')
const currentDiff = ref<FieldDiff[]>([])
const syncOptions = ref({
  colors: true,
  alignment: true,
  types: true,
})
const validationResult = ref<ValidationResult | null>(null)
const statusMessage = ref('')
const statusType = ref<'success' | 'error' | 'info'>('info')

function getDiffCount(templateId: string): number {
  if (!currentTemplateSet.value) return 0
  return syncService.getDiffCount(currentTemplateSet.value, templateId)
}

function loadTemplateSet(templateSet: TemplateSet) {
  currentTemplateSet.value = templateSet
  showLoadDialog.value = false
  showStatus(`Template-Set "${templateSet.name}" geladen`, 'success')
}

function editTemplate(templateId: string) {
  // TODO: Open Designer for this template
  showStatus(`Editor für "${templateId}" öffnen (noch nicht implementiert)`, 'info')
}

function showSyncDialog(templateId: string) {
  if (!currentTemplateSet.value) return

  syncTargetId.value = templateId
  currentDiff.value = syncService.getDiff(currentTemplateSet.value, templateId)
  syncDialogVisible.value = true
}

function closeSyncDialog() {
  syncDialogVisible.value = false
  syncTargetId.value = ''
  currentDiff.value = []
}

function performSync() {
  if (!currentTemplateSet.value || !syncTargetId.value) return

  const properties: string[] = []
  if (syncOptions.value.colors) {
    properties.push('fontColor', 'color')
  }
  if (syncOptions.value.alignment) {
    properties.push('alignment')
  }
  if (syncOptions.value.types) {
    properties.push('type', 'name')
  }

  currentTemplateSet.value = syncService.syncFromMain(currentTemplateSet.value, {
    templates: [syncTargetId.value],
    properties,
  })

  showStatus(`Template "${syncTargetId.value}" synchronisiert`, 'success')
  closeSyncDialog()
}

function syncAllTemplates() {
  if (!currentTemplateSet.value) return

  currentTemplateSet.value = syncService.syncFromMain(currentTemplateSet.value)
  showStatus('Alle Templates synchronisiert', 'success')
}

function validateTemplates() {
  if (!currentTemplateSet.value) return

  validationResult.value = syncService.validate(currentTemplateSet.value)

  if (validationResult.value.valid) {
    showStatus('Validierung erfolgreich', 'success')
  } else {
    showStatus('Validierung fehlgeschlagen', 'error')
  }
}

function downloadTemplateSet() {
  if (!currentTemplateSet.value) return

  loader.downloadAsJson(currentTemplateSet.value)
  showStatus('Template-Set exportiert', 'success')
}

function showStatus(message: string, type: 'success' | 'error' | 'info') {
  statusMessage.value = message
  statusType.value = type
  setTimeout(() => {
    statusMessage.value = ''
  }, 3000)
}
</script>

<style scoped>
.template-set-manager {
  min-height: 100vh;
  background: #f9fafb;
}

.manager-header {
  background: white;
  padding: 2rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.manager-header h1 {
  margin: 0;
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
}

.subtitle {
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.manager-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.info-card {
  background: #eff6ff;
  border: 1px solid #3b82f6;
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.info-card h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  color: #1e40af;
}

.info-card p {
  margin: 0;
  color: #1e3a8a;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.template-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1.5rem;
  transition: all 0.2s;
}

.template-card.is-main {
  border-color: #3b82f6;
  background: #eff6ff;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
}

.badge-main {
  background: #3b82f6;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.card-body {
  margin-bottom: 1rem;
}

.template-info p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.diff-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.diff-warning {
  color: #d97706;
  font-size: 0.875rem;
  font-weight: 500;
}

.diff-success {
  color: #059669;
  font-size: 0.875rem;
  font-weight: 500;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.global-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 2rem 0;
}

.btn-large {
  padding: 0.75rem 2rem;
  font-size: 1rem;
}

.validation-results {
  background: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-top: 2rem;
}

.validation-results h3 {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  color: #111827;
}

.success-message {
  color: #059669;
  font-weight: 500;
}

.error-messages,
.warning-messages {
  margin-top: 1rem;
}

.error-messages h4 {
  color: #dc2626;
  margin: 0 0 0.5rem 0;
}

.warning-messages h4 {
  color: #d97706;
  margin: 0 0 0.5rem 0;
}

.error-messages ul,
.warning-messages ul {
  margin: 0;
  padding-left: 1.5rem;
}

.error-messages li {
  color: #dc2626;
}

.warning-messages li {
  color: #d97706;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-state p {
  font-size: 2rem;
  margin-bottom: 1.5rem;
}

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
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  line-height: 1;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
}

.close-btn:hover {
  color: #111827;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.diff-preview {
  margin: 1.5rem 0;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.diff-preview h3 {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
}

.diff-item {
  padding: 0.75rem;
  background: white;
  border-radius: 0.375rem;
  margin-bottom: 0.5rem;
}

.diff-field {
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
}

.diff-change {
  font-size: 0.875rem;
  color: #6b7280;
}

.property {
  font-weight: 500;
  color: #374151;
}

.old-value {
  color: #dc2626;
  text-decoration: line-through;
}

.new-value {
  color: #059669;
  font-weight: 500;
}

.diff-message {
  font-size: 0.875rem;
  color: #6b7280;
}

.sync-options {
  margin-top: 1.5rem;
}

.sync-options h3 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
}

.sync-options label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  cursor: pointer;
}

.sync-options input[type='checkbox'] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-primary,
.btn-secondary {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 0.875rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.status-toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  font-weight: 500;
  z-index: 2000;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.status-toast.success {
  background: #059669;
  color: white;
}

.status-toast.error {
  background: #dc2626;
  color: white;
}

.status-toast.info {
  background: #3b82f6;
  color: white;
}
</style>
