const GOOGLE_AI_KEY = import.meta.env.VITE_GOOGLE_AI_KEY

const AI_INPUT_MAX = 1536  // px sent to AI — more detail = better enhancement
const OUTPUT_SIZE  = 1200  // Facebook Marketplace recommended square size

// High-quality 2D context (prevents blurry upscaling/downscaling)
function hqCtx(canvas) {
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled  = true
  ctx.imageSmoothingQuality  = 'high'
  return ctx
}

// Resize maintaining aspect ratio, never upscale
function resizeCanvas(img, maxDim) {
  const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1)
  const w = Math.round(img.width  * ratio)
  const h = Math.round(img.height * ratio)
  const canvas = document.createElement('canvas')
  canvas.width  = w
  canvas.height = h
  hqCtx(canvas).drawImage(img, 0, 0, w, h)
  return canvas
}

// Center-crop to 1:1 square at target size
function centerCropToCanvas(img, size, filter = '') {
  const side = Math.min(img.width, img.height)
  const srcX = (img.width  - side) / 2
  const srcY = (img.height - side) / 2
  const canvas = document.createElement('canvas')
  canvas.width  = size
  canvas.height = size
  const ctx = hqCtx(canvas)
  if (filter) ctx.filter = filter
  ctx.drawImage(img, srcX, srcY, side, side, 0, 0, size, size)
  return canvas
}

function canvasToBase64(canvas, quality = 0.88) {
  return canvas.toDataURL('image/jpeg', quality).split(',')[1]
}

function canvasToBlob(canvas, quality = 0.95) {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas to blob failed')),
      'image/jpeg',
      quality
    )
  )
}

/**
 * Nano Banana 2 (gemini-3.1-flash-image-preview) image-to-image enhancement.
 * Returns null if key missing or call fails — caller falls back to canvas.
 */
async function enhanceWithNanaBanana(base64Data) {
  if (!GOOGLE_AI_KEY) {
    console.warn('[imageUtils] VITE_GOOGLE_AI_KEY not set — using canvas fallback')
    return null
  }

  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GOOGLE_AI_KEY,
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: 'Reframe and enhance this product photo for a Facebook Marketplace listing. Crop to a 1:1 square that best showcases the product — center the item with clean professional composition. Improve lighting, sharpness, and white balance. Keep the product 100% photorealistic: preserve its exact colors, shape, and design. No artificial backgrounds, no painterly or AI-art style, no surreal elements. The result must look like a real photo taken by a person with a good camera, not AI-generated.',
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Data,
                },
              },
            ],
          }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      }
    )

    if (!res.ok) {
      console.warn('[imageUtils] Nano Banana 2 error:', res.status, await res.text().catch(() => ''))
      return null
    }

    const data = await res.json()
    const parts = data.candidates?.[0]?.content?.parts || []
    const imgPart = parts.find((p) => p.inline_data?.mime_type?.startsWith('image/'))
    if (!imgPart) {
      console.warn('[imageUtils] Nano Banana 2: no image part in response')
      return null
    }

    return { data: imgPart.inline_data.data, mimeType: imgPart.inline_data.mime_type }
  } catch (e) {
    console.warn('[imageUtils] Nano Banana 2 exception:', e)
    return null
  }
}

function base64ToHTMLImage(base64Data, mimeType) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = `data:${mimeType};base64,${base64Data}`
  })
}

/**
 * Process a single image file:
 *  1. Resize to 1536px max for the AI call (maintains aspect ratio, high quality)
 *  2. Send to Nano Banana 2 for smart reframe + enhancement
 *  3. AI success  → center-crop AI output to 1200×1200 (high quality ctx)
 *  4. AI fallback → canvas center-crop with subtle sharpening filter at 1200×1200
 */
export async function processImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const rawUrl = URL.createObjectURL(file)

    img.onload = async () => {
      URL.revokeObjectURL(rawUrl)

      try {
        // Prepare AI input: resize to max 1536px, high-quality interpolation
        const inputCanvas = resizeCanvas(img, AI_INPUT_MAX)
        const inputBase64 = canvasToBase64(inputCanvas, 0.88)

        // Try Nano Banana 2
        const enhanced = await enhanceWithNanaBanana(inputBase64)

        let finalBlob

        if (enhanced) {
          // Decode AI output → center-crop → 1200×1200 (high quality)
          const enhancedImg = await base64ToHTMLImage(enhanced.data, enhanced.mimeType)
          const outputCanvas = centerCropToCanvas(enhancedImg, OUTPUT_SIZE)
          finalBlob = await canvasToBlob(outputCanvas, 0.95)
        } else {
          // Fallback: center-crop + contrast/saturation boost for perceived sharpness
          const outputCanvas = centerCropToCanvas(
            img,
            OUTPUT_SIZE,
            'brightness(1.04) contrast(1.12) saturate(1.12)'
          )
          finalBlob = await canvasToBlob(outputCanvas, 0.95)
        }

        resolve({
          file: new File([finalBlob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }),
          url: URL.createObjectURL(finalBlob),
          id: Math.random().toString(36).slice(2),
          enhanced: !!enhanced,
        })
      } catch (e) {
        reject(e)
      }
    }

    img.onerror = () => reject(new Error('No se pudo leer la imagen'))
    img.src = rawUrl
  })
}

export async function processImages(files) {
  return Promise.all(
    Array.from(files).filter((f) => f.type.startsWith('image/')).map(processImage)
  )
}
