const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function generateListing(imageFiles, extraDetails = '') {
  const extraContext = extraDetails.trim()
    ? `\nEl vendedor aclaró lo siguiente: "${extraDetails.trim()}"`
    : ''

  const prompt = `Eres un experto en ventas en Marketplace (Facebook Marketplace, OLX, MercadoLibre, etc.). Analizá estas fotos y creá un listing atractivo para vender el producto.${extraContext}

Respondé ÚNICAMENTE con un JSON válido con esta estructura:
{
  "title": "título corto y atractivo, máximo 80 caracteres",
  "description": "descripción de 3 a 5 oraciones. Tiene que sonar como si la escribiera una persona real vendiendo su cosa, no como IA. Mencioná detalles concretos que ves en la foto: marca, color, estado, accesorios. Escribí en primera persona como si fueras el vendedor. Generá confianza sin exagerar.",
  "price": "precio sugerido en USD con símbolo $",
  "category": "categoría más apropiada para este producto"
}

Reglas importantes:
- Nada de frases genéricas tipo "este producto es perfecto para..." o "no te pierdas esta oportunidad"
- Mencioná detalles específicos que se ven en las fotos
- Tono natural, directo, como habla la gente
- Todo en español`

  // Groq solo soporta 1 imagen por request en vision, usamos la primera
  const primaryImage = imageFiles[0]
  const base64 = await fileToBase64(primaryImage)
  const mimeType = primaryImage.type

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Error ${response.status} al llamar a Groq`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('Groq no devolvió respuesta')

  return JSON.parse(text)
}
