const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function callGroq(imageFile, prompt) {
  const base64 = await fileToBase64(imageFile)
  const mimeType = imageFile.type

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
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            { type: 'text', text: prompt },
          ],
        },
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Error ${response.status}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('Sin respuesta del modelo')
  return JSON.parse(text)
}

// Paso 1: analizar la foto y decidir si hacen falta preguntas
export async function analyzeForQuestions(imageFile) {
  const prompt = `Analizá esta foto de un producto que alguien quiere vender en Marketplace.

REGLA PRINCIPAL: Solo preguntá cosas que son IMPOSIBLES de ver en la foto. Si algo se puede leer, inferir o deducir mirando la imagen, NO lo preguntes.

Tu tarea:
1. Mirá la foto con atención. Fijate qué información ya está visible: marca, modelo, color, estado, accesorios incluidos, pantalla, teclado, puertos, stickers, etc.
2. Determiná qué especificaciones críticas para el precio o descripción NO se pueden ver de ninguna manera (datos internos como RAM, almacenamiento, procesador, año de compra, etc.).
3. Solo generá preguntas para esas cosas invisibles.

Ejemplos de lo que NO debés preguntar:
- El color (se ve en la foto)
- La marca o modelo si está visible en la foto
- Si tiene cargador si se ve en la foto
- El estado si se puede ver claramente
- Nada que esté escrito o impreso en el producto y sea legible

Respondé ÚNICAMENTE con JSON válido:
{
  "needsQuestions": true o false,
  "productName": "nombre específico del producto detectado",
  "questions": [
    { "id": "identificador_unico", "label": "Pregunta corta para el usuario", "placeholder": "Ej: ..." }
  ]
}

Máximo 4 preguntas. Solo las que realmente importan para describir y poner precio.
Si needsQuestions es false, devolvé questions como array vacío.`

  return callGroq(imageFile, prompt)
}

// Paso 2: generar el listing con toda la info disponible
export async function generateListing(imageFiles, extraDetails, answers = {}) {
  const extraContext = extraDetails.trim()
    ? `\nDetalles adicionales del vendedor: "${extraDetails.trim()}"` : ''

  const answersContext = Object.entries(answers)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n')

  const specsContext = answersContext
    ? `\nEspecificaciones del producto:\n${answersContext}` : ''

  const prompt = `Eres un experto en ventas en Marketplace (Facebook Marketplace, OLX, MercadoLibre, etc.). Analizá la foto y creá un listing atractivo para vender el producto.${extraContext}${specsContext}

Respondé ÚNICAMENTE con un JSON válido:
{
  "title": "título corto y atractivo, máximo 80 caracteres",
  "description": "descripción de 3 a 5 oraciones. Tiene que sonar como si la escribiera una persona real, no como IA. Mencioná detalles concretos visibles en la foto y las especificaciones dadas. Escribí en primera persona como el vendedor. Generá confianza sin exagerar.",
  "price": "precio sugerido en USD con símbolo $",
  "category": "categoría más apropiada"
}

Reglas: sin frases genéricas de IA, tono natural y directo, todo en español.`

  return callGroq(imageFiles[0], prompt)
}
