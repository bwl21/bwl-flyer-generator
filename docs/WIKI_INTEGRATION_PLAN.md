# Wiki Integration Plan

## Übersicht

Plan zur Integration von ChurchTools Wiki als Template-Quelle.

## Ziele

1. Templates aus Wiki-Anhängen laden
2. Zentrale Verwaltung für alle Gemeinde-Mitglieder
3. Versionierung und Berechtigungen nutzen
4. Offline-Fallback für Zuverlässigkeit

## ChurchTools Wiki API

### Relevante Endpoints

```typescript
// Wiki-Seiten abrufen
GET /api/wiki/categories/{categoryId}/pages
GET /api/wiki/pages/{pageId}

// Anhänge abrufen
GET /api/wiki/pages/{pageId}/attachments
GET /api/files/{fileId}
GET /api/files/{fileId}/download
```

### Beispiel-Response: Wiki-Seite

```json
{
  "id": 123,
  "title": "Flyer-Vorlagen",
  "text": "Hier finden Sie alle offiziellen Vorlagen...",
  "categoryId": 5,
  "version": 3,
  "modifiedDate": "2025-12-27T10:30:00Z",
  "modifiedPerson": {
    "id": 42,
    "firstName": "Max",
    "lastName": "Mustermann"
  }
}
```

### Beispiel-Response: Anhänge

```json
{
  "data": [
    {
      "id": 456,
      "name": "default-church-flyers.json",
      "filename": "default-church-flyers.json",
      "filesize": 15234,
      "uploadDate": "2025-12-27T10:30:00Z",
      "uploadPerson": {
        "id": 42,
        "firstName": "Max",
        "lastName": "Mustermann"
      }
    }
  ]
}
```

## Architektur

### Komponenten

```
┌─────────────────────────────────────────────────────┐
│                  UI Layer                           │
│  ┌──────────────────────────────────────────────┐  │
│  │  TemplateSelectorModal                       │  │
│  │  ├─ AssetTemplateList                        │  │
│  │  └─ WikiTemplateList                         │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              Service Layer                          │
│  ┌──────────────────────────────────────────────┐  │
│  │  TemplateLoaderService                       │  │
│  │  ├─ AssetTemplateLoader                      │  │
│  │  └─ WikiTemplateLoader                       │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  TemplateCacheService                        │  │
│  │  ├─ LocalStorage Cache                       │  │
│  │  └─ IndexedDB Cache                          │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              API Layer                              │
│  ┌──────────────────────────────────────────────┐  │
│  │  ChurchToolsClient                           │  │
│  │  ├─ Wiki API                                 │  │
│  │  └─ File API                                 │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Implementation

### 1. Wiki Template Loader

```typescript
// src/services/wiki-template-loader.ts

import { churchtoolsClient } from '@churchtools/churchtools-client'

export interface WikiTemplateSource {
  wikiPageId: number
  wikiPageTitle: string
  categoryId?: number
}

export class WikiTemplateLoader {
  private cache: Map<string, TemplateSet> = new Map()
  
  /**
   * List all template files from a wiki page
   */
  async listTemplates(source: WikiTemplateSource): Promise<TemplateSetMetadata[]> {
    try {
      const attachments = await churchtoolsClient.get(
        `/wiki/pages/${source.wikiPageId}/attachments`
      )
      
      return attachments.data
        .filter(a => a.filename.endsWith('.json'))
        .map(a => ({
          id: `wiki-${a.id}`,
          name: a.filename.replace('.json', ''),
          description: `Wiki-Anhang von ${source.wikiPageTitle}`,
          version: '1.0', // Could be extracted from filename
          source: 'wiki' as const,
          path: a.id.toString(),
          metadata: {
            uploadDate: a.uploadDate,
            uploadPerson: a.uploadPerson,
            filesize: a.filesize,
          }
        }))
    } catch (error) {
      console.error('Failed to list wiki templates:', error)
      throw new Error('Wiki-Vorlagen konnten nicht geladen werden')
    }
  }
  
  /**
   * Load template set from wiki attachment
   */
  async loadTemplate(fileId: string): Promise<TemplateSet> {
    // Check cache first
    const cached = this.cache.get(fileId)
    if (cached) {
      return cached
    }
    
    try {
      // Download file
      const response = await churchtoolsClient.get(
        `/files/${fileId}/download`,
        { responseType: 'json' }
      )
      
      // Parse and validate
      const templateSet = this.parseTemplateSet(response.data)
      
      // Cache for future use
      this.cache.set(fileId, templateSet)
      
      // Also cache in localStorage for offline use
      await this.cacheOffline(fileId, templateSet)
      
      return templateSet
    } catch (error) {
      console.error('Failed to load wiki template:', error)
      
      // Try offline cache
      const offline = await this.loadFromOfflineCache(fileId)
      if (offline) {
        return offline
      }
      
      throw new Error('Vorlage konnte nicht geladen werden')
    }
  }
  
  /**
   * Search for wiki pages containing templates
   */
  async searchTemplatePages(query: string = 'Flyer'): Promise<WikiTemplateSource[]> {
    try {
      const pages = await churchtoolsClient.get('/wiki/pages', {
        params: { search: query }
      })
      
      return pages.data.map(p => ({
        wikiPageId: p.id,
        wikiPageTitle: p.title,
        categoryId: p.categoryId,
      }))
    } catch (error) {
      console.error('Failed to search wiki pages:', error)
      return []
    }
  }
  
  private parseTemplateSet(data: any): TemplateSet {
    // Validate structure
    if (!data.version || !data.templates) {
      throw new Error('Invalid template format')
    }
    
    // Resolve variables ({{colors.primary}})
    return this.resolveVariables(data)
  }
  
  private resolveVariables(data: any): TemplateSet {
    // Implementation for {{variable}} resolution
    // ...
    return data
  }
  
  private async cacheOffline(fileId: string, templateSet: TemplateSet): Promise<void> {
    try {
      localStorage.setItem(
        `template-cache-${fileId}`,
        JSON.stringify({
          templateSet,
          cachedAt: new Date().toISOString(),
        })
      )
    } catch (error) {
      console.warn('Failed to cache template offline:', error)
    }
  }
  
  private async loadFromOfflineCache(fileId: string): Promise<TemplateSet | null> {
    try {
      const cached = localStorage.getItem(`template-cache-${fileId}`)
      if (!cached) return null
      
      const { templateSet, cachedAt } = JSON.parse(cached)
      
      // Check if cache is not too old (e.g., 7 days)
      const age = Date.now() - new Date(cachedAt).getTime()
      const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
      
      if (age > maxAge) {
        localStorage.removeItem(`template-cache-${fileId}`)
        return null
      }
      
      return templateSet
    } catch (error) {
      return null
    }
  }
}
```

### 2. Wiki Template List Component

```vue
<!-- src/components/WikiTemplateList.vue -->

<template>
  <div class="wiki-template-list">
    <!-- Wiki Page Selection -->
    <div class="wiki-page-selector">
      <label>Wiki-Seite:</label>
      <select v-model="selectedPageId" @change="loadTemplates">
        <option value="">-- Seite auswählen --</option>
        <option 
          v-for="page in wikiPages" 
          :key="page.wikiPageId"
          :value="page.wikiPageId"
        >
          {{ page.wikiPageTitle }}
        </option>
      </select>
      <button @click="searchPages" class="btn-secondary">
        Seiten suchen
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading">
      <span class="spinner"></span>
      Lade Wiki-Vorlagen...
    </div>

    <!-- Error State -->
    <div v-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="retry">Erneut versuchen</button>
    </div>

    <!-- Template List -->
    <div v-if="!loading && !error" class="template-items">
      <div 
        v-for="template in templates"
        :key="template.id"
        class="template-item"
        :class="{ selected: template.id === selectedId }"
        @click="$emit('select', template)"
      >
        <div class="template-info">
          <h4>{{ template.name }}</h4>
          <p v-if="template.description">{{ template.description }}</p>
          <div class="template-meta">
            <span class="version">v{{ template.version }}</span>
            <span class="source">🌐 Wiki</span>
            <span class="date">
              {{ formatDate(template.metadata.uploadDate) }}
            </span>
          </div>
        </div>
        <div class="template-actions">
          <button 
            @click.stop="downloadTemplate(template)"
            class="btn-icon"
            title="Herunterladen"
          >
            ⬇️
          </button>
        </div>
      </div>

      <div v-if="templates.length === 0" class="empty-state">
        <p>Keine Vorlagen auf dieser Wiki-Seite gefunden.</p>
        <p class="hint">
          Laden Sie Template-Dateien (.json) als Anhänge auf die Wiki-Seite hoch.
        </p>
      </div>
    </div>

    <!-- Offline Indicator -->
    <div v-if="isOffline" class="offline-notice">
      ⚠️ Offline-Modus: Zeige gecachte Vorlagen
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { WikiTemplateLoader } from '../services/wiki-template-loader'

const props = defineProps<{
  selectedId?: string
}>()

const emit = defineEmits<{
  select: [template: TemplateSetMetadata]
}>()

const loader = new WikiTemplateLoader()

const wikiPages = ref<WikiTemplateSource[]>([])
const selectedPageId = ref<number | ''>('')
const templates = ref<TemplateSetMetadata[]>([])
const loading = ref(false)
const error = ref('')
const isOffline = ref(false)

onMounted(async () => {
  await searchPages()
  
  // Check if offline
  window.addEventListener('online', () => isOffline.value = false)
  window.addEventListener('offline', () => isOffline.value = true)
  isOffline.value = !navigator.onLine
})

async function searchPages() {
  try {
    loading.value = true
    error.value = ''
    wikiPages.value = await loader.searchTemplatePages('Flyer')
    
    // Auto-select first page if available
    if (wikiPages.value.length > 0) {
      selectedPageId.value = wikiPages.value[0].wikiPageId
      await loadTemplates()
    }
  } catch (e) {
    error.value = 'Wiki-Seiten konnten nicht geladen werden'
  } finally {
    loading.value = false
  }
}

async function loadTemplates() {
  if (!selectedPageId.value) return
  
  try {
    loading.value = true
    error.value = ''
    
    const page = wikiPages.value.find(p => p.wikiPageId === selectedPageId.value)
    if (!page) return
    
    templates.value = await loader.listTemplates(page)
  } catch (e) {
    error.value = 'Vorlagen konnten nicht geladen werden'
  } finally {
    loading.value = false
  }
}

async function retry() {
  await loadTemplates()
}

async function downloadTemplate(template: TemplateSetMetadata) {
  // Download template as file for local use
  try {
    const templateSet = await loader.loadTemplate(template.path)
    const blob = new Blob([JSON.stringify(templateSet, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${template.name}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    alert('Download fehlgeschlagen')
  }
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('de-DE')
}
</script>
```

### 3. Configuration

```typescript
// src/config/wiki-templates.ts

export const WIKI_TEMPLATE_CONFIG = {
  // Default wiki page to search for templates
  defaultPageTitle: 'Flyer-Vorlagen',
  
  // Search query for finding template pages
  searchQuery: 'Flyer',
  
  // Cache duration in milliseconds (7 days)
  cacheDuration: 7 * 24 * 60 * 60 * 1000,
  
  // Enable offline mode
  offlineMode: true,
  
  // Auto-refresh interval (check for updates)
  autoRefreshInterval: 60 * 60 * 1000, // 1 hour
}
```

## Sicherheit & Berechtigungen

### ChurchTools Berechtigungen

```typescript
// Check if user has permission to access wiki
async function checkWikiPermission(): Promise<boolean> {
  try {
    const permissions = await churchtoolsClient.get('/permissions')
    return permissions.data.includes('wiki:view')
  } catch {
    return false
  }
}

// Only show wiki tab if user has permission
const canAccessWiki = await checkWikiPermission()
```

### Validierung

```typescript
// Validate template before loading
function validateTemplate(data: any): boolean {
  // Check required fields
  if (!data.version || !data.templates) {
    return false
  }
  
  // Check version compatibility
  if (data.version !== '1.0') {
    console.warn('Unsupported template version:', data.version)
    return false
  }
  
  // Validate each template
  for (const [id, template] of Object.entries(data.templates)) {
    if (!template.basePdf || !template.schemas) {
      return false
    }
  }
  
  return true
}
```

## Offline-Strategie

### Caching-Hierarchie

1. **Memory Cache** - Schnellster Zugriff, verloren bei Reload
2. **LocalStorage** - Persistent, begrenzt auf ~5MB
3. **IndexedDB** - Persistent, größere Kapazität
4. **Service Worker** - Für vollständige Offline-Funktionalität

### Sync-Strategie

```typescript
// Check for updates when online
async function syncTemplates() {
  if (!navigator.onLine) return
  
  const cachedTemplates = await getCachedTemplates()
  
  for (const template of cachedTemplates) {
    try {
      // Check if wiki version is newer
      const wikiVersion = await getWikiTemplateVersion(template.id)
      
      if (wikiVersion > template.version) {
        // Update cache
        const updated = await loader.loadTemplate(template.path)
        await updateCache(template.id, updated)
        
        // Notify user
        showNotification(`Vorlage "${template.name}" wurde aktualisiert`)
      }
    } catch (e) {
      console.warn('Sync failed for template:', template.id)
    }
  }
}

// Run sync periodically
setInterval(syncTemplates, WIKI_TEMPLATE_CONFIG.autoRefreshInterval)
```

## Testing

### Unit Tests

```typescript
describe('WikiTemplateLoader', () => {
  it('should list templates from wiki page', async () => {
    const loader = new WikiTemplateLoader()
    const templates = await loader.listTemplates({
      wikiPageId: 123,
      wikiPageTitle: 'Test Page'
    })
    
    expect(templates).toHaveLength(2)
    expect(templates[0].source).toBe('wiki')
  })
  
  it('should load template from wiki attachment', async () => {
    const loader = new WikiTemplateLoader()
    const template = await loader.loadTemplate('456')
    
    expect(template.version).toBe('1.0')
    expect(template.templates).toBeDefined()
  })
  
  it('should fallback to cache when offline', async () => {
    // Mock offline state
    Object.defineProperty(navigator, 'onLine', { value: false })
    
    const loader = new WikiTemplateLoader()
    const template = await loader.loadTemplate('456')
    
    expect(template).toBeDefined()
  })
})
```

### Integration Tests

```typescript
describe('Wiki Integration', () => {
  it('should load templates from real wiki', async () => {
    // Requires ChurchTools test instance
    const loader = new WikiTemplateLoader()
    const pages = await loader.searchTemplatePages('Test')
    
    expect(pages.length).toBeGreaterThan(0)
  })
})
```

## Rollout-Plan

### Phase 1: Grundfunktionalität (2-3 Tage)
- [ ] WikiTemplateLoader implementieren
- [ ] WikiTemplateList Komponente
- [ ] Integration in TemplateSelectorModal
- [ ] Basis-Caching (LocalStorage)

### Phase 2: Robustheit (1-2 Tage)
- [ ] Offline-Modus
- [ ] Fehlerbehandlung
- [ ] Validierung
- [ ] Loading-States

### Phase 3: UX-Verbesserungen (1-2 Tage)
- [ ] Auto-Sync
- [ ] Update-Benachrichtigungen
- [ ] Download-Funktion
- [ ] Suchfunktion

### Phase 4: Testing & Dokumentation (1 Tag)
- [ ] Unit Tests
- [ ] Integration Tests
- [ ] Benutzer-Dokumentation
- [ ] Admin-Anleitung

## Dokumentation für Benutzer

### Wiki-Seite einrichten

1. Neue Wiki-Seite erstellen: "Flyer-Vorlagen"
2. Template-Datei als Anhang hochladen
3. In der Anwendung: Wiki-Tab öffnen
4. Seite auswählen und Vorlage laden

### Template-Datei erstellen

1. Bestehende Vorlage als Basis verwenden
2. JSON-Datei bearbeiten
3. Validieren (z.B. mit jsonlint.com)
4. Als Anhang auf Wiki-Seite hochladen

## Offene Fragen

1. **Berechtigungen:** Wer darf Templates hochladen/bearbeiten?
2. **Versionierung:** Wie mit Breaking Changes umgehen?
3. **Namenskonvention:** Wie sollten Template-Dateien benannt werden?
4. **Kategorisierung:** Mehrere Wiki-Seiten für verschiedene Template-Typen?
5. **Approval-Prozess:** Sollen Templates vor Veröffentlichung geprüft werden?
