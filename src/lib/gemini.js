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
export async function analyzeForQuestions(imageFile, extraDetails = '') {
  const extraContext = extraDetails.trim()
    ? `\nEl vendedor ya aclaró lo siguiente: "${extraDetails.trim()}"\nConsiderá esta información como disponible — no preguntes nada que ya esté respondido acá.`
    : ''

  const prompt = `Analizá esta foto de un producto que alguien quiere vender en Marketplace.${extraContext}

Pensá como un comprador real en Facebook Marketplace o OLX. ¿Qué preguntarías en los comentarios antes de comprar esto?

SOLO preguntá cosas que cumplan LAS TRES condiciones al mismo tiempo:
1. No se puede saber mirando la foto
2. No fue aclarado por el vendedor en la información adicional
3. Cambia significativamente el precio o la decisión de compra

Ejemplos BUENOS (cosas que un comprador real preguntaría):
- iPhone: "¿Cuál modelo exacto es?" (12, 13 Pro, 14 Plus, etc.), "¿Cuánto almacenamiento tiene?" (64GB, 128GB, 256GB), "¿Está liberado o con operadora?"
- Laptop: "¿Cuánta RAM tiene?", "¿Qué tamaño de disco?"
- Auto: "¿Cuántos kilómetros tiene?", "¿De qué año es?"

Ejemplos MALOS (no preguntes esto nunca):
- "¿Qué procesador tiene?" (nadie lo pregunta en marketplace, no afecta la decisión de compra promedio)
- "¿Qué significa el porcentaje de batería?" (es una pregunta sin sentido)
- "¿De qué color es?" (se ve en la foto)
- Cualquier spec técnica que solo le importaría a un ingeniero, no a un comprador casual

Respondé ÚNICAMENTE con JSON válido:
{
  "needsQuestions": true o false,
  "productName": "nombre específico del producto detectado",
  "questions": [
    { "id": "identificador_unico", "label": "Pregunta corta para el usuario", "placeholder": "Ej: ..." }
  ]
}

Máximo 3 preguntas. Si no hay nada genuinamente útil que preguntar, devolvé needsQuestions: false.`

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
