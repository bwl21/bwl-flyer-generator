import type { AppointmentBase, AppointmentCalculated } from '../ct-types'

type Appointment = AppointmentBase | AppointmentCalculated

/**
 * Available appointment data fields that can be mapped
 */
export interface AppointmentDataFields {
  title: string
  subtitle: string
  description: string
  startDate: string // ISO date
  endDate: string // ISO date
  datetime: string // Formatted date + time
  date: string // Formatted date only
  time: string // Formatted time only
  allDay: boolean
  street: string
  city: string
  zip: string
  address: string // Full address
  calendarName: string
  link: string
  isInternal: boolean
}

/**
 * Mapping configuration: template field name -> appointment field name
 */
export type FieldMapping = Record<string, keyof AppointmentDataFields | ''>

/**
 * Default mapping configuration
 */
export const DEFAULT_MAPPING: FieldMapping = {
  title: 'title',
  datetime: 'datetime',
  location: 'address',
  speaker: '',
  desc: 'description',
  qr: 'link',
}

/**
 * Extract all available data from an appointment
 */
export function extractAppointmentData(appointment: Appointment): AppointmentDataFields {
  const base = 'base' in appointment ? appointment.base : appointment
  
  // Format date and time
  const start = new Date(base.startDate)
  const end = new Date(base.endDate)
  
  const dateStr = start.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  
  const timeStr = base.allDay 
    ? 'Ganztägig' 
    : `${start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
  
  const datetimeStr = base.allDay ? dateStr : `${dateStr}, ${timeStr}`
  
  // Format address
  const addressParts: string[] = []
  if (base.address?.street) addressParts.push(base.address.street)
  if (base.address?.zip) addressParts.push(base.address.zip)
  if (base.address?.city) addressParts.push(base.address.city)
  const fullAddress = addressParts.join(', ')
  
  return {
    title: base.title,
    subtitle: base.subtitle || '',
    description: base.description || '',
    startDate: base.startDate,
    endDate: base.endDate,
    datetime: datetimeStr,
    date: dateStr,
    time: timeStr,
    allDay: base.allDay,
    street: base.address?.street || '',
    city: base.address?.city || '',
    zip: base.address?.zip || '',
    address: fullAddress,
    calendarName: base.calendar?.nameTranslated || base.calendar?.name || '',
    link: base.link || '',
    isInternal: base.isInternal,
  }
}

/**
 * Apply mapping to convert appointment data to form data
 */
export function applyMapping(
  appointment: Appointment,
  mapping: FieldMapping
): Record<string, string> {
  const appointmentData = extractAppointmentData(appointment)
  const result: Record<string, string> = {}
  
  for (const [templateField, appointmentField] of Object.entries(mapping)) {
    if (appointmentField && appointmentField in appointmentData) {
      const value = appointmentData[appointmentField]
      // Convert boolean to string
      result[templateField] = typeof value === 'boolean' ? (value ? 'Ja' : 'Nein') : String(value)
    }
  }
  
  return result
}

/**
 * Get human-readable labels for appointment fields
 */
export const APPOINTMENT_FIELD_LABELS: Record<keyof AppointmentDataFields, string> = {
  title: 'Titel',
  subtitle: 'Untertitel',
  description: 'Beschreibung',
  startDate: 'Startdatum (ISO)',
  endDate: 'Enddatum (ISO)',
  datetime: 'Datum + Uhrzeit',
  date: 'Datum',
  time: 'Uhrzeit',
  allDay: 'Ganztägig',
  street: 'Straße',
  city: 'Stadt',
  zip: 'PLZ',
  address: 'Adresse (komplett)',
  calendarName: 'Kalender',
  link: 'Link',
  isInternal: 'Intern',
}

/**
 * Storage key for mapping configuration
 */
const STORAGE_KEY = 'bwl-flyer-appointment-mapping'

/**
 * Save mapping configuration to localStorage
 */
export function saveMapping(mapping: FieldMapping): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping))
  } catch (error) {
    console.error('Failed to save mapping:', error)
  }
}

/**
 * Load mapping configuration from localStorage
 */
export function loadMapping(): FieldMapping {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load mapping:', error)
  }
  return { ...DEFAULT_MAPPING }
}
