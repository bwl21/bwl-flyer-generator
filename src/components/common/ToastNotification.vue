<template>
  <div v-if="toasts.length > 0" class="toast-container">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :class="['toast', `toast-${toast.type}`]"
      @click="removeToast(toast.id)"
    >
      <div class="toast-icon">
        <span v-if="toast.type === 'success'">✓</span>
        <span v-else-if="toast.type === 'error'">✕</span>
        <span v-else-if="toast.type === 'warning'">⚠</span>
        <span v-else>ℹ</span>
      </div>
      <div class="toast-content">
        <div class="toast-title">{{ toast.title }}</div>
        <div v-if="toast.message" class="toast-message">{{ toast.message }}</div>
      </div>
      <button class="toast-close" @click="removeToast(toast.id)">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { toastService } from '../../services/toast-service'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  persistent?: boolean
}

const toasts = ref<Toast[]>([])

let toastIdCounter = 0

const addToast = (toast: Omit<Toast, 'id'>) => {
  const id = `toast-${++toastIdCounter}-${Date.now()}`
  const newToast: Toast = {
    id,
    duration: 5000,
    persistent: false,
    ...toast
  }
  
  toasts.value.push(newToast)
  
  // Auto-remove nach duration (wenn nicht persistent)
  if (!newToast.persistent && newToast.duration && newToast.duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, newToast.duration)
  }
  
  return id
}

const removeToast = (id: string) => {
  const index = toasts.value.findIndex(toast => toast.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

const clearAllToasts = () => {
  toasts.value = []
}

// Global functions für einfache Verwendung
const success = (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
  return addToast({ type: 'success', title, message, ...options })
}

const error = (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
  return addToast({ type: 'error', title, message, duration: 8000, ...options })
}

const warning = (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
  return addToast({ type: 'warning', title, message, ...options })
}

const info = (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => {
  return addToast({ type: 'info', title, message, ...options })
}

// Toast-Service registrieren
onMounted(() => {
  toastService.setInstance({
    addToast,
    removeToast,
    clearAllToasts
  })
  
  // Global verfügbar machen (Fallback)
  ;(window as any).toast = {
    success,
    error,
    warning,
    info,
    add: addToast,
    remove: removeToast,
    clear: clearAllToasts
  }
})

onUnmounted(() => {
  delete (window as any).toast
})

defineExpose({
  success,
  error,
  warning,
  info,
  addToast,
  removeToast,
  clearAllToasts
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 400px;
}

.toast {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  animation: slideIn 0.3s ease;
}

.toast:hover {
  transform: translateX(-5px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.toast-success {
  border-left: 4px solid #10b981;
}

.toast-success .toast-icon {
  color: #10b981;
}

.toast-error {
  border-left: 4px solid #ef4444;
}

.toast-error .toast-icon {
  color: #ef4444;
}

.toast-warning {
  border-left: 4px solid #f59e0b;
}

.toast-warning .toast-icon {
  color: #f59e0b;
}

.toast-info {
  border-left: 4px solid #3b82f6;
}

.toast-info .toast-icon {
  color: #3b82f6;
}

.toast-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 12px;
  font-size: 14px;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.4;
  color: #1f2937;
}

.toast-message {
  font-size: 13px;
  line-height: 1.4;
  color: #6b7280;
  margin-top: 2px;
  word-wrap: break-word;
}

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  font-size: 18px;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  margin-left: 8px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.toast-close:hover {
  background: #f3f4f6;
  color: #6b7280;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Responsive Design */
@media (max-width: 640px) {
  .toast-container {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
  
  .toast {
    padding: 10px 12px;
  }
  
  .toast-title {
    font-size: 13px;
  }
  
  .toast-message {
    font-size: 12px;
  }
}
</style>
