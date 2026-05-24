import Anthropic from '@anthropic-ai/sdk'
import { saveRestaurant, countByCity, getAllRestaurants } from './db'
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
    description: 'Ulož restauraci do databáze. Vrátí {id,created}. Pokud created=false, restaurace již existuje — hledej jinou.',
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
    description: 'Vrátí počet nových restaurací (celkem i cíl) pro dané město.',
    input_schema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] }
  }
]

const SYSTEM = `Jsi agent pro market research restaurací v ČR (téma: rezervační systémy).

DŮLEŽITÉ: Databáze již může obsahovat restaurace z předchozích běhů. Cíl je přidat NOVÉ restaurace.

Pro každé město:
1. count_restaurants → zjisti kolik jich už je a kolik ještě chybí do cíle
2. Pokud město má >= ${TARGET_PER_CITY} restaurací, přeskoč ho (nebo hledej další nad cíl)
3. Hledej pouze restaurace KTERÉ JEŠTĚ NEJSOU v databázi (viz seznam níže)
4. casual = hospody, pivnice, pizzerie, asijské, burgerárny
5. premium = fine dining, gastropodniky, wine bary
6. Pro každý web: scrape_url → save_restaurant
7. Pokud save_restaurant vrátí {created: false}, restaurace už existuje — hledej jinou
8. Ignoruj agregátory (TripAdvisor, Zomato, Firmy.cz)
9. Bez emailu ulož i tak (web + sociální sítě mají hodnotu)`

export type AgentEvent =
  | { type: 'search'; query: string }
  | { type: 'scrape'; url: string }
  | { type: 'save'; name: string; city: string; hasEmail: boolean; count: number }
  | { type: 'text'; text: string }
  | { type: 'done'; stats: { total: number; withEmail: number } }
  | { type: 'error'; message: string }

export async function* runResearchAgent(apiKey: string): AsyncGenerator<AgentEvent> {
  const client = new Anthropic({ apiKey })

  // Load existing restaurants to tell the agent what's already saved
  const existing = await getAllRestaurants()
  const existingByCity: Record<string, string[]> = {}
  for (const r of existing) {
    if (!existingByCity[r.city]) existingByCity[r.city] = []
    existingByCity[r.city].push(r.name)
  }

  const existingSummary = existing.length === 0
    ? 'Databáze je prázdná — hledej vše od začátku.'
    : `Již uloženo ${existing.length} restaurací:\n` +
      Object.entries(existingByCity)
        .map(([city, names]) => `${city} (${names.length}): ${names.join(', ')}`)
        .join('\n')

  const citiesToProcess = CITIES.filter(city => (existingByCity[city]?.length ?? 0) < TARGET_PER_CITY)
  const taskDesc = citiesToProcess.length === 0
    ? `Všechna města mají >= ${TARGET_PER_CITY} restaurací. Přidej dalších 5 do každého města nad cíl.`
    : `Zpracuj tato města: ${citiesToProcess.join(', ')}. V každém najdi restaurace do celkového počtu ${TARGET_PER_CITY}. Ke každé scrape web pro email.`

  const messages: Anthropic.MessageParam[] = [{
    role: 'user',
    content: `${taskDesc}\n\n${existingSummary}`
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
      const s = await getStats()
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
          result = await saveRestaurant(input as any)
          const r = result as { id: number; created: boolean }
          if (r.created) {
            savedCount++
            yield { type: 'save', name: input.name, city: input.city, hasEmail: !!input.email, count: savedCount }
          }
        } else if (block.name === 'count_restaurants') {
          const count = await countByCity(input.city)
          result = { city: input.city, count, target: TARGET_PER_CITY, remaining: Math.max(0, TARGET_PER_CITY - count) }
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
