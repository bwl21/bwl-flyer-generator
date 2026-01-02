# Flyer Generator - Entwicklerdokumentation

## Übersicht

Der Flyer Generator ist eine Vue 3 Anwendung zur Erstellung von Kirchen-Fliegern aus ChurchTools Terminen. Die Anwendung verwendet PDFme für die PDF-Generierung und bietet eine flexible Template-Verwaltung.

## Architektur

### Kernkomponenten

Die Anwendung besteht aus drei Hauptbereichen:
- **FlyerGenerator**: Hauptkomponente zur Erstellung und Vorschau von Flyern
- **TemplateSetManager**: Verwaltung von Template-Sets
- **TemplateSetEditor**: Detaillierte Bearbeitung von Templates

### Datenfluss

1. **Termin-Daten**: Aus ChurchTools API geladen
2. **Template-Sets**: Aus LocalStorage geladen/gespeichert
3. **PDF-Generierung**: Mit PDFme und Template-Daten
4. **Speicherung**: LocalStorage für Templates und Sets

## Klassendiagramm

```mermaid
classDiagram
    %% Hauptkomponenten
    class App {
        +activeTab: Ref
        +selectedTemplateSet: Ref
        +provide()
        +switchTab()
    }

    class FlyerGenerator {
        +selectedTemplateSet: Ref
        +layoutConfigs: Ref
        +currentTemplateSetName: string
        +loadTemplateSet()
        +generatePdf()
        +loadAppointments()
    }

    class TemplateSetManager {
        +templateSets: Ref
        +selectedSet: Ref
        +selectSet()
        +editSet()
        +createNewSet()
        +deleteSet()
    }

    class TemplateSetEditor {
        +templateEntries: Ref
        +editingTemplateId: Ref
        +selectedTemplateSet: Ref
        +addLayoutToSet()
        +saveTemplatesToStorage()
        +applyDefaultSchemaToCurrentTemplate()
    }

    %% Service-Klassen
    class TemplateSetStorageService {
        +listTemplateSets()
        +loadTemplateSet()
        +saveTemplateSet()
        +deleteTemplateSet()
        +setActiveTemplateSet()
    }

    class TemplateStorageService {
        +saveTemplates()
        +loadTemplates()
        +clearTemplates()
    }

    class AppointmentService {
        +loadAppointments()
        +mapAppointmentToFlyerData()
    }

    class PdfmeTemplateService {
        +createA5PortraitTemplate()
        +createA5LandscapeTemplate()
        +createA6LongPortraitTemplate()
        +createA6LongLandscapeTemplate()
        +getTemplate()
    }

    %% Datenmodelle
    class TemplateSet {
        +name: string
        +description: string
        +templates: Record
        +createdAt: string
        +updatedAt: string
    }

    class TemplateSetEntry {
        +id: LayoutFormat
        +name: string
        +format: string
        +fields: string[]
        +template: Template
    }

    class FlyerData {
        +title: string
        +datetime: string
        +location: string
        +speaker: string
        +description: string
        +qr: string
    }

    class LayoutConfig {
        +id: LayoutFormat
        +name: string
        +format: string
    }

    %% Hilfskomponenten
    class FlyerPreviewPdfme {
        +renderPreview()
        +generate()
    }

    class AppointmentPicker {
        +appointments: Ref
        +selectedAppointment: Ref
        +loadAppointments()
        +selectAppointment()
    }

    %% Beziehungen
    App --> FlyerGenerator
    App --> TemplateSetManager
    App --> TemplateSetEditor
    
    App --> FlyerData
    App --> LayoutConfig
    App --> TemplateSet

    FlyerGenerator --> TemplateSetStorageService
    FlyerGenerator --> AppointmentService
    FlyerGenerator --> FlyerPreviewPdfme
    FlyerGenerator --> AppointmentPicker

    TemplateSetManager --> TemplateSetStorageService
    TemplateSetManager --> TemplateSet

    TemplateSetEditor --> TemplateSetStorageService
    TemplateSetEditor --> TemplateStorageService
    TemplateSetEditor --> PdfmeTemplateService
    TemplateSetEditor --> TemplateSetEntry

    FlyerPreviewPdfme --> PdfmeTemplateService

    AppointmentPicker --> AppointmentService

    FlyerGenerator --> FlyerData
    FlyerGenerator --> LayoutConfig
    FlyerGenerator --> TemplateSet

    TemplateSet --> TemplateSetEntry
    TemplateSetEntry --> Template
```

## Sequenzdiagramme

### 1. App-Initialisierung und Tab-Wechsel

```mermaid
sequenceDiagram
    participant User
    participant App
    participant TemplateSetStorageService
    participant FlyerGenerator
    participant TemplateSetManager

    User->>App: startet Anwendung
    App->>App: initializeState()
    App->>TemplateSetStorageService: getActiveTemplateSet()
    TemplateSetStorageService-->>App: activeSetName
    App->>TemplateSetStorageService: loadTemplateSet(activeSetName)
    TemplateSetStorageService-->>App: selectedTemplateSet
    App->>App: provide(selectedTemplateSet, activeTab)
    App->>FlyerGenerator: render (default)
    
    User->>App: wechselt Tab
    App->>App: switchTab(newTab)
    App->>App: activeTab = newTab
    App-->>User: zeigt entsprechende Komponente
```

### 2. Template-Set Auswahl und Laden

```mermaid
sequenceDiagram
    participant User
    participant App
    participant TemplateSetManager
    participant TemplateSetStorageService
    participant FlyerGenerator

    User->>App: wechselt zu Admin Tab
    App->>TemplateSetManager: render
    User->>TemplateSetManager: wählt Template-Set aus
    TemplateSetManager->>TemplateSetStorageService: loadTemplateSet(name)
    TemplateSetStorageService-->>TemplateSetManager: TemplateSet
    TemplateSetManager->>App: selectedTemplateSet = set
    TemplateSetManager->>App: activeTab = generator
    App->>App: switchTab(generator)
    App->>FlyerGenerator: render mit selectedTemplateSet
    FlyerGenerator->>FlyerGenerator: loadTemplateSet(set)
    FlyerGenerator-->>User: zeigt aktualisierte Vorschau
```

### 3. Neues Template hinzufügen

```mermaid
sequenceDiagram
    participant User
    participant TemplateSetEditor
    participant TemplateSetStorageService
    participant TemplateStorageService
    participant FlyerGenerator

    User->>TemplateSetEditor: klickt "Neues Layout hinzufügen"
    TemplateSetEditor->>User: zeigt Dialog an
    User->>TemplateSetEditor: gibt Name und Maße ein
    User->>TemplateSetEditor: klickt "Hinzufügen"
    TemplateSetEditor->>TemplateSetEditor: addLayoutToSet()
    TemplateSetEditor->>TemplateSetEditor: saveTemplatesToStorage()
    TemplateSetEditor->>TemplateStorageService: saveTemplates(templates)
    TemplateSetEditor->>TemplateSetStorageService: saveTemplateSet(set)
    TemplateSetEditor->>FlyerGenerator: selectedTemplateSet = updated
    FlyerGenerator->>FlyerGenerator: loadTemplateSet(updated)
    TemplateSetEditor-->>User: zeigt Erfolgsmeldung
```

### 4. Default Schema anwenden

```mermaid
sequenceDiagram
    participant User
    participant TemplateSetEditor
    participant PdfmeTemplateService
    participant TemplateSetStorageService
    participant FlyerGenerator

    User->>TemplateSetEditor: öffnet Template-Editor
    User->>TemplateSetEditor: klickt "Default Schema"
    TemplateSetEditor->>PdfmeTemplateService: createA5PortraitTemplate()
    PdfmeTemplateService-->>TemplateSetEditor: defaultTemplate
    TemplateSetEditor->>TemplateSetEditor: filterSchema(remove images)
    TemplateSetEditor->>TemplateSetEditor: applyDefaultSchemaToCurrentTemplate()
    TemplateSetEditor->>TemplateSetEditor: saveTemplatesToStorage()
    TemplateSetEditor->>TemplateSetStorageService: saveTemplateSet(updated)
    TemplateSetEditor->>FlyerGenerator: selectedTemplateSet = updated
    TemplateSetEditor->>TemplateSetEditor: updateDesigner()
    TemplateSetEditor-->>User: zeigt Erfolgsmeldung
```

### 5. PDF-Generierung

```mermaid
sequenceDiagram
    participant User
    participant FlyerGenerator
    participant AppointmentService
    participant FlyerPreviewPdfme
    participant PdfmeGenerator

    User->>FlyerGenerator: wählt Termin aus
    FlyerGenerator->>AppointmentService: mapAppointmentToFlyerData()
    AppointmentService-->>FlyerGenerator: FlyerData
    FlyerGenerator->>FlyerPreviewPdfme: data + config
    FlyerPreviewPdfme->>FlyerPreviewPdfme: getTemplate()
    FlyerPreviewPdfme->>FlyerPreviewPdfme: deepClone(template)
    FlyerPreviewPdfme->>PdfmeGenerator: generate(template, data)
    PdfmeGenerator-->>FlyerPreviewPdfme: PDF
    FlyerPreviewPdfme-->>User: zeigt PDF an
```

## Datenmodelle

### TemplateSet
- **name**: Eindeutiger Name des Template-Sets
- **description**: Beschreibung des Sets
- **templates**: Record mit Layout-Format als Key und Template als Value
- **createdAt**: Erstellungszeitpunkt
- **updatedAt**: Letzte Aktualisierung

### TemplateSetEntry
- **id**: Layout-Format (z.B. 'a5-portrait')
- **name**: Anzeigename des Layouts
- **format**: Format-String (z.B. '148×210mm')
- **fields**: Liste der Feldnamen aus dem Schema
- **template**: PDFme Template mit basePdf und schemas

### FlyerData
- **title**: Veranstaltungstitel
- **datetime**: Datum und Uhrzeit
- **location**: Veranstaltungsort
- **speaker**: Referent/Sprecher
- **description**: Beschreibungstext
- **qr**: QR-Code URL

## Storage-Architektur

### LocalStorage Struktur
```
localStorage/
├── template-sets/           # Template-Sets
│   ├── set-name-1.json
│   ├── set-name-2.json
│   └── active-set.json      # Aktives Set
├── templates/               # Einzelne Templates
│   └── templates.json
└── appointments/            # Termin-Cache
    └── cached-appointments.json
```

### Speicherstrategien
1. **TemplateSetStorage**: Verwaltet komplette Template-Sets
2. **TemplateStorage**: Verwaltet einzelne Templates (Legacy)
3. **AppointmentCache**: Zwischenspeicher für ChurchTools Daten

## State Management

### Reaktive Zustände
- **selectedTemplateSet**: Global injizierter Ref für aktives Set
- **activeTab**: Global injizierter Ref für aktiven Tab
- **templateEntries**: Lokale Templates im Editor
- **layoutConfigs**: Dynamische Layout-Konfigurationen

### Datenfluss-Prinzipien
1. **Top-Down**: Props von Parent zu Child
2. **Global State**: Injizierte Refs für übergreifenden Zustand
3. **Local State**: Komponentenspezifische Refs
4. **Persistence**: Automatische Speicherung bei Änderungen

## Fehlerbehandlung

### Strategien
1. **Validation**: Eingabevalidierung vor Speicherung
2. **Fallback**: Default-Templates bei Fehlern
3. **User Feedback**: Statusmeldungen für alle Aktionen
4. **Error Logging**: Konsolen-Logs für Debugging

### Fehler-Typen
- **Network Errors**: ChurchTools API Probleme
- **Storage Errors**: LocalStorage voll/fehlerhaft
- **Template Errors**: Ungültige Template-Struktur
- **PDF Generation Errors**: PDFme Probleme

## Performance-Optimierungen

### Strategien
1. **Lazy Loading**: Templates bei Bedarf laden
2. **Caching**: ChurchTools Daten zwischenspeichern
3. **Debouncing**: UI-Updates optimieren
4. **Memory Management**: Vue Proxy-Objekte vermeiden

### Best Practices
- Deep Cloning für PDFme Templates
- Reactive State minimal halten
- Async Operationen optimieren
- Component Lifecycle beachten

## Entwicklungshinweise

### Vue 3 Besonderheiten
- **Composition API**: Konsistente Verwendung von `<script setup>`
- **Reactivity**: Refs und Reactive richtig einsetzen
- **Lifecycle**: onMounted und watch korrekt verwenden
- **TypeScript**: Strikte Typisierung beachten

### PDFme Integration
- **Template Struktur**: basePdf + schemas beachten
- **Feld-Validierung**: Required fields prüfen
- **Image-Felder**: Leere Images filtern
- **Proxy-Probleme**: Deep Cloning verwenden

### Debugging
- **Console Logs**: Ausführliche Debug-Informationen
- **State Inspection**: Vue DevTools nutzen
- **Network Tab**: API-Aufrufe überwachen
- **Storage Inspection**: LocalStorage prüfen
