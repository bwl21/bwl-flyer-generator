# Template Loading Concept

## Übersicht

Vorlagen sollen aus externen Dateien geladen werden, mit gemeinsamen Komponenten die nur einmal definiert werden müssen.

## Aktuelle Situation

**Problem:**
- Templates sind im Code hardcodiert (`pdfme-templates.ts`)
- Gemeinsame Elemente (Header, Farben, Schriften) sind in jedem Template dupliziert
- Keine Möglichkeit, Templates ohne Code-Änderung zu aktualisieren

**Gemeinsame Elemente (identifiziert):**
- Header-Hintergrund (Farbe: `#1e40af`)
- Schriftfarben (`#ffffff`, `#374151`, `#6b7280`)
- Feldnamen (`title`, `datetime`, `location`, `speaker`, `desc`, `qr`)
- Layout-Muster (Header + Content + QR-Code)

## Vorgeschlagene Lösung

### 1. Template-Datei-Format

#### Struktur: `template-set.json`

```json
{
  "version": "1.0",
  "name": "Church Flyers Default",
  "description": "Standard-Vorlagen für Gemeinde-Flyer",
  "metadata": {
    "author": "Gemeinde XYZ",
    "created": "2025-12-27",
    "updated": "2025-12-27"
  },
  
  "shared": {
    "colors": {
      "primary": "#1e40af",
      "textDark": "#374151",
      "textLight": "#6b7280",
      "textWhite": "#ffffff"
    },
    "fonts": {
      "title": { "size": 14, "weight": "bold" },
      "subtitle": { "size": 10 },
      "body": { "size": 9 }
    },
    "components": {
      "header": {
        "type": "rectangle",
        "name": "header-bg",
        "color": "$colors.primary",
        "borderWidth": 0
      },
      "titleField": {
        "type": "text",
        "name": "title",
        "fontColor": "$colors.textWhite",
        "fontSize": "$fonts.title.size",
        "alignment": "left"
      },
      "qrCode": {
        "type": "qrcode",
        "name": "qr"
      }
    }
  },
  
  "templates": [
    {
      "id": "a5-portrait",
      "name": "A5 hoch",
      "basePdf": {
        "width": 148,
        "height": 210,
        "padding": [0, 0, 0, 0]
      },
      "layout": {
        "padding": 10,
        "headerHeight": 40,
        "qrSize": 35
      },
      "schemas": [
        [
          {
            "$ref": "#/shared/components/header",
            "position": { "x": 0, "y": 0 },
            "width": "$basePdf.width",
            "height": "$layout.headerHeight"
          },
          {
            "$ref": "#/shared/components/titleField",
            "position": { 
              "x": "$layout.padding", 
              "y": { "$calc": "$layout.headerHeight / 2 + 3" }
            },
            "width": { "$calc": "$basePdf.width - $layout.padding * 2" },
            "height": 20
          },
          {
            "type": "text",
            "name": "datetime",
            "position": { 
              "x": "$layout.padding", 
              "y": { "$calc": "$layout.headerHeight + 15" }
            },
            "width": { "$calc": "$basePdf.width - $layout.padding * 2" },
            "height": 10,
            "fontSize": "$fonts.subtitle.size",
            "fontColor": "$colors.textDark"
          },
          {
            "$ref": "#/shared/components/qrCode",
            "position": { 
              "x": { "$calc": "$basePdf.width - $layout.padding - $layout.qrSize" },
              "y": { "$calc": "$basePdf.height - $layout.padding - $layout.qrSize" }
            },
            "width": "$layout.qrSize",
            "height": "$layout.qrSize"
          }
        ]
      ]
    }
  ]
}
```

#### Vereinfachte Alternative (ohne Referenzen)

```json
{
  "version": "1.0",
  "name": "Church Flyers Default",
  
  "shared": {
    "colors": {
      "primary": "#1e40af",
      "textDark": "#374151",
      "textLight": "#6b7280",
      "textWhite": "#ffffff"
    }
  },
  
  "templates": {
    "a5-portrait": {
      "name": "A5 hoch",
      "basePdf": { "width": 148, "height": 210, "padding": [0, 0, 0, 0] },
      "schemas": [
        [
          {
            "type": "rectangle",
            "name": "header-bg",
            "position": { "x": 0, "y": 0 },
            "width": 148,
            "height": 40,
            "color": "{{colors.primary}}",
            "borderWidth": 0
          }
        ]
      ]
    }
  }
}
```

### 2. Asset-basiertes Laden (Phase 1)

#### Verzeichnisstruktur

```
public/
  templates/
    default-church-flyers.json
    christmas-special.json
    easter-special.json
    modern-minimal.json
```

#### Template-Loader Service

```typescript
// src/services/template-loader.ts

export interface TemplateSetMetadata {
  id: string
  name: string
  description?: string
  version: string
  source: 'asset' | 'wiki'
  path: string
}

export class TemplateLoader {
  // List available template sets from assets
  async listAssetTemplates(): Promise<TemplateSetMetadata[]> {
    // Scan public/templates/ folder
    // Return metadata for each .json file
  }

  // Load template set from asset
  async loadFromAsset(path: string): Promise<TemplateSet> {
    const response = await fetch(`/templates/${path}`)
    const data = await response.json()
    return this.parseTemplateSet(data)
  }

  // Parse and resolve references
  private parseTemplateSet(data: any): TemplateSet {
    // Resolve $ref references
    // Resolve {{variable}} placeholders
    // Validate structure
    return processedTemplateSet
  }
}
```

### 3. Wiki-Integration (Phase 2)

#### ChurchTools Wiki-Struktur

```
Wiki-Seite: "Flyer-Vorlagen"
  Anhänge:
    - default-church-flyers.json
    - christmas-special.json
    - easter-special.json
```

#### Wiki-Loader

```typescript
// src/services/wiki-template-loader.ts

export class WikiTemplateLoader extends TemplateLoader {
  constructor(private churchtoolsClient: ChurchToolsClient) {
    super()
  }

  // List templates from wiki page
  async listWikiTemplates(wikiPageId: string): Promise<TemplateSetMetadata[]> {
    const attachments = await this.churchtoolsClient.getWikiAttachments(wikiPageId)
    return attachments
      .filter(a => a.name.endsWith('.json'))
      .map(a => ({
        id: a.id,
        name: a.name,
        source: 'wiki',
        path: a.downloadUrl,
      }))
  }

  // Load template from wiki attachment
  async loadFromWiki(attachmentId: string): Promise<TemplateSet> {
    const data = await this.churchtoolsClient.downloadAttachment(attachmentId)
    return this.parseTemplateSet(data)
  }
}
```

### 4. UI-Komponenten

#### Template-Auswahl-Dialog

```vue
<template>
  <div class="template-selector">
    <h3>Vorlagenset auswählen</h3>
    
    <!-- Source Selection -->
    <div class="source-tabs">
      <button 
        :class="{ active: source === 'asset' }"
        @click="source = 'asset'"
      >
        Lokale Vorlagen
      </button>
      <button 
        :class="{ active: source === 'wiki' }"
        @click="source = 'wiki'"
        v-if="wikiEnabled"
      >
        Wiki-Vorlagen
      </button>
    </div>

    <!-- Template List -->
    <div class="template-list">
      <div 
        v-for="template in availableTemplates"
        :key="template.id"
        class="template-item"
        :class="{ selected: template.id === selectedId }"
        @click="selectTemplate(template)"
      >
        <div class="template-info">
          <h4>{{ template.name }}</h4>
          <p v-if="template.description">{{ template.description }}</p>
          <span class="template-version">v{{ template.version }}</span>
        </div>
        <div class="template-source">
          <span class="badge">{{ template.source }}</span>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions">
      <button @click="loadSelected" :disabled="!selectedId">
        Vorlagen laden
      </button>
      <button @click="cancel">
        Abbrechen
      </button>
    </div>
  </div>
</template>
```

#### Integration in FlyerGenerator

```vue
<template>
  <div class="flyer-generator">
    <header class="generator-header">
      <h1>ChurchTools Flyer Generator</h1>
      <div class="template-info">
        <span>Aktives Vorlagenset: {{ currentTemplateSet.name }}</span>
        <button @click="showTemplateSelector = true">
          Vorlagen wechseln
        </button>
      </div>
    </header>

    <!-- Template Selector Modal -->
    <TemplateSelectorModal
      v-if="showTemplateSelector"
      @select="loadTemplateSet"
      @close="showTemplateSelector = false"
    />

    <!-- Rest of the UI -->
  </div>
</template>
```

## Implementierungs-Phasen

### Phase 1: Asset-basiertes Laden (Sofort)

**Ziele:**
- Template-Datei-Format definieren
- Asset-Loader implementieren
- UI für Template-Auswahl
- Migration bestehender Templates

**Aufgaben:**
1. Template-Format festlegen (einfache Variante ohne $ref)
2. `TemplateLoader` Service erstellen
3. Bestehende Templates nach JSON exportieren
4. `TemplateSelectorModal` Komponente
5. Integration in `FlyerGenerator`

**Deliverables:**
- `public/templates/default-church-flyers.json`
- `src/services/template-loader.ts`
- `src/components/TemplateSelector.vue`
- Dokumentation

### Phase 2: Erweiterte Features (Später)

**Ziele:**
- Referenzen und Variablen
- Template-Validierung
- Template-Editor-Integration

**Aufgaben:**
1. `$ref` und `{{variable}}` Resolver
2. JSON-Schema Validierung
3. Template-Editor kann externe Dateien laden
4. Template-Export aus Editor

### Phase 3: Wiki-Integration (Zukünftig)

**Ziele:**
- Templates aus ChurchTools Wiki laden
- Versionierung
- Berechtigungen

**Aufgaben:**
1. `WikiTemplateLoader` implementieren
2. ChurchTools API-Integration
3. Caching-Strategie
4. Offline-Fallback

## Vorteile

### Für Benutzer
✅ Templates ohne Code-Änderung aktualisieren
✅ Mehrere Template-Sets parallel nutzen
✅ Einfacher Austausch zwischen Gemeinden
✅ Zentrale Verwaltung im Wiki

### Für Entwickler
✅ Keine Template-Logik im Code
✅ Einfachere Wartung
✅ Testbare Template-Struktur
✅ Klare Trennung: Code vs. Daten

### Für Gemeinden
✅ Eigene Vorlagen erstellen
✅ Branding anpassen (Farben, Schriften)
✅ Saisonale Vorlagen (Weihnachten, Ostern)
✅ Gemeinde-übergreifender Austausch

## Offene Fragen

1. **Template-Format:** Einfach (nur Variablen) oder komplex (mit $ref)?
2. **Validierung:** Wie streng? Fehlerbehandlung?
3. **Versionierung:** Wie mit inkompatiblen Änderungen umgehen?
4. **Caching:** Templates cachen? Wie lange?
5. **Fallback:** Was passiert, wenn keine Templates geladen werden können?

## Nächste Schritte

1. **Entscheidung:** Template-Format festlegen
2. **Prototyp:** Einfacher Asset-Loader
3. **Migration:** Ein bestehendes Template nach JSON
4. **UI:** Template-Auswahl-Dialog
5. **Testing:** Laden und Anwenden testen
