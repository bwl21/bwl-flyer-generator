<template>
  <div class="preview-container">
    <h4 class="preview-title">{{ config.name }}</h4>
    <div class="preview-wrapper">
      <canvas ref="canvasRef" class="preview-canvas"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { generate } from '@pdfme/generator'
import { text, barcodes, rectangle, image } from '@pdfme/schemas'
import type { FlyerData, LayoutConfig } from '../../types/flyer'
import { getTemplate, flyerDataToInput } from '../../services/pdfme-templates'

const props = defineProps<{
  data: FlyerData | Record<string, string>
  config: LayoutConfig
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

const plugins = {
  Text: text,
  QRCode: barcodes.qrcode,
  Rectangle: rectangle,
  Image: image,
}

const renderPreview = async () => {
  if (!canvasRef.value) return

  try {
    const template = getTemplate(props.config.id)
    if (!template) {
      console.error('Template not found:', props.config.id)
      return
    }
    
    const inputs = [flyerDataToInput(props.data)]
    if (!inputs[0]) {
      console.error('Failed to convert flyer data to input')
      return
    }

    // Generate PDF
    const pdf = await generate({
      template,
      inputs,
      plugins,
    })

    // Load PDF and render first page to canvas
    const pdfjsLib = (window as any).pdfjsLib
    if (!pdfjsLib) {
      console.error('PDF.js not loaded')
      return
    }

    const loadingTask = pdfjsLib.getDocument({ data: pdf })
    const pdfDoc = await loadingTask.promise
    const page = await pdfDoc.getPage(1)

    const canvas = canvasRef.value
    const context = canvas.getContext('2d')
    if (!context) return

    // Calculate scale to fit width
    const viewport = page.getViewport({ scale: 1 })
    const scale = 280 / viewport.width
    const scaledViewport = page.getViewport({ scale })

    canvas.width = scaledViewport.width
    canvas.height = scaledViewport.height

    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
    }).promise
  } catch (error) {
    console.error('Failed to render preview:', error)
  }
}

// Initialize on mount
onMounted(() => {
  renderPreview()
})

// Update when data changes (triggered by "Vorschau aktualisieren" button)
watch(
  () => props.data,
  () => {
    renderPreview()
  },
  { deep: true }
)
</script>

<style scoped>
.preview-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 300px;
  flex-shrink: 0;
}

.preview-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  text-align: center;
}

.preview-wrapper {
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  overflow: hidden;
  background: #f9fafb;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.5rem;
}

.preview-canvas {
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  display: block;
  max-width: 100%;
  height: auto;
}
</style>
