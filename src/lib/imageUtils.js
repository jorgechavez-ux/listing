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
    console.log('[NanaBanana2] Sending image to Google AI...')
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
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
                text: `You are a professional product photographer editor. Transform this product photo into a perfect marketplace listing image:

1. REFRAME: If the product is too close or cropped, zoom out so the ENTIRE product is fully visible with breathing room on all sides. Never cut off any part of the product.
2. COMPOSITION: Center the product in a clean 1:1 square. Add padding/margin around it — the product should occupy 65–80% of the frame, not edge to edge.
3. BACKGROUND: Clean, neutral, slightly bright background (white, light gray, or the original background improved). Remove clutter if possible.
4. QUALITY: Sharpen, improve lighting, boost contrast slightly, correct white balance. Make it look like a professional product photo.
5. STYLE: 100% photorealistic. No illustrations, no AI-art, no painterly effects. Must look like a real camera photo, just better lit and framed.

Output a single clean square product photo ready for Facebook Marketplace.`,
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
      const errText = await res.text().catch(() => '')
      console.warn('[NanaBanana2] API error:', res.status, errText)
      return null
    }

    const data = await res.json()
    const parts = data.candidates?.[0]?.content?.parts || []
    const imgPart = parts.find((p) => p.inlineData?.mimeType?.startsWith('image/') || p.inline_data?.mime_type?.startsWith('image/'))
    if (!imgPart) {
      console.warn('[NanaBanana2] No image in response. Parts received:', JSON.stringify(parts).slice(0, 300))
      return null
    }

    const imgData   = imgPart.inlineData   ?? imgPart.inline_data
    const mimeType  = imgData.mimeType     ?? imgData.mime_type
    console.log('[NanaBanana2] ✓ Enhancement successful')
    return { data: imgData.data, mimeType }
  } catch (e) {
    console.warn('[NanaBanana2] Exception:', e)
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
 * Process a single image file (canvas only, no AI enhancement).
 * Fast — used during upload so the original image reaches the AI analysis intact.
 * Nano Banana enhancement happens separately after listing generation.
 */
export async function processImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const rawUrl = URL.createObjectURL(file)

    img.onload = async () => {
      URL.revokeObjectURL(rawUrl)

      try {
        const outputCanvas = centerCropToCanvas(
          img,
          OUTPUT_SIZE,
          'brightness(1.04) contrast(1.12) saturate(1.12)'
        )
        const finalBlob = await canvasToBlob(outputCanvas, 0.95)

        resolve({
          file: new File([finalBlob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }),
          url: URL.createObjectURL(finalBlob),
          id: Math.random().toString(36).slice(2),
          enhanced: false,
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

/**
 * Enhance already-processed images with Nano Banana 2.
 * Called after listing generation so it doesn't affect product identification.
 * Silently skips images that fail — returns original as fallback.
 */
export async function enhanceImages(imgObjs) {
  return Promise.all(imgObjs.map(async (imgObj) => {
    const blob = await fetch(imgObj.url).then((r) => r.blob())
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

    const enhanced = await enhanceWithNanaBanana(base64)
    if (!enhanced) return imgObj

    const enhancedImg   = await base64ToHTMLImage(enhanced.data, enhanced.mimeType)
    const outputCanvas  = centerCropToCanvas(enhancedImg, OUTPUT_SIZE)
    const finalBlob     = await canvasToBlob(outputCanvas, 0.95)

    return {
      ...imgObj,
      file: new File([finalBlob], imgObj.file?.name || 'enhanced.jpg', { type: 'image/jpeg' }),
      url:  URL.createObjectURL(finalBlob),
      enhanced: true,
    }
  }))
}
