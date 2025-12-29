<template>
  <div class="flyer-form">
    <div v-for="field in formFields" :key="field.name" class="form-group">
      <label :for="field.name" class="form-label">
        {{ field.label }}
        <span v-if="field.required">*</span>
        <span v-if="field.type === 'image'" class="field-type-badge">Bild</span>
      </label>
      
      <!-- Image field with file upload and URL input -->
      <div v-if="field.type === 'image'" class="image-field">
        <div class="image-input-tabs">
          <button 
            type="button" 
            class="tab-button" 
            :class="{ active: !imageInputs[field.name]?.isUrl }"
            @click="setImageInputType(field.name, false)"
          >
            Datei hochladen
          </button>
          <button 
            type="button" 
            class="tab-button" 
            :class="{ active: imageInputs[field.name]?.isUrl }"
            @click="setImageInputType(field.name, true)"
          >
            URL eingeben
          </button>
        </div>
        
        <!-- File Upload -->
        <div v-if="!imageInputs[field.name]?.isUrl" class="file-upload">
          <input
            :id="`${field.name}-file`"
            type="file"
            accept="image/*"
            class="form-file-input"
            @change="handleImageUpload($event, field.name)"
          />
          <div v-if="formData[field.name] && formData[field.name].startsWith('data:')" class="image-preview">
            <img :src="formData[field.name]" alt="Vorschau" />
          </div>
        </div>
        
        <!-- URL Input -->
        <div v-else class="url-input">
          <input
            :id="`${field.name}-url`"
            :value="imageInputs[field.name]?.url || ''"
            type="url"
            class="form-input"
            placeholder="https://example.com/image.jpg"
            @input="(e) => { if (imageInputs[field.name]) imageInputs[field.name].url = (e.target as HTMLInputElement).value }"
            @blur="updateImageFromUrl(field.name)"
            @keydown.enter="updateImageFromUrl(field.name)"
          />
          <button 
            type="button" 
            class="btn btn-sm" 
            :disabled="!isValidUrl(imageInputs[field.name]?.url)"
            @click="updateImageFromUrl(field.name)"
          >
            URL laden
          </button>
          <div v-if="imageInputs[field.name]?.error" class="error-message">
            {{ imageInputs[field.name]?.error }}
          </div>
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
import { reactive, watch, computed, onMounted } from 'vue'
import { getAllTemplates } from '../../services/pdfme-templates'

const emit = defineEmits<{
  update: [data: Record<string, string>]
}>()

// Track image input types and URLs
interface ImageInputState {
  isUrl: boolean
  url: string
  error: string | null
}

const imageInputs = reactive<Record<string, ImageInputState>>({})

// Initialize image input states
const initImageInputs = () => {
  const templates = getAllTemplates()
  if (!templates) return
  
  Object.values(templates).forEach(template => {
    if (!template?.schemas?.[0]) return
    
    template.schemas[0].forEach(schema => {
      if (schema.type === 'image' && !imageInputs[schema.name]) {
        imageInputs[schema.name] = {
          isUrl: false,
          url: '',
          error: null
        }
      }
    })
  })
}

// Set image input type (file or URL)
const setImageInputType = (fieldName: string, isUrl: boolean) => {
  if (!imageInputs[fieldName]) {
    imageInputs[fieldName] = { isUrl, url: '', error: null }
  } else {
    imageInputs[fieldName].isUrl = isUrl
    imageInputs[fieldName].error = null
  }
  
  // Clear the field when switching input types
  if (isUrl) {
    formData[fieldName] = ''
  } else {
    imageInputs[fieldName].url = ''
  }
}

// Check if a string is a valid URL
const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false
  try {
    new URL(url)
    return url.startsWith('http://') || url.startsWith('https://')
  } catch {
    return false
  }
}

// Load image from URL with CORS support
async function loadImageFromUrl(url: string): Promise<{data: string, format: string}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';  // ← WICHTIG!
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      
      // JPEG für pdfme (auch PNG → JPEG konvertierbar)
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob from image'));
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => resolve({
          data: reader.result as string,
          format: 'jpeg'
        });
        reader.onerror = () => reject(new Error('Failed to read blob data'));
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.95);
    };
    img.onerror = (e) => {
      console.error('Image load error:', e);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

// Update image from URL
const updateImageFromUrl = async (fieldName: string) => {
  const input = imageInputs[fieldName]
  if (!input || !input.url) {
    input.error = 'Bitte geben Sie eine gültige URL ein'
    return
  }

  if (!isValidUrl(input.url)) {
    input.error = 'Bitte geben Sie eine gültige HTTP/HTTPS-URL ein'
    return
  }

  input.isLoading = true
  input.error = null

  try {
    const { data } = await loadImageFromUrl(input.url);
    formData[fieldName] = data;
  } catch (error) {
    console.error('Error loading image:', error);
    input.error = 'Bild konnte nicht geladen werden. Bitte überprüfen Sie die URL und CORS-Einstellungen.';
  } finally {
    input.isLoading = false;
  }
}

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
  if (!templates) return []
  
  const fieldMap = new Map<string, string>() // name -> type
  
  // Collect all field names and types from all templates
  Object.values(templates).forEach(template => {
    if (!template || !template.schemas || !template.schemas[0]) return
    
    template.schemas[0].forEach(schema => {
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

// Watch formFields and initialize fields when they change
watch(
  formFields,
  (fields) => {
    fields.forEach(field => {
      if (!(field.name in formData)) {
        formData[field.name] = ''
      }
    })
  },
  { immediate: true }
)

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
  // Initialize image inputs if not already done
  if (Object.keys(imageInputs).length === 0) {
    initImageInputs()
  }
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
  
  // Set example image if image field exists (use transparent 1x1 PNG as placeholder)
  Object.keys(formData).forEach(key => {
    const field = formFields.value.find(f => f.name === key)
    if (field?.type === 'image' && !formData[key]) {
      // Use a 1x1 transparent PNG placeholder (compatible with PDFme)
      formData[key] = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    }
  })
}

// Initialize image inputs
onMounted(() => {
  initImageInputs()
  // Load example data on mount for demo
  loadExample()
})

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

.image-input-tabs {
  display: flex;
  margin-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
  
  .tab-button {
    padding: 6px 12px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-size: 14px;
    color: #4a5568;
    transition: all 0.2s;
    
    &:hover {
      color: #2d3748;
    }
    
    &.active {
      color: #2b6cb0;
      border-bottom-color: #2b6cb0;
      font-weight: 500;
    }
  }
}

.url-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  .btn {
    align-self: flex-start;
    padding: 4px 12px;
    font-size: 14px;
  }
  
  .error-message {
    color: #e53e3e;
    font-size: 13px;
    margin-top: 4px;
  }
}

.image-preview {
  margin-top: 10px;
  max-width: 100%;
  max-height: 200px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  
  img {
    display: block;
    max-width: 100%;
    max-height: 200px;
    object-fit: contain;
  }
}
</style>
