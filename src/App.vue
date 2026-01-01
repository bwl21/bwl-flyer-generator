<template>
  <div id="app">
    <!-- Tab Navigation -->
    <nav class="app-nav">
      <button
        type="button"
        class="nav-tab"
        :class="{ active: activeTab === 'generator' }"
        @click="activeTab = 'generator'"
      >
        Flyer Generator
      </button>
      <button
        type="button"
        class="nav-tab"
        :class="{ active: activeTab === 'admin' }"
        @click="activeTab = 'admin'"
      >
        Admin – Vorlagen
      </button>
      <button
        type="button"
        class="nav-tab"
        :class="{ active: activeTab === 'manager' }"
        @click="activeTab = 'manager'"
      >
        TemplateSet-Manager
      </button>
    </nav>

    <!-- Content -->
    <main class="app-content">
      <FlyerGenerator v-if="activeTab === 'generator'" />
      <TemplateSetEditor v-else-if="activeTab === 'admin'" />
      <TemplateSetManager v-else-if="activeTab === 'manager'" />
    </main>

    <Toast />
  </div>
</template>

<script setup lang="ts">
import { ref, provide, getCurrentInstance } from 'vue'
import FlyerGenerator from './components/flyer-generator/FlyerGenerator.vue'
import TemplateSetEditor from './components/admin/TemplateSetEditor.vue'
import TemplateSetManager from './components/TemplateSetManager.vue'
import Toast from './components/common/Toast.vue'

type TabId = 'generator' | 'admin' | 'manager'
const activeTab = ref<TabId>('generator')
const selectedTemplateSet = ref(null)

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

.app-nav {
  display: flex;
  gap: 0;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 1rem;
}

.nav-tab {
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

.nav-tab:hover {
  color: #374151;
  background: #f9fafb;
}

.nav-tab.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.app-content {
  padding: 1rem;
}
</style>