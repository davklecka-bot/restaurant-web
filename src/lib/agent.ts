import Anthropic from '@anthropic-ai/sdk'
import { saveRestaurant, countByCity } from './db'
import { searchWeb, scrapeUrl } from './searcher'

const CITIES = ['Praha', 'Brno', 'Ostrava', 'Plzeň', 'Liberec']
const TARGET_PER_CITY = 15

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_web',
    description: 'Prohledej DuckDuckGo. Vrátí [{title,href,body}]. Piš česky.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' }, max_results: { type: 'number' } },
      required: ['query']
    }
  },
  {
    name: 'scrape_url',
    description: 'Stáhni web restaurace a extrahuj name,email,instagram,facebook,phone.',
    input_schema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] }
  },
  {
    name: 'save_restaurant',
    description: 'Ulož restauraci do databáze. Vrátí {id,created}.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' }, city: { type: 'string' },
        category: { type: 'string', enum: ['casual', 'premium'] },
        website: { type: 'string' }, email: { type: 'string' },
        instagram: { type: 'string' }, facebook: { type: 'string' },
        phone: { type: 'string' }, notes: { type: 'string' }
      },
      required: ['name', 'city', 'category']
    }
  },
  {
    name: 'count_restaurants',
    description: 'Vrátí počet restaurací pro dané město.',
    input_schema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] }
  }
]

const SYSTEM = `Jsi agent pro market research restaurací v ČR (téma: rezervační systémy).

Pro každé město (${CITIES.join(', ')}):
1. count_restaurants → zjisti aktuální stav
2. Hledej dokud nemáš ~${TARGET_PER_CITY} restaurací
3. casual = hospody, pivnice, pizzerie, asijské, burgerárny
4. premium = fine dining, gastropodniky, wine bary
5. Pro každý web: scrape_url → save_restaurant
6. Ignoruj agregátory (TripAdvisor, Zomato, Firmy.cz)
7. Bez emailu ulož i tak (web + sociální sítě mají hodnotu)`

export type AgentEvent =
  | { type: 'search'; query: string }
  | { type: 'scrape'; url: string }
  | { type: 'save'; name: string; city: string; hasEmail: boolean; count: number }
  | { type: 'text'; text: string }
  | { type: 'done'; stats: { total: number; withEmail: number } }
  | { type: 'error'; message: string }

export async function* runResearchAgent(apiKey: string): AsyncGenerator<AgentEvent> {
  const client = new Anthropic({ apiKey })
  const messages: Anthropic.MessageParam[] = [{
    role: 'user',
    content: `Začni market research. Zpracuj tato města: ${CITIES.join(', ')}. V každém najdi ${TARGET_PER_CITY} restaurací. Ke každé scrape web pro email.`
  }]

  let savedCount = 0
  const MAX = 300

  for (let i = 0; i < MAX; i++) {
    let response: Anthropic.Message
    try {
      response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: SYSTEM,
        tools: TOOLS,
        messages
      })
    } catch (e: any) {
      yield { type: 'error', message: e.message }
      return
    }

    for (const block of response.content) {
      if (block.type === 'text' && block.text.trim()) {
        yield { type: 'text', text: block.text.slice(0, 200) }
      }
    }

    if (response.stop_reason === 'end_turn') {
      const { getStats } = await import('./db')
      const s = getStats()
      yield { type: 'done', stats: { total: s.total, withEmail: s.withEmail } }
      return
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        const input = block.input as Record<string, any>
        let result: unknown

        if (block.name === 'search_web') {
          yield { type: 'search', query: input.query }
          result = await searchWeb(input.query, input.max_results ?? 10)
          await sleep(500)
        } else if (block.name === 'scrape_url') {
          yield { type: 'scrape', url: input.url }
          result = await scrapeUrl(input.url)
          await sleep(1000)
        } else if (block.name === 'save_restaurant') {
          result = saveRestaurant(input as any)
          savedCount++
          yield { type: 'save', name: input.name, city: input.city, hasEmail: !!input.email, count: savedCount }
        } else if (block.name === 'count_restaurants') {
          result = { city: input.city, count: countByCity(input.city) }
        }

        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) })
      }

      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })
    } else {
      break
    }
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
