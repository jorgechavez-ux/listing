const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Vision call (Llama 4 Scout)
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
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          { type: 'text', text: prompt },
        ],
      }],
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

// Text-only call with web search (compound-beta-mini)
async function searchProductInfo(searchQuery) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'compound-beta-mini',
        messages: [{
          role: 'user',
          content: `Search the web for: "${searchQuery}"

Find the exact product full name (brand + model + variant), typical used/resale price in USD, and 2-3 specs a marketplace buyer would care about.
Reply with ONLY this JSON and nothing else:
{"exactName":"...","usedPrice":"$X–$Y","specs":"...","found":true}
If you can't find it, reply: {"found":false}`,
        }],
        temperature: 0.1,
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''

    // Extract JSON — compound-beta sometimes adds surrounding text
    const start = text.indexOf('{')
    const end   = text.lastIndexOf('}')
    if (start === -1 || end === -1) return null

    const parsed = JSON.parse(text.slice(start, end + 1))
    return parsed?.found ? parsed : null
  } catch {
    return null // Silently fail — visual data is used as fallback
  }
}

// Step 0 (internal): quick visual identification + search query
async function identifyProduct(imageFile) {
  try {
    return await callGroq(imageFile, `Look at this product photo.
Reply ONLY with valid JSON:
{
  "productName": "most specific name you can identify (e.g. 'Nike Air Max 95', 'iPhone 14 Pro 128GB', 'IKEA Poäng armchair'). If generic, describe it (e.g. 'wooden dining chair')",
  "searchQuery": "Google search query to identify this exact product and find its price (e.g. 'Nike Air Max 95 white sneaker resale price')",
  "shouldSearch": true if it's a specific branded or identifiable product where a web search would return useful info, false if it's too generic
}`)
  } catch {
    return null
  }
}

// Step 1: analyze the photo and decide if questions are needed
// forcedProductName: when the user manually corrected the product name, skip visual ID
export async function analyzeForQuestions(imageFile, extraDetails = '', forcedProductName = null) {
  // -- Phase A: product identification --
  let identified

  if (forcedProductName) {
    // User already told us what it is — trust them, go straight to web search
    identified = {
      productName: forcedProductName,
      searchQuery: `${forcedProductName} used resale price marketplace specs`,
      shouldSearch: true,
    }
  } else {
    identified = await identifyProduct(imageFile)
  }

  // -- Phase B: web search (only for branded/identifiable products) --
  let webContext = ''
  if (identified?.shouldSearch && identified?.searchQuery) {
    const found = await searchProductInfo(identified.searchQuery)
    if (found) {
      webContext = `\nWeb search confirmed: exact product is "${found.exactName}". Typical used market price: ${found.usedPrice}. Key specs: ${found.specs}.`
    }
  }

  // -- Phase C: full analysis with enriched context --
  const extraContext = extraDetails.trim()
    ? `\nThe seller already clarified the following: "${extraDetails.trim()}"\nDo not ask anything already answered here.`
    : ''

  const prompt = `Analyze this photo of a product someone wants to sell on Marketplace.${extraContext}${webContext}

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
- "What processor does it have?" (nobody asks this on marketplace)
- "What color is it?" (visible in the photo)
- Any spec already answered by the web search above

Reply ONLY with valid JSON:
{
  "needsQuestions": true or false,
  "productName": "${forcedProductName || identified?.productName || 'detected product name'}",
  "questions": [
    { "id": "unique_id", "label": "Short question for the user", "placeholder": "e.g. ..." }
  ]
}

Maximum 3 questions. If there is nothing genuinely useful to ask, return needsQuestions: false.`

  const result = await callGroq(imageFile, prompt)

  // If the user manually corrected the name, always trust them over the AI's vision
  if (forcedProductName) {
    result.productName = forcedProductName
  }

  // Attach web context so generateListing can use it too
  result._webContext = webContext

  return result
}

// Parse the `reasoning` field that compound-beta-mini returns with its web search results
function parseReasoningResults(reasoning, fallbackPrice) {
  const results = []
  // Each result block starts with "Title:"
  const blocks = reasoning.split(/\n(?=Title:)/)

  for (const block of blocks) {
    const title = block.match(/Title:\s*(.+)/)?.[1]?.trim()
    const url   = block.match(/URL:\s*(.+)/)?.[1]?.trim()
    const contentMatch = block.match(/Content:\s*([\s\S]+?)(?:\nScore:|$)/)
    const content = contentMatch?.[1]?.replace(/\n/g, ' ').trim() || ''

    if (!title || !url) continue

    // Try to pull a price from the content snippet; fall back to the product's own price
    const priceMatch = content.match(/\$[\d,]+\.?\d*/)
    const source = url.includes('ebay.') ? 'eBay'
      : url.includes('craigslist.') ? 'Craigslist'
      : url.includes('facebook.') ? 'Facebook Marketplace'
      : new URL(url).hostname.replace('www.', '')

    results.push({
      title: title.replace(/\s*[–-]\s*eBay$/, '').slice(0, 80),
      price: priceMatch ? priceMatch[0] : fallbackPrice,
      description: content.slice(0, 160) + (content.length > 160 ? '…' : ''),
      source,
      url,
    })

    if (results.length === 3) break
  }

  return results
}

// Search for similar listings on eBay, Craigslist, etc. using compound-beta-mini web search
export async function searchSimilarListings(productName, price) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'compound-beta-mini',
        messages: [{
          role: 'user',
          content: `Search eBay for active listings of "${productName}" around price ${price}. Find 3 results.`,
        }],
        temperature: 0.1,
      }),
    })

    if (!response.ok) return []

    const data = await response.json()
    const content   = data.choices?.[0]?.message?.content   || ''
    const reasoning = data.choices?.[0]?.message?.reasoning || ''

    // Try JSON from content first; if empty/[], fall back to parsing reasoning search results
    const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonText  = codeBlock ? codeBlock[1] : content
    const s = jsonText.indexOf('['), e = jsonText.lastIndexOf(']')
    if (s !== -1 && e !== -1) {
      const parsed = JSON.parse(jsonText.slice(s, e + 1))
      if (parsed.length > 0) return parsed
    }

    // compound-beta-mini puts the real search results in `reasoning` — parse those
    return parseReasoningResults(reasoning, price)
  } catch {
    return []
  }
}

// Step 2: generate the listing with all available info
export async function generateListing(imageFiles, extraDetails, answers = {}, productContext = '', productName = '') {
  const extraContext = extraDetails.trim()
    ? `\nAdditional details from the seller: "${extraDetails.trim()}"` : ''

  const nameContext = productName.trim()
    ? `\nThe product being sold is: "${productName.trim()}". Use this exact name — do not invent a different product.` : ''

  const answersContext = Object.entries(answers)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n')

  const specsContext = answersContext
    ? `\nProduct specifications provided by seller:\n${answersContext}` : ''

  const webCtx = productContext
    ? `\nVerified product info from web:\n${productContext}` : ''

  const prompt = `You are a Marketplace sales expert (Facebook Marketplace, OfferUp, Craigslist, etc.). Analyze the photo and create an attractive listing to sell the product.${nameContext}${extraContext}${specsContext}${webCtx}

Reply ONLY with valid JSON:
{
  "title": "short and catchy title, maximum 80 characters",
  "description": "3 to 5 sentences. Must sound like it was written by a real person, not AI. Mention specific details visible in the photo and any specs provided. Write in first person as the seller. Build trust without exaggerating.",
  "price": "suggested price in USD with $ symbol",
  "category": "most appropriate category for this product"
}

Rules: no generic AI phrases, natural and direct tone, everything in English. If web info is available, use the exact product name and be accurate with the price suggestion.`

  return callGroq(imageFiles[0], prompt)
}
