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
  if (!text) throw new Error('No response from model')
  return JSON.parse(text)
}

// Step 1: analyze the photo and decide if questions are needed
export async function analyzeForQuestions(imageFile, extraDetails = '') {
  const extraContext = extraDetails.trim()
    ? `\nThe seller already clarified the following: "${extraDetails.trim()}"\nTreat this as available information — do not ask anything already answered here.`
    : ''

  const prompt = `Analyze this photo of a product someone wants to sell on Marketplace.${extraContext}

Think like a real buyer on Facebook Marketplace. What would you ask in the comments before buying this?

ONLY ask things that meet ALL THREE conditions at the same time:
1. Cannot be determined by looking at the photo
2. Was not clarified by the seller in the extra details
3. Significantly affects the price or buying decision

GOOD examples (things a real buyer would ask):
- iPhone: "Which exact model is it?" (12, 13 Pro, 14 Plus, etc.), "How much storage?" (64GB, 128GB, 256GB), "Is it unlocked or carrier-locked?"
- Laptop: "How much RAM does it have?", "What size is the drive?"
- Car: "How many miles does it have?", "What year is it?"

BAD examples (never ask these):
- "What processor does it have?" (nobody asks this on marketplace, doesn't affect the average buying decision)
- "What does the battery percentage mean?" (nonsensical question)
- "What color is it?" (visible in the photo)
- Any technical spec that only an engineer would care about, not a casual buyer

Reply ONLY with valid JSON:
{
  "needsQuestions": true or false,
  "productName": "specific name of the detected product",
  "questions": [
    { "id": "unique_id", "label": "Short question for the user", "placeholder": "e.g. ..." }
  ]
}

Maximum 3 questions. If there is nothing genuinely useful to ask, return needsQuestions: false.`

  return callGroq(imageFile, prompt)
}

// Step 2: generate the listing with all available info
export async function generateListing(imageFiles, extraDetails, answers = {}) {
  const extraContext = extraDetails.trim()
    ? `\nAdditional details from the seller: "${extraDetails.trim()}"` : ''

  const answersContext = Object.entries(answers)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n')

  const specsContext = answersContext
    ? `\nProduct specifications:\n${answersContext}` : ''

  const prompt = `You are a Marketplace sales expert (Facebook Marketplace, OfferUp, Craigslist, etc.). Analyze the photo and create an attractive listing to sell the product.${extraContext}${specsContext}

Reply ONLY with valid JSON:
{
  "title": "short and catchy title, maximum 80 characters",
  "description": "3 to 5 sentences. Must sound like it was written by a real person, not AI. Mention specific details visible in the photo and any specs provided. Write in first person as the seller. Build trust without exaggerating.",
  "price": "suggested price in USD with $ symbol",
  "category": "most appropriate category for this product"
}

Rules: no generic AI phrases, natural and direct tone, everything in English.`

  return callGroq(imageFiles[0], prompt)
}
