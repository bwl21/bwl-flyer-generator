<template>
  <div class="template-set-manager">
    <header class="manager-header">
      <div>
        <h1>Template-Set Verwaltung</h1>
        <p class="subtitle">{{ currentTemplateSet?.name || 'Kein Set' }} geladen</p>
      </div>
      <div class="header-actions">
        <button @click="fetchTemplateSets" class="btn-secondary">
          Sets aktualisieren
        </button>
        <button @click="downloadTemplateSet" :disabled="!currentTemplateSet" class="btn-secondary">
          Set exportieren
        </button>
        <button @click="showCreateDialog" class="btn-primary">
          Neues Set erstellen
        </button>
          <div v-if="createDialogVisible" class="modal-overlay" @click.self="closeCreateDialog">
            <div class="modal-content">
              <header class="modal-header">
                <h2>Neues Template-Set erstellen</h2>
                <button class="close-btn" @click="closeCreateDialog">×</button>
              </header>
              <div class="modal-body">
                <label for="newSetName">Name des Sets:</label>
                <input id="newSetName" v-model="newSetName" type="text" placeholder="Set-Name" />
              </div>
              <footer class="modal-footer">
                <button @click="closeCreateDialog" class="btn-secondary">Abbrechen</button>
                <button @click="createDemoTemplateSet" :disabled="!newSetName.trim()" class="btn-primary">Erstellen</button>
              </footer>
            </div>
          </div>
      </div>
    </header>

    <section class="set-list" v-if="templateSets.length && !editorVisible">
      <div class="table-controls">
        <input v-model="filterText" type="text" placeholder="🔍 Suchen..." class="filter-input pretty-input" />
      </div>
      <table class="template-set-table">
        <thead>
          <tr>
            <th @click="toggleSort" class="sortable">
              <span style="display: flex; align-items: center; gap: 0.3em; cursor: pointer;">
                Name
                <svg v-if="sortAsc" width="14" height="14" viewBox="0 0 20 20" fill="none" style="vertical-align: middle;"><path d="M5 12l5-5 5 5" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <svg v-else width="14" height="14" viewBox="0 0 20 20" fill="none" style="vertical-align: middle;"><path d="M5 8l5 5 5-5" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
            </th>
            <th style="width: 260px;">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="name in filteredAndSortedSets" :key="name">
            <td><strong>{{ name }}</strong></td>
            <td>
              <div class="action-buttons">
                <button @click="selectSet(name)" class="btn-primary">Auswählen</button>
                <button @click="editSet(name)" class="btn-secondary">Bearbeiten</button>
                <button @click="deleteSet(name)" class="btn-danger">Löschen</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <div v-else-if="!templateSets.length && !editorVisible" class="empty-state">
      <p>📦 Keine Template-Sets gefunden</p>
      <button @click="fetchTemplateSets" class="btn-primary">
        Sets neu laden
      </button>
    </div>

    <div v-if="statusMessage" class="status-toast" :class="statusType">
      {{ statusMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, getCurrentInstance, onMounted, inject, watch } from 'vue'
import { toast } from '../services/toast-service'
import type { Ref } from 'vue'
import type { TemplateSet } from '../types/flyer'

const app = getCurrentInstance()?.appContext.config.globalProperties

const filterText = ref('')
const sortAsc = ref(true)

const filteredAndSortedSets = computed(() => {
  let sets = templateSets.value.filter(name => name.toLowerCase().includes(filterText.value.toLowerCase()))
  sets = sets.sort((a, b) => sortAsc.value ? a.localeCompare(b) : b.localeCompare(a))
  return sets
})

function toggleSort() {
  sortAsc.value = !sortAsc.value
}

// Tab switching and set loading
const activeTab = inject('activeTab')
const selectedTemplateSet = inject<Ref<TemplateSet|null>>('selectedTemplateSet')

// Verwende selectedTemplateSet statt currentTemplateSet
const currentTemplateSet = computed(() => selectedTemplateSet.value)

// Watch für Änderungen
watch(selectedTemplateSet, (newSet) => {
  console.debug('[TemplateSetManager] selectedTemplateSet changed', newSet)
  if (newSet) {
    toast.info('Template-Set geladen', `Template-Set "${newSet.name}" ist jetzt aktiv`)
  }
})

function editSet(name) {
  console.debug('[TemplateSetManager] editSet called', name)
  templateSetStorage.loadTemplateSet(name).then(set => {
    console.debug('[TemplateSetManager] loaded set from storage', set)
    if (set) {
      console.debug('[TemplateSetManager] setting selectedTemplateSet', set)
      selectedTemplateSet.value = set
      console.debug('[TemplateSetManager] selectedTemplateSet after setting', selectedTemplateSet.value)
      activeTab.value = 'admin'
      console.debug('[TemplateSetManager] activeTab set to admin', activeTab.value)
    } else {
      showStatus('Set konnte nicht geladen werden', 'error')
      console.error('[TemplateSetManager] Set konnte nicht geladen werden', name)
    }
  }).catch(error => {
    console.error('[TemplateSetManager] Error loading set', error)
    showStatus('Fehler beim Laden des Sets', 'error')
  })
}

function selectSet(name) {
  console.debug('[TemplateSetManager] selectSet called', name)
  templateSetStorage.loadTemplateSet(name).then(set => {
    console.debug('[TemplateSetManager] loaded set from storage', set)
    if (set) {
      console.debug('[TemplateSetManager] setting selectedTemplateSet', set)
      selectedTemplateSet.value = set
      console.debug('[TemplateSetManager] selectedTemplateSet after setting', selectedTemplateSet.value)
      activeTab.value = 'generator'
      console.debug('[TemplateSetManager] activeTab set to generator', activeTab.value)
      toast.success('Template-Set geladen', `Template-Set "${set.name}" wurde ausgewählt`)
    } else {
      toast.error('Fehler', 'Set konnte nicht geladen werden')
      console.error('[TemplateSetManager] Set konnte nicht geladen werden', name)
    }
  }).catch(error => {
    console.error('[TemplateSetManager] Error loading set', error)
    toast.error('Fehler', 'Fehler beim Laden des Sets')
  })
}

async function deleteSet(name) {
  console.debug('[TemplateSetManager] deleteSet', name)
  if (confirm(`Set "${name}" wirklich löschen?`)) {
    await templateSetStorage.deleteTemplateSet(name)
    fetchTemplateSets()
    toast.success('Set gelöscht', `Template-Set "${name}" wurde gelöscht`)
    console.debug('[TemplateSetManager] Set gelöscht', name)
  }
}
import { TemplateSyncService, type FieldDiff, type ValidationResult } from '../services/template-sync'
import { TemplateLoader } from '../services/template-loader'
import { templateSetStorage } from '../services/template-set-storage'
import TemplateSetEditor from './admin/TemplateSetEditor.vue'

const syncService = new TemplateSyncService()
const loader = new TemplateLoader()

const templateSets = ref<string[]>([])
// currentTemplateSet wird jetzt aus selectedTemplateSet computed
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

const createDialogVisible = ref(false)
const newSetName = ref('')

const editorVisible = ref(false)
const editorTemplateSet = ref(null)

function showCreateDialog() {
  createDialogVisible.value = true
  newSetName.value = ''
}

function closeCreateDialog() {
  createDialogVisible.value = false
  newSetName.value = ''
}

async function fetchTemplateSets() {
  templateSets.value = await templateSetStorage.listTemplateSets()
}

onMounted(fetchTemplateSets)

async function selectTemplateSet(name: string) {
  const set = await templateSetStorage.loadTemplateSet(name)
  if (set) {
    selectedTemplateSet.value = set
    await templateSetStorage.setActiveTemplateSet(name)
    toast.success('Template-Set geladen', `Template-Set "${set.name}" wurde ausgewählt`)
  } else {
    toast.error('Fehler', 'Template-Set konnte nicht geladen werden')
  }
}

async function createDemoTemplateSet() {
  const name = newSetName.value.trim()
  if (!name) return
  
  // Duplikatsprüfung
  const existingSets = await templateSetStorage.listTemplateSets()
  if (existingSets.includes(name)) {
    toast.error('Fehler', 'Set-Name existiert bereits')
    return
  }
  
  const demoSet = {
    version: '1.0',
    name,
    mainTemplate: 'a5-portrait',
    templates: {
      'a5-portrait': {
        name: 'A5 Hoch',
        basePdf: { width: 148, height: 210 },
        schemas: [[]],
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  
  await templateSetStorage.saveTemplateSet(demoSet)
  fetchTemplateSets()
  toast.success('Set erstellt', `Template-Set "${name}" wurde erstellt`)
  closeCreateDialog()
}
</script>


<style scoped>
/* Filter & Sort Controls */
/* Filter & Sort Controls */
.table-controls {
  margin-bottom: 0.75rem;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
.filter-input.pretty-input {
  padding: 0.45rem 1.2rem 0.45rem 2.2rem;
  border: 1.5px solid #cbd5e1;
  border-radius: 999px;
  font-size: 1.05rem;
  min-width: 220px;
  background: #f8fafc url('data:image/svg+xml;utf8,<svg fill="%236b7280" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99c.41.41 1.09.41 1.5 0s.41-1.09 0-1.5l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>') no-repeat 0.7rem center;
  background-size: 1.1em 1.1em;
  transition: border 0.2s;
}
.filter-input.pretty-input:focus {
  outline: none;
  border-color: #3b82f6;
  background-color: #fff;
}
.sortable {
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
}
.sortable:hover {
  color: #2563eb;
}
.sortable {
  cursor: pointer;
  user-select: none;
}
/* Verbesserte TemplateSet-Liste */
.template-set-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1.5rem;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  border-radius: 0.5rem;
  overflow: hidden;
}
.template-set-table th, .template-set-table td {
  padding: 1rem 1.25rem;
  text-align: left;
}
.template-set-table th {
  background: #f3f4f6;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}
.template-set-table tr:not(:last-child) td {
  border-bottom: 1px solid #e5e7eb;
}
.action-buttons {
  display: flex;
  gap: 0.5rem;
}
.btn-primary, .btn-secondary, .btn-danger {
  padding: 0.4rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.95rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-primary {
  background: #3b82f6;
  color: #fff;
}
.btn-primary:hover {
  background: #2563eb;
}
.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}
.btn-secondary:hover {
  background: #e5e7eb;
}
.btn-danger {
  background: #ef4444;
  color: #fff;
}
.btn-danger:hover {
  background: #dc2626;
}
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
