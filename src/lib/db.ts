import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// On Vercel the filesystem is read-only except /tmp
const DB_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data')
const DB_PATH = path.join(DB_DIR, 'restaurants.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    initDb(db)
  }
  return db
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      city        TEXT NOT NULL,
      category    TEXT NOT NULL CHECK(category IN ('casual','premium')),
      website     TEXT,
      email       TEXT,
      instagram   TEXT,
      facebook    TEXT,
      phone       TEXT,
      notes       TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS outreach (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id        INTEGER REFERENCES restaurants(id),
      email_sent_at        DATETIME,
      followup_sent_at     DATETIME,
      status               TEXT DEFAULT 'pending',
      response_text        TEXT,
      response_received_at DATETIME,
      created_at           DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

export type Restaurant = {
  id: number
  name: string
  city: string
  category: 'casual' | 'premium'
  website?: string
  email?: string
  instagram?: string
  facebook?: string
  phone?: string
  notes?: string
  created_at: string
  status?: string
  email_sent_at?: string
  followup_sent_at?: string
  response_text?: string
}

export function saveRestaurant(data: Omit<Restaurant, 'id' | 'created_at'>): { id: number; created: boolean } {
  const db = getDb()
  const existing = db.prepare(
    'SELECT id FROM restaurants WHERE lower(name)=lower(?) AND lower(city)=lower(?)'
  ).get(data.name, data.city) as { id: number } | undefined

  if (existing) {
    db.prepare(`
      UPDATE restaurants SET
        website=COALESCE(?,website), email=COALESCE(?,email),
        instagram=COALESCE(?,instagram), facebook=COALESCE(?,facebook),
        phone=COALESCE(?,phone)
      WHERE id=?
    `).run(data.website ?? null, data.email ?? null, data.instagram ?? null, data.facebook ?? null, data.phone ?? null, existing.id)
    return { id: existing.id, created: false }
  }

  const result = db.prepare(`
    INSERT INTO restaurants (name,city,category,website,email,instagram,facebook,phone,notes)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(data.name, data.city, data.category, data.website ?? null, data.email ?? null,
         data.instagram ?? null, data.facebook ?? null, data.phone ?? null, data.notes ?? null)

  const id = result.lastInsertRowid as number
  db.prepare('INSERT INTO outreach (restaurant_id) VALUES (?)').run(id)
  return { id, created: true }
}

export function getAllRestaurants(): Restaurant[] {
  const db = getDb()
  return db.prepare(`
    SELECT r.*, o.status, o.email_sent_at, o.followup_sent_at, o.response_text
    FROM restaurants r
    LEFT JOIN outreach o ON o.restaurant_id = r.id
    ORDER BY r.city, r.category, r.name
  `).all() as Restaurant[]
}

export function getStats() {
  const db = getDb()
  const total = (db.prepare('SELECT COUNT(*) as c FROM restaurants').get() as any).c
  const withEmail = (db.prepare('SELECT COUNT(*) as c FROM restaurants WHERE email IS NOT NULL').get() as any).c
  const byCity = db.prepare('SELECT city, COUNT(*) as c FROM restaurants GROUP BY city ORDER BY c DESC').all() as { city: string; c: number }[]
  const byStatus = db.prepare("SELECT status, COUNT(*) as c FROM outreach GROUP BY status").all() as { status: string; c: number }[]
  const responded = (db.prepare("SELECT COUNT(*) as c FROM outreach WHERE status='responded'").get() as any).c
  const sent = (db.prepare("SELECT COUNT(*) as c FROM outreach WHERE email_sent_at IS NOT NULL").get() as any).c
  return { total, withEmail, byCity, byStatus, responded, sent }
}

export function getPendingEmails() {
  const db = getDb()
  return db.prepare(`
    SELECT r.*, o.id as outreach_id
    FROM restaurants r JOIN outreach o ON o.restaurant_id = r.id
    WHERE r.email IS NOT NULL AND o.email_sent_at IS NULL
  `).all() as (Restaurant & { outreach_id: number })[]
}

export function markEmailSent(outreachId: number) {
  getDb().prepare("UPDATE outreach SET email_sent_at=datetime('now'), status='sent' WHERE id=?").run(outreachId)
}

export function countByCity(city: string): number {
  return ((getDb().prepare('SELECT COUNT(*) as c FROM restaurants WHERE lower(city)=lower(?)').get(city) as any)?.c ?? 0)
}
