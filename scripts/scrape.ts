import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { searchWeb, scrapeUrl } from '../src/lib/searcher'

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })
dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Chybí SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY v .env.local')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

const CITIES = ['Praha', 'Brno', 'Ostrava', 'Plzeň', 'Liberec']
const TARGET_PER_CITY = 15

const QUERIES_TEMPLATE = [
  '{city} restaurace web kontakt',
  '{city} fine dining rezervace',
  '{city} pizzeria rozvoz',
  '{city} asijská restaurace thajská',
  '{city} hospoda pivnice jídlo',
  '{city} burger bar',
  '{city} italská restaurace',
  '{city} česká restaurace',
  '{city} wine bar gastropub',
  '{city} sushi japonská restaurace',
  '{city} mexická restaurace',
  '{city} steakhouse grill',
]

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function log(msg: string) { process.stdout.write(msg + '\n') }

async function countInDb(city: string): Promise<number> {
  const { count } = await sb.from('restaurants').select('*', { count: 'exact', head: true }).ilike('city', city)
  return count ?? 0
}

async function saveRestaurant(data: {
  name: string; city: string; category: 'casual' | 'premium';
  website?: string; email?: string; instagram?: string;
  facebook?: string; phone?: string; notes?: string
}): Promise<boolean> {
  const { data: existing } = await sb.from('restaurants').select('id')
    .ilike('name', data.name).ilike('city', data.city).maybeSingle()

  if (existing) return false // already exists

  const { data: inserted, error } = await sb.from('restaurants').insert({
    name: data.name, city: data.city, category: data.category,
    website: data.website ?? null, email: data.email ?? null,
    instagram: data.instagram ?? null, facebook: data.facebook ?? null,
    phone: data.phone ?? null, notes: data.notes ?? null,
  }).select('id').single()

  if (error || !inserted) { log(`  ⚠ DB chyba: ${error?.message}`); return false }

  await sb.from('outreach').insert({ restaurant_id: inserted.id })
  return true
}

function guessCategory(name: string, notes: string): 'casual' | 'premium' {
  const premium = /fine dining|wine bar|gastropub|steakhouse|sushi|grill|bistro/i
  return premium.test(name + notes) ? 'premium' : 'casual'
}

function isAggregator(url: string): boolean {
  return /tripadvisor|zomato|firmy\.cz|seznam\.cz\/restaurace|foursquare|yelp|facebook\.com\/pages|mapy\.cz/i.test(url)
}

async function processCity(city: string) {
  log(`\n🏙  ${city}`)
  let count = await countInDb(city)
  log(`   Již v databázi: ${count}`)

  if (count >= TARGET_PER_CITY) {
    log(`   ✅ Cíl dosažen (${count}/${TARGET_PER_CITY}), přeskakuji`)
    return
  }

  const visited = new Set<string>()

  for (const queryTemplate of QUERIES_TEMPLATE) {
    if (count >= TARGET_PER_CITY) break
    const query = queryTemplate.replace('{city}', city)

    log(`\n   🔍 ${query}`)
    let results: any[]
    try {
      results = await searchWeb(query, 10)
      await sleep(800)
    } catch (e: any) {
      log(`   ⚠ Chyba vyhledávání: ${e.message}`)
      continue
    }

    for (const result of results) {
      if (count >= TARGET_PER_CITY) break
      const url: string = result.href ?? result.url ?? ''
      if (!url || visited.has(url) || isAggregator(url)) continue
      visited.add(url)

      log(`   🌐 Scraping: ${url.slice(0, 60)}`)
      let scraped: any = {}
      try {
        scraped = await scrapeUrl(url)
        await sleep(1200)
      } catch { continue }

      const name: string = scraped.name || result.title?.split(/[-|–]/)[0]?.trim() || ''
      if (!name || name.length < 3) continue

      const category = guessCategory(name, scraped.notes ?? '')
      const saved = await saveRestaurant({
        name, city, category,
        website: url,
        email: scraped.email,
        instagram: scraped.instagram,
        facebook: scraped.facebook,
        phone: scraped.phone,
        notes: scraped.notes,
      })

      if (saved) {
        count++
        const contacts = [scraped.email, scraped.phone, scraped.instagram].filter(Boolean).join(', ') || 'žádné kontakty'
        log(`   ✅ [${count}/${TARGET_PER_CITY}] ${name} — ${contacts}`)
      } else {
        log(`   ⏭  Přeskočeno (duplikát): ${name}`)
      }
    }
  }

  log(`\n   📊 ${city} hotovo: ${count} restaurací`)
}

async function main() {
  log('🚀 Spouštím scraper restaurací...')
  log(`📍 Města: ${CITIES.join(', ')}`)
  log(`🎯 Cíl: ${TARGET_PER_CITY} na město\n`)

  for (const city of CITIES) {
    await processCity(city)
    await sleep(2000)
  }

  const { count: total } = await sb.from('restaurants').select('*', { count: 'exact', head: true })
  const { count: withEmail } = await sb.from('restaurants').select('*', { count: 'exact', head: true }).not('email', 'is', null)

  log('\n' + '='.repeat(50))
  log(`✅ HOTOVO`)
  log(`📊 Celkem: ${total} restaurací`)
  log(`📧 S emailem: ${withEmail}`)
  log('='.repeat(50))
}

main().catch(e => { log(`❌ ${e.message}`); process.exit(1) })
