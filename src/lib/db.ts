import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
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

export async function saveRestaurant(data: Omit<Restaurant, 'id' | 'created_at'>): Promise<{ id: number; created: boolean }> {
  const client = sb()

  const { data: existing } = await client
    .from('restaurants')
    .select('id')
    .ilike('name', data.name)
    .ilike('city', data.city)
    .maybeSingle()

  if (existing) {
    const updates: Record<string, string> = {}
    if (data.website) updates.website = data.website
    if (data.email) updates.email = data.email
    if (data.instagram) updates.instagram = data.instagram
    if (data.facebook) updates.facebook = data.facebook
    if (data.phone) updates.phone = data.phone
    if (Object.keys(updates).length > 0) {
      await client.from('restaurants').update(updates).eq('id', existing.id)
    }
    return { id: existing.id, created: false }
  }

  const { data: inserted, error } = await client
    .from('restaurants')
    .insert({
      name: data.name,
      city: data.city,
      category: data.category,
      website: data.website ?? null,
      email: data.email ?? null,
      instagram: data.instagram ?? null,
      facebook: data.facebook ?? null,
      phone: data.phone ?? null,
      notes: data.notes ?? null,
    })
    .select('id')
    .single()

  if (error || !inserted) throw new Error(error?.message ?? 'Insert failed')

  await client.from('outreach').insert({ restaurant_id: inserted.id })
  return { id: inserted.id, created: true }
}

export async function getAllRestaurants(): Promise<Restaurant[]> {
  const { data } = await sb()
    .from('restaurants')
    .select('*, outreach(status, email_sent_at, followup_sent_at, response_text)')
    .order('city').order('category').order('name')

  return (data ?? []).map((r: any) => {
    const o = Array.isArray(r.outreach) ? r.outreach[0] : r.outreach
    return { ...r, ...(o ?? {}), outreach: undefined }
  })
}

export async function getStats() {
  const client = sb()
  const [{ data: restaurants }, { data: outreach }] = await Promise.all([
    client.from('restaurants').select('city, email'),
    client.from('outreach').select('status, email_sent_at'),
  ])

  const total = restaurants?.length ?? 0
  const withEmail = restaurants?.filter((r: any) => r.email).length ?? 0

  const cityMap: Record<string, number> = {}
  for (const r of restaurants ?? []) {
    cityMap[r.city] = (cityMap[r.city] ?? 0) + 1
  }
  const byCity = Object.entries(cityMap)
    .map(([city, c]) => ({ city, c }))
    .sort((a, b) => b.c - a.c)

  const statusMap: Record<string, number> = {}
  for (const o of outreach ?? []) {
    const s = o.status ?? 'pending'
    statusMap[s] = (statusMap[s] ?? 0) + 1
  }
  const byStatus = Object.entries(statusMap).map(([status, c]) => ({ status, c }))

  const responded = outreach?.filter((o: any) => o.status === 'responded').length ?? 0
  const sent = outreach?.filter((o: any) => o.email_sent_at).length ?? 0

  return { total, withEmail, byCity, byStatus, responded, sent }
}

export async function getPendingEmails() {
  const client = sb()
  const { data: pending } = await client
    .from('outreach')
    .select('id, restaurant_id')
    .is('email_sent_at', null)

  if (!pending?.length) return []

  const ids = pending.map((p: any) => p.restaurant_id)
  const { data: restaurants } = await client
    .from('restaurants')
    .select('*')
    .in('id', ids)
    .not('email', 'is', null)

  return (restaurants ?? []).map((r: any) => ({
    ...r,
    outreach_id: pending.find((p: any) => p.restaurant_id === r.id)?.id,
  })) as (Restaurant & { outreach_id: number })[]
}

export async function markEmailSent(outreachId: number) {
  await sb()
    .from('outreach')
    .update({ email_sent_at: new Date().toISOString(), status: 'sent' })
    .eq('id', outreachId)
}

export async function countByCity(city: string): Promise<number> {
  const { count } = await sb()
    .from('restaurants')
    .select('*', { count: 'exact', head: true })
    .ilike('city', city)
  return count ?? 0
}
