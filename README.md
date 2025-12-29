# ChurchTools Extension Boilerplate

This project provides a boilerplate for building your own extension for [ChurchTools](https://www.church.tools).

## Getting Started

### Prerequisites

-   Node.js (version compatible with the project)
-   npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
    ```bash
    npm install
    ```

### Optional: Using Dev Container

This project includes a dev container configuration. If you use VS Code with the "Dev Containers" extension, you can:

1. Clone the repository
2. Open it in VS Code
3. Click the Remote Indicator in the bottom-left corner of VS Code status bar
4. Select "Reopen in Container"

The container includes the tools mentioned in the prerequisites pre-installed and also runs `npm install` on startup.

## Configuration

Copy `.env-example` to `.env` and fill in your data.

In the `.env` file, configure the necessary constants for your project. This file is included in `.gitignore` to prevent sensitive data from being committed to version control.

## Development and Deployment

### Development Server

Start a development server with hot-reload:

```bash
npm run dev
```

> **Note:** For local development, make sure to configure CORS in your ChurchTools
> instance to allow requests from your local development server
> (typically `http://localhost:5173`).
> This can be done in the ChurchTools admin settings under:
> "System Settings" > "Integrations" > "API" > "Cross-Origin Resource Sharing"
>
> If login works in Chrome but not in Safari, the issue is usually that Safari has stricter cookie handling:
> - Safari blocks `Secure; SameSite=None` cookies on `http://localhost` (Chrome allows them in dev).
> - Safari also blocks cookies if the API is on another domain (third‑party cookies).
>
> **Fix:**
> 1. Use a Vite proxy so API calls go through your local server (`/api → https://xyz.church.tools`). This makes cookies look first‑party.
> 2. Run your dev server with **HTTPS**. You can generate a local trusted certificate with [mkcert](https://github.com/FiloSottile/mkcert).
>
> With proxy + HTTPS, Safari will accept and store cookies just like Chrome.

### Building for Production

To create a production build:

```bash
npm run build
```

### Preview Production Build

To preview the production build locally:

```bash
npm run preview
```

### Deployment

To build and package your extension for deployment:

```bash
npm run deploy
```

This command will:

1. Build the project
2. Package it using the `scripts/package.js` script

You can find the package in the `releases` directory.

## Features

### Template Administration

The extension includes a template administration interface accessible via the "Admin – Vorlagen" tab. This allows you to:

- **Edit Templates**: Use the integrated pdfme Designer to modify template layouts
- **Template Synchronization**: Keep template properties consistent across different formats
- **Import/Export**: Share template sets as ZIP files with automatic timestamping

#### Template Synchronization

The sync feature helps maintain consistency across multiple template formats (A5 portrait, A5 landscape, etc.):

1. **Select Main Template**: Choose which template serves as the source of truth
2. **View Differences**: See property differences between templates (colors, alignment, etc.)
3. **Sync Properties**: Apply properties from the main template to all other templates

The sync panel shows:
- Number of differences per template
- Detailed diff view showing which properties differ
- One-click sync to apply changes

Properties that can be synced include:
- `fontColor` - Text color
- `color` - Background/border color
- `alignment` - Text alignment
- `type` - Field type
- `borderWidth` - Border width

**Important**: When you sync templates, missing fields from the main template are automatically added to other templates. This ensures all templates have the same fields.

#### Template Persistence

All template changes are automatically saved to browser localStorage:

- **Custom Badge**: Shows when using modified templates
- **Default Badge**: Shows when using original templates
- **Reset Button**: Appears when using custom templates, allows reverting to defaults
- **Automatic Save**: Changes are saved when:
  - Editing a template in the Designer
  - Synchronizing templates
  - Uploading a template set

The Flyer Generator automatically uses your custom templates if available, falling back to defaults otherwise.

#### Appointment Mapping

Each template can have its own mapping configuration to automatically fill form fields from ChurchTools appointments:

**Configure Mapping**:
1. Go to Admin → Vorlagen
2. Click "Mapping" button for a template
3. Map appointment fields to template fields:
   - `title` → Titel
   - `datetime` → Datum + Uhrzeit (formatted)
   - `description` → Beschreibung
   - `address` → Adresse (komplett)
   - `link` → Link
   - And many more...
4. Click "Speichern"

**Use Mapping**:
1. In Flyer Generator, click "📅 Termin laden"
2. Search and select an appointment
3. Form fields are automatically filled based on mapping
4. Adjust data if needed and generate PDFs

The mapping is stored with the template in localStorage and persists across sessions.

#### Import/Export Template Sets

**Export (Download)**:
- Click "ZIP herunterladen" to export all current templates
- Filename format: `{name}-{custom/standard}-{date}.zip`
- Example: `default-church-flyers-custom-2025-12-29.zip`
- Contains: `manifest.json` + individual template JSON files

**Import (Upload)**:
- Click "ZIP hochladen" to import a template set
- Automatically saves to localStorage
- Replaces all current templates
- Supports both manifest-based and individual JSON files

**Reset**:
- "Zurücksetzen" button appears when using custom templates
- Clears localStorage and restores factory defaults

## API

Following endpoints are available. Permissions are possible per route. Types are documented in `ct-types.d.ts` (CustomModuleCreate, CustomModuleDataCategoryCreate, CustomModuleDataValueCreate)

GET `/custommodules` get all extensions  
GET `/custommodules/{extensionkey}` get an extensions by its key  
GET `/custommodules/{moduleId}` get an extension by its ID

GET `/custommodules/{moduleId}/customdatacategories`  
POST `/custommodules/{moduleId}/customdatacategories`  
PUT `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}`  
DELETE `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}`

GET `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}/customdatavalues`  
POST `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}/customdatavalues`  
PUT `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}/customdatavalues/{valueId}`  
DELETE `/custommodules/{moduleId}/customdatacategories/{dataCategoryId}/customdatavalues/{valueId}`

## Support

For questions about the ChurchTools API, visit the [Forum](https://forum.church.tools).
