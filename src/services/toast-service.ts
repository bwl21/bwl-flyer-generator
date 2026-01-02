// Toast-Typen definieren
export type ToastType = {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  persistent?: boolean
}

export interface ToastOptions {
  duration?: number
  persistent?: boolean
}

class ToastService {
  private toastInstance: any = null

  // Setzt die Toast-Instanz (wird von ToastNotification-Komponente aufgerufen)
  setInstance(instance: any) {
    this.toastInstance = instance
  }

  private showToast(type: ToastType['type'], title: string, message?: string, options?: ToastOptions) {
    if (!this.toastInstance) {
      console.warn('Toast instance not available. Falling back to console.')
      console[type === 'error' ? 'error' : 'log'](`${title}: ${message || ''}`)
      return null
    }

    return this.toastInstance.addToast({
      type,
      title,
      message,
      ...options
    })
  }

  success(title: string, message?: string, options?: ToastOptions) {
    return this.showToast('success', title, message, options)
  }

  error(title: string, message?: string, options?: ToastOptions) {
    return this.showToast('error', title, message, { duration: 8000, ...options })
  }

  warning(title: string, message?: string, options?: ToastOptions) {
    return this.showToast('warning', title, message, options)
  }

  info(title: string, message?: string, options?: ToastOptions) {
    return this.showToast('info', title, message, options)
  }

  // Spezielle Methoden für häufige Anwendungsfälle
  templateSaved(name: string) {
    return this.success('Template gespeichert', `Template "${name}" wurde erfolgreich gespeichert.`)
  }

  templateSetSaved(name: string) {
    return this.success('Template-Set gespeichert', `Template-Set "${name}" wurde erfolgreich gespeichert.`)
  }

  templateSetLoaded(name: string) {
    return this.success('Template-Set geladen', `Template-Set "${name}" wurde geladen.`)
  }

  templateDeleted(name: string) {
    return this.warning('Template gelöscht', `Template "${name}" wurde gelöscht.`)
  }

  appointmentLoaded(count: number) {
    return this.success('Termine geladen', `${count} Termine wurden erfolgreich geladen.`)
  }

  pdfGenerated() {
    return this.success('PDF generiert', 'Das Flyer-PDF wurde erfolgreich generiert.')
  }

  networkError(message?: string) {
    return this.error('Netzwerkfehler', message || 'Bitte überprüfen Sie Ihre Internetverbindung.')
  }

  storageError(message?: string) {
    return this.error('Speicherfehler', message || 'Daten konnten nicht gespeichert werden.')
  }

  validationError(message: string) {
    return this.warning('Validierungsfehler', message)
  }

  // Methode zum Entfernen eines bestimmten Toasts
  remove(id: string) {
    if (this.toastInstance) {
      this.toastInstance.removeToast(id)
    }
  }

  // Methode zum Entfernen aller Toasts
  clearAll() {
    if (this.toastInstance) {
      this.toastInstance.clearAllToasts()
    }
  }
}

// Singleton-Instanz
export const toastService = new ToastService()

// Export für einfache Verwendung
export const toast = {
  success: toastService.success.bind(toastService),
  error: toastService.error.bind(toastService),
  warning: toastService.warning.bind(toastService),
  info: toastService.info.bind(toastService),
  templateSaved: toastService.templateSaved.bind(toastService),
  templateSetSaved: toastService.templateSetSaved.bind(toastService),
  templateSetLoaded: toastService.templateSetLoaded.bind(toastService),
  templateDeleted: toastService.templateDeleted.bind(toastService),
  appointmentLoaded: toastService.appointmentLoaded.bind(toastService),
  pdfGenerated: toastService.pdfGenerated.bind(toastService),
  networkError: toastService.networkError.bind(toastService),
  storageError: toastService.storageError.bind(toastService),
  validationError: toastService.validationError.bind(toastService),
  remove: toastService.remove.bind(toastService),
  clearAll: toastService.clearAll.bind(toastService)
}
