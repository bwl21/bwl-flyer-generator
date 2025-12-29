<template>
  <div class="flyer-form">
    <div v-for="field in formFields" :key="field.name" class="form-group">
      <label :for="field.name" class="form-label">
        {{ field.label }}
        <span v-if="field.required">*</span>
        <span v-if="field.type === 'image'" class="field-type-badge">Bild</span>
      </label>
      
      <!-- Image field with file upload -->
      <div v-if="field.type === 'image'" class="image-field">
        <input
          :id="field.name"
          type="file"
          accept="image/*"
          class="form-file-input"
          @change="handleImageUpload($event, field.name)"
        />
        <input
          v-model="formData[field.name]"
          type="text"
          class="form-input"
          :placeholder="field.placeholder"
          readonly
        />
        <div v-if="formData[field.name]" class="image-preview">
          <img :src="formData[field.name]" alt="Preview" />
        </div>
      </div>
      
      <!-- Textarea for multiline text -->
      <textarea
        v-else-if="field.multiline"
        :id="field.name"
        v-model="formData[field.name]"
        class="form-textarea"
        :rows="field.rows || 4"
        :placeholder="field.placeholder"
      ></textarea>
      
      <!-- Regular text input -->
      <input
        v-else
        :id="field.name"
        v-model="formData[field.name]"
        type="text"
        class="form-input"
        :placeholder="field.placeholder"
        :required="field.required"
      />
    </div>

    <div class="form-actions">
      <button type="button" class="btn btn-secondary" @click="loadExample">
        Beispieldaten laden
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, computed } from 'vue'
import { getAllTemplates } from '../../services/pdfme-templates'

const emit = defineEmits<{
  update: [data: Record<string, string>]
}>()

// Field configuration with labels and placeholders
interface FieldConfig {
  name: string
  label: string
  placeholder: string
  required?: boolean
  multiline?: boolean
  rows?: number
  type?: 'text' | 'qrcode' | 'image'
}

const fieldLabels: Record<string, FieldConfig> = {
  title: { name: 'title', label: 'Titel', placeholder: 'z.B. Weihnachtsgottesdienst', required: true },
  datetime: { name: 'datetime', label: 'Datum / Uhrzeit', placeholder: 'z.B. 24.12.2025, 10:00 Uhr' },
  location: { name: 'location', label: 'Ort', placeholder: 'z.B. Ev. Kirche Korntal' },
  speaker: { name: 'speaker', label: 'Prediger / Sprecher', placeholder: 'z.B. Pfarrer Müller' },
  desc: { name: 'desc', label: 'Beschreibung', placeholder: 'Herzliche Einladung zum Gottesdienst...', multiline: true, rows: 4 },
  qr: { name: 'qr', label: 'QR-Inhalt (z.B. URL)', placeholder: 'https://gemeinde.example/anmeldung' },
  comment: { name: 'comment', label: 'Kommentar', placeholder: 'Zusätzliche Informationen...' },
}

// Get all unique field names from all templates with their types
const formFields = computed(() => {
  const templates = getAllTemplates()
  const fieldMap = new Map<string, string>() // name -> type
  
  // Collect all field names and types from all templates
  Object.values(templates).forEach(template => {
    template.schemas[0]?.forEach(schema => {
      // Include text, qrcode, and image fields
      // Skip only decorative elements like rectangles, lines
      if (schema.type === 'text' || schema.type === 'qrcode' || schema.type === 'image') {
        fieldMap.set(schema.name, schema.type)
      }
    })
  })
  
  // Convert to array and map to field configs
  return Array.from(fieldMap.entries())
    .filter(([name]) => name !== 'header-bg') // Skip background elements
    .map(([name, type]) => {
      const config = fieldLabels[name] || {
        name,
        label: name.charAt(0).toUpperCase() + name.slice(1),
        placeholder: type === 'image' ? 'Bild-URL oder Data-URL...' : `${name}...`
      }
      return { ...config, type: type as 'text' | 'qrcode' | 'image' }
    })
    .sort((a, b) => {
      // Sort: required fields first, then alphabetically
      if (a.required && !b.required) return -1
      if (!a.required && b.required) return 1
      return a.name.localeCompare(b.name)
    })
})

// Initialize formData with all fields
const formData = reactive<Record<string, string>>({})

// Initialize all fields
formFields.value.forEach(field => {
  formData[field.name] = ''
})

// Emit updates when form data changes
watch(
  formData,
  (newData) => {
    emit('update', { ...newData })
  },
  { deep: true, immediate: true }
)

// Handle image file upload
const handleImageUpload = (event: Event, fieldName: string) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string
    formData[fieldName] = dataUrl
  }
  reader.readAsDataURL(file)
}

const loadExample = () => {
  formData.title = 'Weihnachtsgottesdienst'
  formData.datetime = '24.12.2025, 10:00 Uhr'
  formData.location = 'Ev. Kirche Korntal'
  formData.speaker = 'Pfarrer Müller'
  formData.desc = 'Herzliche Einladung zum festlichen Weihnachtsgottesdienst mit Krippenspiel der Kinder und anschließendem Kirchenkaffee.'
  formData.qr = 'https://gemeinde.example/weihnachten'
  
  // Set example data for any additional fields
  if (formData.comment !== undefined) {
    formData.comment = 'Bitte um Anmeldung bis 20.12.'
  }
  
  // Set example image if image field exists
  Object.keys(formData).forEach(key => {
    const field = formFields.value.find(f => f.name === key)
    if (field?.type === 'image' && !formData[key]) {
      // Use a placeholder image
      formData[key] = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5CaWxkPC90ZXh0Pjwvc3ZnPg=='
    }
  })
}

// Load example data on mount for demo
loadExample()

// Expose method to set data externally
defineExpose({
  setData: (data: Partial<Record<string, string>>) => {
    Object.assign(formData, data)
  },
  getData: () => ({ ...formData }),
})
</script>

<style scoped>
.flyer-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-label {
  font-weight: 500;
  font-size: 0.875rem;
  color: #374151;
}

.form-input,
.form-textarea {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: border-color 0.15s ease;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background-color: #e5e7eb;
}

.field-type-badge {
  margin-left: 0.5rem;
  padding: 0.125rem 0.375rem;
  background: #dbeafe;
  color: #1e40af;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 0.25rem;
}

.image-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-file-input {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.form-file-input::-webkit-file-upload-button {
  padding: 0.375rem 0.75rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  cursor: pointer;
  margin-right: 0.5rem;
}

.form-file-input::-webkit-file-upload-button:hover {
  background: #e5e7eb;
}

.image-preview {
  max-width: 200px;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  overflow: hidden;
}

.image-preview img {
  width: 100%;
  height: auto;
  display: block;
}
</style>
