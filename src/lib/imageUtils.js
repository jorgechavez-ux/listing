/**
 * Center-crops an image to 1:1 and applies subtle quality enhancements.
 * Returns a new { file, url } ready to use.
 */
export async function processImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const rawUrl = URL.createObjectURL(file)

    img.onload = () => {
      // Center crop: take the largest square from the center
      const size = Math.min(img.width, img.height)
      const srcX = (img.width - size) / 2
      const srcY = (img.height - size) / 2

      // Output at 1080×1080 (standard marketplace quality)
      const OUTPUT = 1080
      const canvas = document.createElement('canvas')
      canvas.width = OUTPUT
      canvas.height = OUTPUT

      const ctx = canvas.getContext('2d')

      // Subtle enhancements: slight brightness + contrast + saturation boost
      ctx.filter = 'brightness(1.05) contrast(1.08) saturate(1.1)'
      ctx.drawImage(img, srcX, srcY, size, size, 0, 0, OUTPUT, OUTPUT)

      URL.revokeObjectURL(rawUrl)

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Error al procesar imagen'))
          const processedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
          })
          resolve({
            file: processedFile,
            url: URL.createObjectURL(blob),
            id: Math.random().toString(36).slice(2),
          })
        },
        'image/jpeg',
        0.93
      )
    }

    img.onerror = () => reject(new Error('No se pudo leer la imagen'))
    img.src = rawUrl
  })
}

export async function processImages(files) {
  return Promise.all(Array.from(files).filter((f) => f.type.startsWith('image/')).map(processImage))
}
