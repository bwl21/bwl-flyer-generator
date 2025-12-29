# Template-Set Persistierung: JSON vs. ZIP

## Optionen

### Option 1: Ein JSON-File

```
default-church-flyers.json
```

**Struktur:**
```json
{
  "version": "1.0",
  "name": "Church Flyers Default",
  "mainTemplate": "a5-portrait",
  "templates": {
    "a5-portrait": {
      "name": "A5 hoch",
      "basePdf": { "width": 148, "height": 210, "padding": [0, 0, 0, 0] },
      "schemas": [[ /* alle Felder */ ]]
    },
    "a5-landscape": { /* ... */ },
    "a6-long-portrait": { /* ... */ },
    "a6-long-landscape": { /* ... */ }
  }
}
```

### Option 2: ZIP mit mehreren Files

```
default-church-flyers.zip
  ├── manifest.json
  ├── a5-portrait.json
  ├── a5-landscape.json
  ├── a6-long-portrait.json
  └── a6-long-landscape.json
```

**manifest.json:**
```json
{
  "version": "1.0",
  "name": "Church Flyers Default",
  "mainTemplate": "a5-portrait",
  "templates": [
    { "id": "a5-portrait", "name": "A5 hoch", "file": "a5-portrait.json" },
    { "id": "a5-landscape", "name": "A5 quer", "file": "a5-landscape.json" },
    { "id": "a6-long-portrait", "name": "A6 lang hoch", "file": "a6-long-portrait.json" },
    { "id": "a6-long-landscape", "name": "A6 lang quer", "file": "a6-long-landscape.json" }
  ]
}
```

**a5-portrait.json:**
```json
{
  "name": "A5 hoch",
  "basePdf": { "width": 148, "height": 210, "padding": [0, 0, 0, 0] },
  "schemas": [[ /* alle Felder */ ]]
}
```

## Vergleich

| Kriterium | Ein JSON | ZIP mit mehreren Files |
|-----------|----------|------------------------|
| **Einfachheit** | ✅ Sehr einfach | ⚠️ Komplexer |
| **Lesbarkeit** | ⚠️ Groß, unübersichtlich | ✅ Kleine, fokussierte Files |
| **Editierbarkeit** | ⚠️ Schwer zu editieren | ✅ Einzelne Templates editierbar |
| **Versionierung (Git)** | ❌ Große Diffs | ✅ Kleine, gezielte Diffs |
| **Laden** | ✅ Ein Request | ⚠️ Mehrere Requests oder ZIP-Parsing |
| **Speichern** | ✅ Ein File | ⚠️ ZIP erstellen |
| **Wiki-Upload** | ✅ Einfach | ✅ Einfach (ein ZIP) |
| **Größe** | ⚠️ ~50-100 KB | ✅ ~30-60 KB (komprimiert) |
| **Erweiterbarkeit** | ⚠️ Schwer (alles in einem File) | ✅ Einfach (neue Files hinzufügen) |

## Detaillierte Analyse

### Ein JSON-File

**Vorteile:**
- ✅ **Einfach zu laden**: Ein `fetch()` Request
- ✅ **Einfach zu speichern**: `JSON.stringify()` und fertig
- ✅ **Keine Dependencies**: Kein ZIP-Parser nötig
- ✅ **Atomic**: Entweder alles oder nichts
- ✅ **Einfach zu validieren**: Ein JSON-Schema

**Nachteile:**
- ❌ **Große Datei**: 4 Templates × ~200 Zeilen = ~800 Zeilen
- ❌ **Schwer zu editieren**: Muss durch ganzes File scrollen
- ❌ **Git-Diffs**: Änderung an einem Template = ganzes File geändert
- ❌ **Nicht modular**: Kann nicht einzelne Templates austauschen
- ❌ **Merge-Konflikte**: Wenn mehrere Personen gleichzeitig editieren

**Beispiel-Größe:**
```
default-church-flyers.json: ~80 KB (uncompressed)
```

### ZIP mit mehreren Files

**Vorteile:**
- ✅ **Modular**: Einzelne Templates editierbar
- ✅ **Übersichtlich**: Kleine, fokussierte Files
- ✅ **Git-freundlich**: Nur geänderte Templates in Diff
- ✅ **Erweiterbar**: Neue Templates einfach hinzufügen
- ✅ **Komprimiert**: Kleinere Dateigröße
- ✅ **Professionell**: Wie andere Template-Systeme (z.B. Office-Formate)

**Nachteile:**
- ❌ **Komplexer**: ZIP-Parsing nötig (JSZip)
- ❌ **Mehr Code**: Laden/Speichern aufwändiger
- ❌ **Mehrere Requests**: Wenn nicht als ZIP (aber wir nutzen ZIP)
- ❌ **Fehleranfällig**: Fehlende Files, falsche Struktur

**Beispiel-Größe:**
```
default-church-flyers.zip: ~35 KB (compressed)
  ├── manifest.json: ~1 KB
  ├── a5-portrait.json: ~20 KB
  ├── a5-landscape.json: ~18 KB
  ├── a6-long-portrait.json: ~15 KB
  └── a6-long-landscape.json: ~16 KB
```

## Empfehlung

### Phase 1: Ein JSON-File ⭐

**Für den Start empfehle ich: Ein JSON-File**

**Gründe:**
1. **Einfachheit**: Schnell implementiert, weniger Code
2. **Weniger Fehlerquellen**: Keine ZIP-Parsing-Probleme
3. **Ausreichend**: 4 Templates = ~80 KB ist akzeptabel
4. **Später erweiterbar**: Kann später zu ZIP migrieren

**Implementierung:**
```typescript
// Laden
const response = await fetch('/templates/default-church-flyers.json')
const templateSet = await response.json()

// Speichern
const json = JSON.stringify(templateSet, null, 2)
const blob = new Blob([json], { type: 'application/json' })
// Download oder Upload
```

### Phase 2: ZIP (Optional, später)

**Wenn später nötig:**
- Viele Templates (>10)
- Große Templates (mit Bildern)
- Git-Versionierung wichtig
- Mehrere Personen editieren gleichzeitig

**Migration:**
```typescript
// Konvertiere JSON → ZIP
function jsonToZip(templateSet: TemplateSet): Blob {
  const zip = new JSZip()
  
  // Manifest
  const manifest = {
    version: templateSet.version,
    name: templateSet.name,
    mainTemplate: templateSet.mainTemplate,
    templates: Object.keys(templateSet.templates).map(id => ({
      id,
      name: templateSet.templates[id].name,
      file: `${id}.json`
    }))
  }
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))
  
  // Einzelne Templates
  for (const [id, template] of Object.entries(templateSet.templates)) {
    zip.file(`${id}.json`, JSON.stringify(template, null, 2))
  }
  
  return zip.generateAsync({ type: 'blob' })
}
```

## Hybrid-Ansatz (Beste Lösung)

**Unterstütze beide Formate!**

```typescript
// src/services/template-loader.ts

export class TemplateLoader {
  async load(path: string): Promise<TemplateSet> {
    if (path.endsWith('.json')) {
      return this.loadFromJson(path)
    } else if (path.endsWith('.zip')) {
      return this.loadFromZip(path)
    } else {
      throw new Error('Unsupported format')
    }
  }
  
  private async loadFromJson(path: string): Promise<TemplateSet> {
    const response = await fetch(path)
    return response.json()
  }
  
  private async loadFromZip(path: string): Promise<TemplateSet> {
    const response = await fetch(path)
    const blob = await response.blob()
    const zip = await JSZip.loadAsync(blob)
    
    // Lade manifest
    const manifestFile = zip.file('manifest.json')
    if (!manifestFile) {
      throw new Error('manifest.json not found in ZIP')
    }
    const manifest = JSON.parse(await manifestFile.async('string'))
    
    // Lade Templates
    const templates: Record<string, Template> = {}
    for (const templateInfo of manifest.templates) {
      const file = zip.file(templateInfo.file)
      if (!file) {
        console.warn(`Template file ${templateInfo.file} not found`)
        continue
      }
      templates[templateInfo.id] = JSON.parse(await file.async('string'))
    }
    
    return {
      version: manifest.version,
      name: manifest.name,
      mainTemplate: manifest.mainTemplate,
      templates
    }
  }
  
  async save(templateSet: TemplateSet, format: 'json' | 'zip'): Promise<Blob> {
    if (format === 'json') {
      return this.saveAsJson(templateSet)
    } else {
      return this.saveAsZip(templateSet)
    }
  }
  
  private saveAsJson(templateSet: TemplateSet): Blob {
    const json = JSON.stringify(templateSet, null, 2)
    return new Blob([json], { type: 'application/json' })
  }
  
  private async saveAsZip(templateSet: TemplateSet): Promise<Blob> {
    const zip = new JSZip()
    
    // Manifest
    const manifest = {
      version: templateSet.version,
      name: templateSet.name,
      mainTemplate: templateSet.mainTemplate,
      templates: Object.keys(templateSet.templates).map(id => ({
        id,
        name: templateSet.templates[id].name,
        file: `${id}.json`
      }))
    }
    zip.file('manifest.json', JSON.stringify(manifest, null, 2))
    
    // Templates
    for (const [id, template] of Object.entries(templateSet.templates)) {
      zip.file(`${id}.json`, JSON.stringify(template, null, 2))
    }
    
    return zip.generateAsync({ type: 'blob' })
  }
}
```

## Verzeichnisstruktur

### Variante A: Nur JSON

```
public/
  templates/
    default-church-flyers.json
    christmas-special.json
    modern-minimal.json
```

### Variante B: Nur ZIP

```
public/
  templates/
    default-church-flyers.zip
    christmas-special.zip
    modern-minimal.zip
```

### Variante C: Hybrid (Empfohlen)

```
public/
  templates/
    default-church-flyers.json    # Einfach, für Start
    christmas-special.zip          # Komplex, mit Bildern
    modern-minimal.json            # Einfach
```

## UI: Format-Auswahl beim Export

```vue
<template>
  <div class="export-dialog">
    <h3>Template-Set exportieren</h3>
    
    <div class="format-selection">
      <label>
        <input type="radio" v-model="exportFormat" value="json">
        <div class="format-option">
          <strong>JSON-Datei</strong>
          <p>Einfach, direkt editierbar</p>
          <span class="size">~80 KB</span>
        </div>
      </label>
      
      <label>
        <input type="radio" v-model="exportFormat" value="zip">
        <div class="format-option">
          <strong>ZIP-Archiv</strong>
          <p>Modular, Git-freundlich</p>
          <span class="size">~35 KB</span>
        </div>
      </label>
    </div>
    
    <button @click="exportTemplateSet">
      Exportieren
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { TemplateLoader } from '../services/template-loader'

const loader = new TemplateLoader()
const exportFormat = ref<'json' | 'zip'>('json')

async function exportTemplateSet() {
  const blob = await loader.save(currentTemplateSet.value, exportFormat.value)
  
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${currentTemplateSet.value.name}.${exportFormat.value}`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
```

## Dateigröße-Vergleich (Beispiel)

### Einfaches Template-Set (4 Templates, keine Bilder)

```
JSON:  80 KB
ZIP:   35 KB (56% kleiner)
```

### Komplexes Template-Set (10 Templates, mit Bildern)

```
JSON:  2.5 MB
ZIP:   450 KB (82% kleiner)
```

### Mit Base64-Bildern im basePdf

```
JSON:  5 MB
ZIP:   1.2 MB (76% kleiner)
```

## Finale Entscheidung: Ein JSON-File ✅

### Begründung

**Projektspezifische Anforderungen:**
- ✅ **4 Templates pro Set** → JSON ist überschaubar (~80 KB)
- ✅ **Git-Versionierung wichtig** → JSON-Diffs sind lesbar, ZIP nicht
- ✅ **Keine parallele Bearbeitung** → Merge-Konflikte kein Problem
- ✅ **Bilder vom Main-Template syncen** → Kein Grund für separate Files

**Format:**
```
public/templates/default-church-flyers.json
```

**Code:**
```typescript
// Laden
const templateSet = await fetch('/templates/default.json').then(r => r.json())

// Speichern
const json = JSON.stringify(templateSet, null, 2)
const blob = new Blob([json], { type: 'application/json' })
```

### ZIP-Variante: Nicht benötigt ❌

**Gründe gegen ZIP:**
- Nicht Git-freundlich (binär)
- Zusätzliche Komplexität (JSZip dependency)
- Nicht nötig bei 4 Templates
- Bilder können vom Main-Template synchronisiert werden

## Migration JSON → ZIP

Wenn später nötig:

```typescript
// 1. Lade JSON
const json = await fetch('/templates/old.json').then(r => r.json())

// 2. Konvertiere zu ZIP
const zip = await templateLoader.saveAsZip(json)

// 3. Download
const url = URL.createObjectURL(zip)
const a = document.createElement('a')
a.href = url
a.download = 'new.zip'
a.click()
```

## Zusammenfassung

| Phase | Format | Grund |
|-------|--------|-------|
| **Phase 1 (Start)** | JSON | Einfach, schnell, ausreichend |
| **Phase 2 (Optional)** | JSON + ZIP | Flexibilität, Größe |
| **Phase 3 (Zukunft)** | Hauptsächlich ZIP | Modularität, Git, Bilder |

**Empfehlung: Start mit JSON, später Hybrid-Support hinzufügen** ✅
