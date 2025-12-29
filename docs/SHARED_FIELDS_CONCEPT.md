# Shared Fields Concept

## Problem

Aktuell sind die **Feldnamen und -typen** in allen Templates identisch, aber in jedem Template vollständig wiederholt:

```typescript
// A5 Portrait
createTextSchema('title', 10, 23, 128, 20, 14, '#ffffff', 'left')
createTextSchema('datetime', 10, 55, 128, 10, 10, '#374151')
createTextSchema('location', 10, 70, 128, 10, 10, '#374151')
// ...

// A5 Landscape
createTextSchema('title', 10, 19.5, 190, 18, 12, '#ffffff', 'left')
createTextSchema('datetime', 10, 50, 90, 10, 9, '#374151')
createTextSchema('location', 10, 65, 90, 10, 9, '#374151')
// ...
```

**Gemeinsame Eigenschaften (in ALLEN Templates):**
- Feldname: `title`, `datetime`, `location`, `speaker`, `desc`, `qr`, `header-bg`
- Feldtyp: `text`, `text`, `text`, `text`, `text`, `qrcode`, `rectangle`
- Farben: `#ffffff`, `#374151`, `#6b7280`, `#1e40af`

**Unterschiedliche Eigenschaften (pro Template):**
- Position: `x`, `y`
- Größe: `width`, `height`
- Schriftgröße: `fontSize` (manchmal)

## Lösung: Shared Field Definitions

### Konzept

Felder werden **einmal** in `shared.fieldDefinitions` definiert mit:
- `type` (text, qrcode, rectangle)
- `name` (title, datetime, etc.)
- Gemeinsame Eigenschaften (fontColor, alignment, etc.)

Templates referenzieren diese Definitionen mit `$field` und überschreiben nur:
- Position
- Größe
- Optionale Eigenschaften (fontSize)

### Beispiel

```json
{
  "shared": {
    "colors": {
      "primary": "#1e40af",
      "textDark": "#374151",
      "textWhite": "#ffffff"
    },
    
    "fieldDefinitions": {
      "title": {
        "type": "text",
        "name": "title",
        "fontColor": "{{colors.textWhite}}",
        "alignment": "left"
      },
      "datetime": {
        "type": "text",
        "name": "datetime",
        "fontColor": "{{colors.textDark}}"
      },
      "qr": {
        "type": "qrcode",
        "name": "qr"
      }
    }
  },
  
  "templates": {
    "a5-portrait": {
      "schemas": [[
        {
          "$field": "title",
          "position": { "x": 10, "y": 23 },
          "width": 128,
          "height": 20,
          "fontSize": 14
        },
        {
          "$field": "datetime",
          "position": { "x": 10, "y": 55 },
          "width": 128,
          "height": 10,
          "fontSize": 10
        },
        {
          "$field": "qr",
          "position": { "x": 103, "y": 165 },
          "width": 35,
          "height": 35
        }
      ]]
    }
  }
}
```

### Auflösung beim Laden

```typescript
// Input: Template mit $field-Referenz
{
  "$field": "title",
  "position": { "x": 10, "y": 23 },
  "width": 128,
  "height": 20,
  "fontSize": 14
}

// Schritt 1: Lade Field Definition
const fieldDef = shared.fieldDefinitions["title"]
// {
//   "type": "text",
//   "name": "title",
//   "fontColor": "{{colors.textWhite}}",
//   "alignment": "left"
// }

// Schritt 2: Merge mit Template-spezifischen Werten
const resolved = {
  ...fieldDef,           // Basis-Definition
  position: { x: 10, y: 23 },  // Template-spezifisch
  width: 128,            // Template-spezifisch
  height: 20,            // Template-spezifisch
  fontSize: 14           // Template-spezifisch (überschreibt ggf. Default)
}

// Schritt 3: Resolve Variablen
const final = {
  type: "text",
  name: "title",
  fontColor: "#ffffff",  // {{colors.textWhite}} → #ffffff
  alignment: "left",
  position: { x: 10, y: 23 },
  width: 128,
  height: 20,
  fontSize: 14
}
```

## Vorteile

### 1. DRY (Don't Repeat Yourself)

**Vorher:**
```json
// 7 Felder × 4 Templates = 28 Feld-Definitionen
{
  "a5-portrait": {
    "schemas": [[
      { "type": "text", "name": "title", "fontColor": "#ffffff", ... },
      { "type": "text", "name": "datetime", "fontColor": "#374151", ... },
      { "type": "text", "name": "location", "fontColor": "#374151", ... },
      // ... 4 weitere Felder
    ]]
  },
  "a5-landscape": {
    "schemas": [[
      { "type": "text", "name": "title", "fontColor": "#ffffff", ... },
      { "type": "text", "name": "datetime", "fontColor": "#374151", ... },
      // ... wieder alle Felder
    ]]
  }
  // ... 2 weitere Templates
}
```

**Nachher:**
```json
// 7 Feld-Definitionen + 4 × 7 Positionen = 35 Zeilen statt 280+
{
  "shared": {
    "fieldDefinitions": {
      "title": { "type": "text", "name": "title", "fontColor": "#ffffff" },
      "datetime": { "type": "text", "name": "datetime", "fontColor": "#374151" },
      // ... 5 weitere Definitionen
    }
  },
  "templates": {
    "a5-portrait": {
      "schemas": [[
        { "$field": "title", "position": {...}, "width": 128, "height": 20 },
        { "$field": "datetime", "position": {...}, "width": 128, "height": 10 },
        // ... nur Positionen
      ]]
    }
  }
}
```

### 2. Konsistenz

Wenn ein Feld geändert werden muss (z.B. Farbe von `datetime`), muss es nur **einmal** geändert werden:

```json
// Ändere Farbe für datetime in ALLEN Templates
"fieldDefinitions": {
  "datetime": {
    "fontColor": "#1e40af"  // Nur hier ändern!
  }
}
```

### 3. Neue Felder hinzufügen

Neues Feld zu allen Templates hinzufügen:

```json
// 1. Definition hinzufügen
"fieldDefinitions": {
  "subtitle": {
    "type": "text",
    "name": "subtitle",
    "fontColor": "{{colors.textDark}}"
  }
}

// 2. In jedem Template nur Position angeben
"a5-portrait": {
  "schemas": [[
    { "$field": "subtitle", "position": { "x": 10, "y": 40 }, "width": 128, "height": 10 }
  ]]
}
```

### 4. Validierung

Fehlende oder falsche Felder können leicht erkannt werden:

```typescript
// Prüfe ob alle Templates die gleichen Felder haben
const requiredFields = Object.keys(shared.fieldDefinitions)
// ["header-bg", "title", "datetime", "location", "speaker", "desc", "qr"]

for (const [templateId, template] of Object.entries(templates)) {
  const templateFields = template.schemas[0].map(s => s.$field)
  const missing = requiredFields.filter(f => !templateFields.includes(f))
  
  if (missing.length > 0) {
    console.warn(`Template ${templateId} fehlen Felder:`, missing)
  }
}
```

## Implementierung

### Template Loader mit Field Resolution

```typescript
// src/services/template-loader.ts

export class TemplateLoader {
  private resolveFieldReferences(
    templateSet: any
  ): TemplateSet {
    const { shared, templates } = templateSet
    const fieldDefs = shared.fieldDefinitions || {}
    
    // Resolve für jedes Template
    for (const [templateId, template] of Object.entries(templates)) {
      template.schemas = template.schemas.map(page => 
        page.map(field => {
          // Wenn $field vorhanden, merge mit Definition
          if (field.$field) {
            const fieldDef = fieldDefs[field.$field]
            if (!fieldDef) {
              throw new Error(
                `Field definition '${field.$field}' not found in template ${templateId}`
              )
            }
            
            // Merge: Definition + Template-spezifische Werte
            const { $field, ...templateValues } = field
            return {
              ...fieldDef,
              ...templateValues
            }
          }
          
          // Kein $field, verwende wie es ist
          return field
        })
      )
    }
    
    return templateSet
  }
  
  async loadTemplate(path: string): Promise<TemplateSet> {
    const response = await fetch(path)
    const data = await response.json()
    
    // 1. Resolve field references
    const withFields = this.resolveFieldReferences(data)
    
    // 2. Resolve variables ({{colors.primary}})
    const withVariables = this.resolveVariables(withFields)
    
    return withVariables
  }
}
```

## Vergleich: Vorher vs. Nachher

### Vorher (ohne Shared Fields)

```json
{
  "templates": {
    "a5-portrait": {
      "schemas": [[
        {
          "type": "text",
          "name": "title",
          "position": { "x": 10, "y": 23 },
          "width": 128,
          "height": 20,
          "fontSize": 14,
          "fontColor": "#ffffff",
          "alignment": "left"
        },
        {
          "type": "text",
          "name": "datetime",
          "position": { "x": 10, "y": 55 },
          "width": 128,
          "height": 10,
          "fontSize": 10,
          "fontColor": "#374151"
        }
      ]]
    },
    "a5-landscape": {
      "schemas": [[
        {
          "type": "text",
          "name": "title",
          "position": { "x": 10, "y": 19.5 },
          "width": 190,
          "height": 18,
          "fontSize": 12,
          "fontColor": "#ffffff",
          "alignment": "left"
        },
        {
          "type": "text",
          "name": "datetime",
          "position": { "x": 10, "y": 50 },
          "width": 90,
          "height": 10,
          "fontSize": 9,
          "fontColor": "#374151"
        }
      ]]
    }
  }
}
```

**Probleme:**
- ❌ `type`, `name`, `fontColor`, `alignment` in jedem Template wiederholt
- ❌ Änderung an `fontColor` muss in 4 Templates gemacht werden
- ❌ Fehleranfällig (Tippfehler, Inkonsistenzen)
- ❌ Schwer zu warten

### Nachher (mit Shared Fields)

```json
{
  "shared": {
    "colors": {
      "textWhite": "#ffffff",
      "textDark": "#374151"
    },
    "fieldDefinitions": {
      "title": {
        "type": "text",
        "name": "title",
        "fontColor": "{{colors.textWhite}}",
        "alignment": "left"
      },
      "datetime": {
        "type": "text",
        "name": "datetime",
        "fontColor": "{{colors.textDark}}"
      }
    }
  },
  "templates": {
    "a5-portrait": {
      "schemas": [[
        {
          "$field": "title",
          "position": { "x": 10, "y": 23 },
          "width": 128,
          "height": 20,
          "fontSize": 14
        },
        {
          "$field": "datetime",
          "position": { "x": 10, "y": 55 },
          "width": 128,
          "height": 10,
          "fontSize": 10
        }
      ]]
    },
    "a5-landscape": {
      "schemas": [[
        {
          "$field": "title",
          "position": { "x": 10, "y": 19.5 },
          "width": 190,
          "height": 18,
          "fontSize": 12
        },
        {
          "$field": "datetime",
          "position": { "x": 10, "y": 50 },
          "width": 90,
          "height": 10,
          "fontSize": 9
        }
      ]]
    }
  }
}
```

**Vorteile:**
- ✅ Feld-Eigenschaften nur einmal definiert
- ✅ Änderung an `fontColor` nur an einer Stelle
- ✅ Konsistent und wartbar
- ✅ Kürzer und übersichtlicher

## Statistik

### Zeilen-Reduktion

**Ohne Shared Fields:**
- 7 Felder × 4 Templates = 28 vollständige Definitionen
- Durchschnittlich 8 Zeilen pro Feld
- **Total: ~224 Zeilen**

**Mit Shared Fields:**
- 7 Feld-Definitionen = ~56 Zeilen
- 7 Felder × 4 Templates = 28 Referenzen à ~4 Zeilen = ~112 Zeilen
- **Total: ~168 Zeilen**

**Ersparnis: ~25% weniger Code**

### Wartbarkeit

**Änderung: Farbe von "datetime" ändern**

Ohne Shared Fields:
```bash
# 4 Stellen ändern (eine pro Template)
sed -i 's/"fontColor": "#374151"/"fontColor": "#1e40af"/g' template.json
# Risiko: Ändert auch andere Felder mit gleicher Farbe!
```

Mit Shared Fields:
```json
// 1 Stelle ändern
"fieldDefinitions": {
  "datetime": {
    "fontColor": "#1e40af"  // ✅ Nur hier!
  }
}
```

## Empfehlung

✅ **Verwende Shared Field Definitions** für:
- Feldname (`name`)
- Feldtyp (`type`)
- Farben (`fontColor`, `color`)
- Alignment (`alignment`)
- Andere gemeinsame Eigenschaften

❌ **Nicht in Shared Fields** (Template-spezifisch):
- Position (`position.x`, `position.y`)
- Größe (`width`, `height`)
- Schriftgröße (`fontSize`) - kann variieren

## Migration

Bestehende Templates können automatisch konvertiert werden:

```typescript
function extractSharedFields(templates: any): any {
  const fieldMap = new Map<string, any>()
  
  // Sammle alle Felder
  for (const template of Object.values(templates)) {
    for (const field of template.schemas[0]) {
      const { name, position, width, height, fontSize, ...shared } = field
      
      if (!fieldMap.has(name)) {
        fieldMap.set(name, shared)
      }
    }
  }
  
  return Object.fromEntries(fieldMap)
}
```

## Nächste Schritte

1. ✅ Konzept dokumentiert
2. [ ] `TemplateLoader.resolveFieldReferences()` implementieren
3. [ ] Bestehende Templates konvertieren
4. [ ] Tests schreiben
5. [ ] Dokumentation für Benutzer
