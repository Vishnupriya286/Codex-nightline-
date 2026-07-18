import OpenAI from 'openai'

function readApiKey(req) {
  const header = req.headers.authorization || ''
  return header.startsWith('Bearer ') ? header.slice(7) : process.env.OPENAI_API_KEY
}

function systemPrompt() {
  return 'You extract structured data for Echo, a personal/business context OS. Return only JSON with keys contexts, people, and items. Contexts are broad human labels, not every capitalized phrase. People are real human names only. Items are actionable tasks, decisions, reminders, waiting loops, useful memories, or knowledge. Keep wording concise.'
}

function userPrompt({ text, sourceType, existingContexts }) {
  return `Source type: ${sourceType || 'Import'}\nExisting contexts: ${(existingContexts || []).join(', ') || 'none'}\nReturn JSON like {"contexts":[{"name":"IEEE"}],"people":[{"name":"Gregory"}],"items":[{"summary":"Send Gregory the TechX proposal","type":"task","deadline":"2026-07-24"}]}.\n\nText:\n${String(text || '').slice(0, 6000)}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const apiKey = readApiKey(req)
  if (!apiKey) {
    res.status(401).json({ error: 'OpenAI API key is not configured.' })
    return
  }
  try {
    const client = new OpenAI({ apiKey })
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const response = await client.chat.completions.create({
      model: payload.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: userPrompt(payload) },
      ],
    })
    const content = response.choices[0]?.message?.content || '{}'
    res.status(200).json(JSON.parse(content))
  } catch (error) {
    res.status(500).json({ error: error.message || 'OpenAI extraction failed.' })
  }
}
