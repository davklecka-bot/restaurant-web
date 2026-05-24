import { put, list, del } from '@vercel/blob'
import path from 'path'
import fs from 'fs'

const DATA_KEY = 'rw-restaurants.json'
const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN

type RestaurantRow = {
  id: number
  name: string
  city: string
  category: 'casual' | 'premium'
  website?: string | null
  email?: string | null
  instagram?: string | null
  facebook?: string | null
  phone?: string | null
  notes?: string | null
  created_at: string
}

type OutreachRow = {
  id: number
  restaurant_id: number
  email_sent_at?: string | null
  followup_sent_at?: string | null
  status: string
  response_text?: string | null
  response_received_at?: string | null
  created_at: string
}

type DbData = {
  restaurants: RestaurantRow[]
  outreach: OutreachRow[]
  nextRId: number
  nextOId: number
}

export type Restaurant = RestaurantRow & {
  status?: string
  email_sent_at?: string | null
  followup_sent_at?: string | null
  response_text?: string | null
}

const empty = (): DbData => ({ restaurants: [], outreach: [], nextRId: 1, nextOId: 1 })

// --- Blob storage (Vercel) ---
async function readBlob(): Promise<DbData> {
  try {
    const { blobs } = await list({ prefix: DATA_KEY })
    if (!blobs.length) return empty()
    // Get the most recently uploaded blob
    const latest = blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0]
    const res = await fetch(latest.downloadUrl)
    if (!res.ok) return empty()
    return await res.json()
  } catch {
    return empty()
  }
}

async function writeBlob(data: DbData): Promise<void> {
  // Delete old blobs first — private blobs ignore addRandomSuffix:false and each put() creates a new one
  const { blobs } = await list({ prefix: DATA_KEY })
  if (blobs.length > 0) {
    await del(blobs.map(b => b.url))
  }
  await put(DATA_KEY, JSON.stringify(data), { access: 'private' })
}

// --- Local JSON fallback (development) ---
const LOCAL_PATH = path.join(process.cwd(), 'data', 'restaurants.json')

function readLocal(): DbData {
  try {
    if (!fs.existsSync(LOCAL_PATH)) return empty()
    return JSON.parse(fs.readFileSync(LOCAL_PATH, 'utf-8'))
  } catch {
    return empty()
  }
}

function writeLocal(data: DbData): void {
  const dir = path.dirname(LOCAL_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(LOCAL_PATH, JSON.stringify(data, null, 2))
}

async function read(): Promise<DbData> {
  return USE_BLOB ? readBlob() : readLocal()
}

async function write(data: DbData): Promise<void> {
  return USE_BLOB ? writeBlob(data) : writeLocal(data)
}

// --- Public API ---

export async function saveRestaurant(data: Omit<Restaurant, 'id' | 'created_at'>): Promise<{ id: number; created: boolean }> {
  const db = await read()
  const existing = db.restaurants.find(
    r => r.name.toLowerCase() === data.name.toLowerCase() && r.city.toLowerCase() === data.city.toLowerCase()
  )

  if (existing) {
    if (data.website) existing.website = data.website
    if (data.email) existing.email = data.email
    if (data.instagram) existing.instagram = data.instagram
    if (data.facebook) existing.facebook = data.facebook
    if (data.phone) existing.phone = data.phone
    await write(db)
    return { id: existing.id, created: false }
  }

  const id = db.nextRId++
  db.restaurants.push({
    id, name: data.name, city: data.city, category: data.category,
    website: data.website ?? null, email: data.email ?? null,
    instagram: data.instagram ?? null, facebook: data.facebook ?? null,
    phone: data.phone ?? null, notes: data.notes ?? null,
    created_at: new Date().toISOString(),
  })

  const oid = db.nextOId++
  db.outreach.push({
    id: oid, restaurant_id: id, status: 'pending',
    email_sent_at: null, followup_sent_at: null,
    response_text: null, response_received_at: null,
    created_at: new Date().toISOString(),
  })

  await write(db)
  return { id, created: true }
}

export async function getAllRestaurants(): Promise<Restaurant[]> {
  const db = await read()
  return db.restaurants
    .sort((a, b) => a.city.localeCompare(b.city) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    .map(r => {
      const o = db.outreach.find(o => o.restaurant_id === r.id)
      return { ...r, status: o?.status, email_sent_at: o?.email_sent_at, followup_sent_at: o?.followup_sent_at, response_text: o?.response_text }
    })
}

export async function getStats() {
  const db = await read()
  const { restaurants, outreach } = db

  const total = restaurants.length
  const withEmail = restaurants.filter(r => r.email).length

  const cityMap: Record<string, number> = {}
  for (const r of restaurants) cityMap[r.city] = (cityMap[r.city] ?? 0) + 1
  const byCity = Object.entries(cityMap).map(([city, c]) => ({ city, c })).sort((a, b) => b.c - a.c)

  const statusMap: Record<string, number> = {}
  for (const o of outreach) {
    const s = o.status ?? 'pending'
    statusMap[s] = (statusMap[s] ?? 0) + 1
  }
  const byStatus = Object.entries(statusMap).map(([status, c]) => ({ status, c }))

  const responded = outreach.filter(o => o.status === 'responded').length
  const sent = outreach.filter(o => o.email_sent_at).length

  return { total, withEmail, byCity, byStatus, responded, sent }
}

export async function getPendingEmails() {
  const db = await read()
  const pending = db.outreach.filter(o => !o.email_sent_at)
  const ids = new Set(pending.map(p => p.restaurant_id))
  return db.restaurants
    .filter(r => r.email && ids.has(r.id))
    .map(r => ({ ...r, outreach_id: pending.find(p => p.restaurant_id === r.id)!.id }))
}

export async function markEmailSent(outreachId: number) {
  const db = await read()
  const o = db.outreach.find(o => o.id === outreachId)
  if (o) {
    o.email_sent_at = new Date().toISOString()
    o.status = 'sent'
    await write(db)
  }
}

export async function countByCity(city: string): Promise<number> {
  const db = await read()
  return db.restaurants.filter(r => r.city.toLowerCase() === city.toLowerCase()).length
}
