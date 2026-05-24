import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAllRestaurants } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  const { apiKey } = await req.json()
  if (!apiKey) return NextResponse.json({ error: 'Missing apiKey' }, { status: 400 })

  const contacts = getAllRestaurants()
  const responses = contacts.filter(c => c.response_text)

  if (responses.length === 0) {
    return NextResponse.json({ insights: 'Zatím žádné odpovědi od restaurací. Pošli outreach emaily a počkej na odpovědi.' })
  }

  const client = new Anthropic({ apiKey })
  const responsesText = responses.map(r =>
    `Restaurace: ${r.name} (${r.city}, ${r.category})\nOdpověď: ${r.response_text}`
  ).join('\n\n---\n\n')

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Analyzuj tyto odpovědi od restaurací na otázky o rezervačních systémech.

Otázky:
1. Jak dnes rezervace řešíte?
2. Co vám na současném řešení nejvíc vadí?
3. Zkoušeli jste online rezervační systémy?

Odpovědi:
${responsesText}

Vytvoř strukturované shrnutí v češtině:
## Způsoby řešení rezervací
## Hlavní pain pointy
## Zmíněné systémy
## Casual vs. Premium rozdíly
## Klíčové insighty pro produkt
## Doporučení pro sales pitch`
    }]
  })

  return NextResponse.json({ insights: (message.content[0] as any).text })
}
