import axios from 'axios'
import * as cheerio from 'cheerio'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
}

const SKIP_DOMAINS = new Set(['example.com','sentry.io','wixpress.com','schema.org','w3.org','google.com','facebook.com','instagram.com','wordpress.com','cloudflare.com'])
const SKIP_URLS = ['google.com','facebook.com','instagram.com','tripadvisor','zomato','booking.com','firmy.cz','rejstrik','zlatestranky','heureka','wikipedia','youtube']
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g

export async function searchWeb(query: string, maxResults = 10): Promise<{ title: string; href: string; body: string }[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    const res = await axios.get(url, { headers: HEADERS, timeout: 8000 })
    const $ = cheerio.load(res.data)
    const results: { title: string; href: string; body: string }[] = []

    $('.result').each((_, el) => {
      const href = $(el).find('.result__url').attr('href') || $(el).find('a.result__a').attr('href') || ''
      const title = $(el).find('a.result__a').text().trim()
      const body = $(el).find('.result__snippet').text().trim()
      const cleanHref = href.startsWith('//') ? 'https:' + href : href
      if (cleanHref && !SKIP_URLS.some(s => cleanHref.includes(s))) {
        results.push({ title, href: cleanHref, body })
      }
    })
    return results.slice(0, maxResults)
  } catch {
    return []
  }
}

export async function scrapeUrl(url: string): Promise<{
  name?: string; email?: string; instagram?: string; facebook?: string; phone?: string; scrape_error?: string
}> {
  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 8000, maxRedirects: 5 })
    const $ = cheerio.load(res.data)
    const html = res.data as string
    const result: Record<string, string> = {}

    const ogName = $('meta[property="og:site_name"]').attr('content')
    result.name = ogName?.trim() || $('h1').first().text().trim() || ''

    const emails = new Set<string>()
    $('a[href^="mailto:"]').each((_, el) => {
      const addr = $(el).attr('href')?.replace('mailto:', '').split('?')[0].trim().toLowerCase()
      if (addr) emails.add(addr)
    })
    const matches = html.match(EMAIL_RE) || []
    matches.forEach(m => {
      const domain = m.split('@')[1]?.toLowerCase()
      if (domain && !SKIP_DOMAINS.has(domain)) emails.add(m.toLowerCase())
    })

    const host = new URL(url).hostname
    const hostDomain = host.split('.').slice(-2).join('.')
    let chosenEmail = ''
    for (const e of emails) {
      if (e.includes(hostDomain)) { chosenEmail = e; break }
    }
    if (!chosenEmail && emails.size > 0) chosenEmail = [...emails][0]
    if (chosenEmail) result.email = chosenEmail

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || ''
      if (href.includes('instagram.com') && !href.includes('email') && !result.instagram) result.instagram = href
      if (href.includes('facebook.com') && !href.includes('/sharer') && !result.facebook) result.facebook = href
    })

    const tel = $('a[href^="tel:"]').first().attr('href')
    if (tel) result.phone = tel.replace('tel:', '').trim()

    if (!result.email) {
      try {
        const contactUrl = new URL('/kontakt', url).toString()
        const cr = await axios.get(contactUrl, { headers: HEADERS, timeout: 5000 })
        const m = (cr.data as string).match(EMAIL_RE)
        if (m) {
          const d = m[0].split('@')[1]?.toLowerCase()
          if (d && !SKIP_DOMAINS.has(d)) result.email = m[0].toLowerCase()
        }
      } catch {}
    }

    return result
  } catch (e: any) {
    return { scrape_error: e.message }
  }
}
