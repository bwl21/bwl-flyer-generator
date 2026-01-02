<template>
  <div class="app">
    <header class="app-header">
      <h1>Flyer Generator</h1>
      <nav class="tab-navigation">
        <button
          :class="['tab-button', { active: activeTab === 'generator' }]"
          @click="switchTab('generator')"
        >
          Flyer Generator
        </button>
        <button
          :class="['tab-button', { active: activeTab === 'admin' }]"
          @click="switchTab('admin')"
        >
          TemplateSet Editor
        </button>
        <button
          :class="['tab-button', { active: activeTab === 'manager' }]"
          @click="switchTab('manager')"
        >
          TemplateSet-Manager
        </button>
      </nav>
    </header>

    <main class="app-main">
      <FlyerGenerator v-if="activeTab === 'generator'" :key="generatorKey" />
      <TemplateSetEditor v-else-if="activeTab === 'admin'" />
      <TemplateSetManager v-else-if="activeTab === 'manager'" />
    </main>

    <ToastNotification />
  </div>
</template>

<script setup lang="ts">
import { ref, provide, getCurrentInstance } from 'vue'
import FlyerGenerator from './components/flyer-generator/FlyerGenerator.vue'
import TemplateSetEditor from './components/admin/TemplateSetEditor.vue'
import TemplateSetManager from './components/TemplateSetManager.vue'
import ToastNotification from './components/common/ToastNotification.vue'

type TabId = 'generator' | 'admin' | 'manager'
const activeTab = ref<TabId>('generator')
const selectedTemplateSet = ref(null)
const generatorKey = ref(0)

// Tab switching function
const switchTab = (tab: TabId) => {
  activeTab.value = tab
  if (tab === 'generator') {
    generatorKey.value++ // Force re-render of FlyerGenerator
  }
}

// Provide for inject (composition API)
provide('activeTab', activeTab)
provide('selectedTemplateSet', selectedTemplateSet)

// For legacy globalProperties access (used in TemplateSetManager)
const app = getCurrentInstance()?.appContext.app
if (app) {
  app.config.globalProperties.activeTab = activeTab
  app.config.globalProperties.selectedTemplateSet = selectedTemplateSet
}
</script>

<style>
/* Reset and base styles */
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #1f2937;
  background-color: #f3f4f6;
}

#app {
  min-height: 100vh;
}

.app-header {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem;
}

.app-header h1 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
}

.tab-navigation {
  display: flex;
  gap: 0;
}

.tab-button {
  padding: 1rem 1.5rem;
  border: none;
  background: transparent;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;
}

.tab-button:hover {
  color: #374151;
  background: #f9fafb;
}

.tab-button.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.app-main {
  padding: 1rem;
}
</style>