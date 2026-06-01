"use client";

// ─── Feed sync + dedup for the marketplace ─────────────────────
//
// Goals:
// • Reduce manual maintenance: install counts drift, "last synced" updates.
// • Third-party dedup: if a skill is found in multiple feeds, merge them so
//   users see one card with N source badges instead of N near-duplicate cards.
//
// Mock implementation: runs entirely client-side on top of the static data.
// In production this would be a Vercel cron / Edge function writing to a real
// store.

import {
  SKILLS,
  ALL_THIRD_PARTY_SKILLS,
  type Skill,
} from "./skills-data";

const SYNC_KEY = "cherryin.skill-feed-sync.v1";
const SYNC_INTERVAL_MS = 60_000; // refresh every 60s while page is open

interface SyncState {
  lastRunAt: string;
  installDeltas: Record<string, number>; // skill id -> cumulative delta
}

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function loadSyncState(): SyncState {
  if (!isBrowser()) return { lastRunAt: "1970-01-01T00:00:00.000Z", installDeltas: {} };
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    if (!raw) return { lastRunAt: "1970-01-01T00:00:00.000Z", installDeltas: {} };
    const parsed = JSON.parse(raw) as SyncState;
    return {
      lastRunAt: parsed.lastRunAt ?? "1970-01-01T00:00:00.000Z",
      installDeltas: parsed.installDeltas ?? {},
    };
  } catch {
    return { lastRunAt: "1970-01-01T00:00:00.000Z", installDeltas: {} };
  }
}

function saveSyncState(state: SyncState) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(SYNC_KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

// Deterministic small drift per skill id so reloads don't churn wildly.
function deltaFor(id: string, runs: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  // Drift is biased upward by ~70%, occasionally negative (skill churn).
  const positive = (Math.abs(h) % 100) > 30;
  const magnitude = (Math.abs(h) >> 4) % 24 + 1;
  return (positive ? 1 : -1) * magnitude * Math.max(1, Math.floor(runs / 4));
}

export function maybeRunSync(): SyncState {
  const state = loadSyncState();
  const elapsed = Date.now() - new Date(state.lastRunAt).getTime();
  if (elapsed < SYNC_INTERVAL_MS) return state;

  const runs = Math.max(1, Math.floor(elapsed / SYNC_INTERVAL_MS));
  const nextDeltas = { ...state.installDeltas };
  for (const s of SKILLS) {
    nextDeltas[s.id] = (nextDeltas[s.id] ?? 0) + deltaFor(s.id, runs);
  }
  for (const s of ALL_THIRD_PARTY_SKILLS) {
    nextDeltas[s.id] = (nextDeltas[s.id] ?? 0) + deltaFor(s.id, runs);
  }
  const nextState: SyncState = {
    lastRunAt: new Date().toISOString(),
    installDeltas: nextDeltas,
  };
  saveSyncState(nextState);
  return nextState;
}

export function applySyncToSkill(skill: Skill, state: SyncState): Skill {
  const delta = state.installDeltas[skill.id] ?? 0;
  if (delta === 0 && skill.lastSyncedAt) return skill;
  return {
    ...skill,
    installs: Math.max(0, skill.installs + delta),
    lastSyncedAt: state.lastRunAt,
  };
}

// ─── Third-party dedup ────────────────────────────────────────
//
// Group third-party entries that point at the "same" skill across different
// feeds (e.g. lobehub + claudeskills both list `agent-trace`). Merge into one
// card with `feeds: [...]` so the UI can show "available on 3 sources".

function canonicalKey(skill: Skill): string {
  const name = typeof skill.name === "string" ? skill.name : skill.name.en;
  return name
    .toLowerCase()
    .trim()
    .replace(/^@/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function dedupThirdParty(skills: Skill[]): Skill[] {
  const groups = new Map<string, Skill[]>();
  for (const s of skills) {
    const key = canonicalKey(s);
    const arr = groups.get(key);
    if (arr) arr.push(s);
    else groups.set(key, [s]);
  }

  const out: Skill[] = [];
  for (const [, members] of groups) {
    if (members.length === 1) {
      const only = members[0]!;
      out.push({ ...only, feeds: only.sourceFeed ? [only.sourceFeed] : [] });
      continue;
    }
    // Merge multi-source duplicates
    const sorted = members.slice().sort((a, b) => b.installs - a.installs);
    const top = sorted[0]!;
    const feeds = Array.from(
      new Set(sorted.map((m) => m.sourceFeed).filter(Boolean) as string[]),
    );
    const installs = sorted.reduce((sum, m) => sum + m.installs, 0);
    const ratingSum = sorted.reduce((sum, m) => sum + m.rating, 0);
    const rating = Math.round((ratingSum / sorted.length) * 10) / 10;
    const releaseDate = sorted
      .map((m) => m.releaseDate)
      .sort()
      .pop()!;
    out.push({
      ...top,
      installs,
      rating,
      releaseDate,
      sourceFeed: feeds[0],
      feeds,
    });
  }
  return out;
}
