// watchlistAgent

import type { Trial } from '../lib/trials'

export type WatchEventType = 'status' | 'site' | 'edit' | 'similar'

export interface SavedTrial {
  nctId: string
  title?: string
  status?: string
  locations?: string[]
  eligibilityText?: string
  lastHash?: string
}

export interface WatchEvent {
  nctId: string
  type: WatchEventType
  ts: number
  before?: string
  after?: string
  details?: string
}

const SAVED_KEY = 'rarepath_saved_trials'
const ALERTS_KEY = 'rarepath_alerts'

export function getSavedTrials(): SavedTrial[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]') } catch { return [] }
}
function setSavedTrials(arr: SavedTrial[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(arr))
}
export function getAlerts(): WatchEvent[] {
  try { return JSON.parse(localStorage.getItem(ALERTS_KEY) || '[]') } catch { return [] }
}
function pushAlerts(events: WatchEvent[]) {
  if (!events.length) return
  const q = getAlerts()
  q.push(...events)
  localStorage.setItem(ALERTS_KEY, JSON.stringify(q))
}

export function isSaved(nctId: string) {
  return !!getSavedTrials().find(t => t.nctId === nctId)
}
export function saveTrial(trial: Trial) {
  const saved = getSavedTrials()
  if (!saved.find(t => t.nctId === (trial as any).nctId)) {
    const minimal: SavedTrial = {
      nctId: (trial as any).nctId || (trial as any).NCTId || '',
      title: (trial as any).title || (trial as any).BriefTitle,
      status: (trial as any).status || (trial as any).OverallStatus,
      locations: (trial as any).locations || [],
      eligibilityText: (trial as any).eligibilityText || (trial as any).EligibilityCriteria
    }
    minimal.lastHash = computeTrialHash(minimal)
    saved.push(minimal)
    setSavedTrials(saved)
  }
}
export function unsaveTrial(nctId: string) {
  setSavedTrials(getSavedTrials().filter(t => t.nctId !== nctId))
}
export function toggleSave(trial: Trial): boolean {
  if (isSaved((trial as any).nctId)) { unsaveTrial((trial as any).nctId); return false }
  saveTrial(trial); return true
}

export function computeTrialHash(input: { status?: string; locations?: string[]; eligibilityText?: string }): string {
  const key = JSON.stringify({
    s: input.status?.toLowerCase() || '',
    l: (input.locations || []).slice().sort(),
    e: (input.eligibilityText || '').slice(0, 2000)
  })
  let h = 0; for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0
  return String(h)
}

async function fetchTrialsByIds(nctIds: string[]) {
  if (!nctIds.length) return []
  const fields = ['NCTId','BriefTitle','OverallStatus','EligibilityCriteria','LocationFacility','Condition','Phase'].join(',')
  const url = `/ctgov2/api/v2/studies?format=json&fields=${encodeURIComponent(fields)}&filter.ids=${encodeURIComponent(nctIds.join(','))}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CT.gov fetch failed: ${res.status}`)
  const json = await res.json()
  const studies = json?.studies || json?.results || []
  return (studies as any[]).map((s: any) => {
    const rec = s?.protocolSection || s?.study || s
    const id = rec?.identificationModule?.nctId || rec?.NCTId || s?.NCTId
    const title = rec?.identificationModule?.briefTitle || rec?.BriefTitle
    const status = rec?.statusModule?.overallStatus || rec?.OverallStatus
    const elig = rec?.eligibilityModule?.eligibilityCriteria || rec?.EligibilityCriteria || ''
    const locs =
      (rec?.contactsLocationsModule?.locations || []).map((l: any) => l?.facility?.name).filter(Boolean) ||
      s?.LocationFacility || []
    return { nctId: id, title, status, eligibilityText: elig, locations: Array.isArray(locs) ? locs : [String(locs)] } as SavedTrial
  })
}

export async function checkSavedTrials({ state }: { state?: string } = {}) {
  const saved = getSavedTrials()
  if (!saved.length) return [] as WatchEvent[]

  const latest = await fetchTrialsByIds(saved.map(t => t.nctId))
  const events: WatchEvent[] = []

  latest.forEach(cur => {
    const prev = saved.find(s => s.nctId === cur.nctId)!
    const newHash = computeTrialHash(cur)
    if (prev.lastHash && prev.lastHash !== newHash) {
      if ((prev.status || '').toLowerCase() !== (cur.status || '').toLowerCase()) {
        events.push({ nctId: cur.nctId, type: 'status', ts: Date.now(), details: `${prev.status || 'unknown'} → ${cur.status || 'unknown'}`, before: prev.lastHash, after: newHash })
      }
      const gotNewSiteInState =
        state &&
        (cur.locations || []).some(l => String(l).toLowerCase().includes(state.toLowerCase())) &&
        !(prev.locations || []).some(l => String(l).toLowerCase().includes(state.toLowerCase()))
      if (gotNewSiteInState) events.push({ nctId: cur.nctId, type: 'site', ts: Date.now(), before: prev.lastHash, after: newHash })
      if (!events.find(e => e.nctId === cur.nctId && (e.type === 'status' || e.type === 'site'))) {
        events.push({ nctId: cur.nctId, type: 'edit', ts: Date.now(), before: prev.lastHash, after: newHash })
      }
      prev.status = cur.status
      prev.locations = cur.locations
      prev.eligibilityText = cur.eligibilityText
      prev.lastHash = newHash
    } else if (!prev.lastHash) {
      prev.lastHash = newHash
    }
  })

  setSavedTrials(saved)
  pushAlerts(events)
  return events
}
