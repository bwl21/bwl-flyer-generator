<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <header class="modal-header">
        <h2>Vorlagenset auswählen</h2>
        <button class="close-btn" @click="$emit('close')" aria-label="Schließen">×</button>
      </header>

      <div class="modal-body">
        <!-- Loading State -->
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Lade Vorlagen...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-state">
          <p class="error-message">{{ error }}</p>
          <button @click="loadTemplates" class="btn-secondary">Erneut versuchen</button>
        </div>

        <!-- Template List -->
        <div v-else class="template-list">
          <div
            v-for="template in templates"
            :key="template.id"
            class="template-item"
            :class="{ selected: template.id === selectedId }"
            @click="selectTemplate(template)"
          >
            <div class="template-info">
              <h3>{{ template.name }}</h3>
              <p v-if="template.description" class="description">{{ template.description }}</p>
              <div class="template-meta">
                <span class="version">v{{ template.version }}</span>
                <span class="source">📁 Lokal</span>
                <span v-if="template.templateCount" class="count">
                  {{ template.templateCount }} Layouts
                </span>
              </div>
            </div>
            <div class="template-check">
              <span v-if="template.id === selectedId" class="checkmark">✓</span>
            </div>
          </div>

          <div v-if="templates.length === 0" class="empty-state">
            <p>📭 Keine Vorlagen gefunden</p>
            <p class="hint">
              Legen Sie Template-Dateien im Ordner <code>public/templates/</code> ab.
            </p>
          </div>
        </div>

        <!-- Preview (if selected) -->
        <div v-if="selectedTemplate" class="template-preview">
          <h3>Vorschau: {{ selectedTemplate.name }}</h3>
          <div class="preview-info">
            <p><strong>Main Template:</strong> {{ selectedTemplate.mainTemplate }}</p>
            <p><strong>Layouts:</strong> {{ selectedTemplate.templateCount }}</p>
          </div>
        </div>
      </div>

      <footer class="modal-footer">
        <button @click="$emit('close')" class="btn-secondary">Abbrechen</button>
        <button @click="loadSelected" :disabled="!selectedId || loading" class="btn-primary">
          Vorlagen laden
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { TemplateLoader, type TemplateSetMetadata } from '../services/template-loader'
import type { TemplateSet } from '../services/template-sync'

const emit = defineEmits<{
  close: []
  select: [templateSet: TemplateSet]
}>()

const loader = new TemplateLoader()

const templates = ref<TemplateSetMetadata[]>([])
const selectedId = ref<string>('')
const loading = ref(false)
const error = ref('')

const selectedTemplate = computed(() => templates.value.find((t) => t.id === selectedId.value))

onMounted(() => {
  loadTemplates()
})

async function loadTemplates() {
  try {
    loading.value = true
    error.value = ''
    templates.value = await loader.listAssetTemplates()

    // Auto-select first template
    if (templates.value.length > 0) {
      selectedId.value = templates.value[0].id
    }
  } catch (e: any) {
    error.value = e.message || 'Vorlagen konnten nicht geladen werden'
  } finally {
    loading.value = false
  }
}

function selectTemplate(template: TemplateSetMetadata) {
  selectedId.value = template.id
}

async function loadSelected() {
  if (!selectedId.value) return

  try {
    loading.value = true
    error.value = ''

    const templateSet = await loader.loadById(selectedId.value)
    emit('select', templateSet)
  } catch (e: any) {
    error.value = e.message || 'Template konnte nicht geladen werden'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
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
  color: #111827;
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
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-message {
  color: #dc2626;
  margin-bottom: 1rem;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.template-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.template-item:hover {
  border-color: #3b82f6;
  background: #f9fafb;
}

.template-item.selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.template-info {
  flex: 1;
}

.template-info h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.description {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.template-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.version,
.source,
.count {
  padding: 0.125rem 0.5rem;
  background: #f3f4f6;
  border-radius: 0.25rem;
}

.template-check {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkmark {
  color: #3b82f6;
  font-size: 1.5rem;
  font-weight: bold;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.empty-state p:first-child {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.hint code {
  background: #f3f4f6;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-family: monospace;
}

.template-preview {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.template-preview h3 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
}

.preview-info p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
  color: #6b7280;
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

.btn-secondary:hover {
  background: #f9fafb;
}
</style>
