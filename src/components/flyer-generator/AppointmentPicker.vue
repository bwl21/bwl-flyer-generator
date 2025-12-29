<template>
  <div class="appointment-picker">
    <div class="picker-header">
      <h3 class="picker-title">ChurchTools-Termin laden</h3>
      <div class="picker-actions">
        <button 
          type="button" 
          class="btn-config" 
          @click="showMapping = !showMapping"
          :class="{ active: showMapping }"
        >
          ⚙️ Mapping
        </button>
        <button type="button" class="btn-close" @click="$emit('close')" aria-label="Schließen">
          ×
        </button>
      </div>
    </div>

    <div class="picker-content">
      <!-- Mapping Configuration -->
      <div v-if="showMapping" class="mapping-config">
        <h4 class="mapping-title">Feld-Mapping konfigurieren</h4>
        <p class="mapping-description">
          Ordnen Sie Termin-Daten den Formularfeldern zu:
        </p>
        <div class="mapping-list">
          <div v-for="field in templateFields" :key="field" class="mapping-item">
            <label class="mapping-label">{{ field }}</label>
            <select v-model="fieldMapping[field]" class="mapping-select">
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
        <div class="mapping-actions">
          <button type="button" class="btn btn-secondary btn-sm" @click="resetMapping">
            Zurücksetzen
          </button>
          <button type="button" class="btn btn-primary btn-sm" @click="saveCurrentMapping">
            Speichern
          </button>
        </div>
      </div>

      <!-- Search Input -->
      <div v-if="!showMapping" class="search-group">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Termin suchen..."
          @input="handleSearch"
        />
        <div v-if="loading" class="search-spinner">Lädt...</div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <!-- Appointments List -->
      <div v-if="!showMapping && filteredAppointments.length > 0" class="appointments-list">
        <div
          v-for="appointment in filteredAppointments"
          :key="getAppointmentId(appointment)"
          class="appointment-item"
          @click="selectAppointment(appointment)"
        >
          <div class="appointment-header">
            <h4 class="appointment-title">{{ getTitle(appointment) }}</h4>
            <span class="appointment-calendar">{{ getCalendarName(appointment) }}</span>
          </div>
          <div class="appointment-details">
            <span class="appointment-date">{{ formatDate(appointment) }}</span>
            <span v-if="getLocation(appointment)" class="appointment-location">
              📍 {{ getLocation(appointment) }}
            </span>
          </div>
          <p v-if="getDescription(appointment)" class="appointment-description">
            {{ truncate(getDescription(appointment), 100) }}
          </p>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!showMapping && !loading && searchQuery" class="empty-state">
        Keine Termine gefunden
      </div>

      <div v-else-if="!showMapping && !loading && !searchQuery" class="empty-state">
        Geben Sie einen Suchbegriff ein, um Termine zu finden
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fetchAppointments, identifyCalendars } from '../../services/churchtools'
import { getAllTemplates } from '../../services/pdfme-templates'
import type { AppointmentBase, AppointmentCalculated } from '../../ct-types'
import {
  loadMapping,
  saveMapping,
  applyMapping,
  APPOINTMENT_FIELD_LABELS,
  DEFAULT_MAPPING,
  type FieldMapping,
} from '../../services/appointment-mapper'

type Appointment = AppointmentBase | AppointmentCalculated

const props = defineProps<{
  templateFields?: string[]
}>()

const emit = defineEmits<{
  close: []
  select: [data: Record<string, string>]
}>()

const searchQuery = ref('')
const appointments = ref<Appointment[]>([])
const loading = ref(false)
const error = ref('')

// Helper to get base appointment
const getBase = (appointment: Appointment): AppointmentBase => {
  return 'base' in appointment ? appointment.base : appointment
}

// Helper functions
const getAppointmentId = (appointment: Appointment) => getBase(appointment).id
const getTitle = (appointment: Appointment) => getBase(appointment).title
const getCalendarName = (appointment: Appointment) => getBase(appointment).calendar.nameTranslated
const getDescription = (appointment: Appointment) => getBase(appointment).description || ''
const getLocation = (appointment: Appointment) => {
  const base = getBase(appointment)
  if (base.address?.street) {
    return `${base.address.street}, ${base.address.city || ''}`
  }
  return ''
}

const formatDate = (appointment: Appointment) => {
  const base = getBase(appointment)
  const start = new Date(base.startDate)
  const end = new Date(base.endDate)
  
  const dateStr = start.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  
  const timeStr = base.allDay 
    ? 'Ganztägig' 
    : `${start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
  
  return `${dateStr}, ${timeStr}`
}

const truncate = (text: string, length: number) => {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

// Filter appointments based on search query
const filteredAppointments = computed(() => {
  if (!searchQuery.value) return appointments.value
  
  const query = searchQuery.value.toLowerCase()
  return appointments.value.filter(appointment => {
    const base = getBase(appointment)
    return (
      base.title.toLowerCase().includes(query) ||
      base.calendar.nameTranslated.toLowerCase().includes(query) ||
      (base.description && base.description.toLowerCase().includes(query))
    )
  })
})

// Load appointments
const loadAppointments = async () => {
  loading.value = true
  error.value = ''
  
  try {
    // Get calendars
    const { publicCalendars } = await identifyCalendars()
    
    if (publicCalendars.length === 0) {
      error.value = 'Keine Kalender gefunden'
      return
    }
    
    // Load appointments for next 90 days
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 90)
    
    const calendarIds = publicCalendars.map(c => c.id)
    const result = await fetchAppointments(calendarIds, startDate, endDate)
    
    appointments.value = result
  } catch (err) {
    console.error('Failed to load appointments:', err)
    error.value = 'Fehler beim Laden der Termine'
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  // Search is handled by computed property
}

const selectAppointment = (appointment: Appointment) => {
  emit('select', appointment)
  emit('close')
}

// Load appointments on mount
onMounted(() => {
  loadAppointments()
})
</script>

<style scoped>
.appointment-picker {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.picker-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
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

.btn-close:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.picker-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.search-group {
  position: relative;
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-spinner {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  font-size: 0.875rem;
}

.error-message {
  padding: 0.75rem;
  background: #fef2f2;
  color: #991b1b;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.appointments-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.appointment-item {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.appointment-item:hover {
  border-color: #3b82f6;
  background: #f9fafb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.appointment-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 0.5rem;
}

.appointment-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  flex: 1;
}

.appointment-calendar {
  padding: 0.125rem 0.5rem;
  background: #dbeafe;
  color: #1e40af;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 0.25rem;
  margin-left: 0.5rem;
}

.appointment-details {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.appointment-date {
  font-weight: 500;
}

.appointment-location {
  color: #059669;
}

.appointment-description {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
  font-size: 0.875rem;
}
</style>
