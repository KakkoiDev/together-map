export const STALE_MS = 45_000;
export const EXPIRE_MS = 120_000;
export async function roomIdFor(password, room = 'lobby') {
  const bytes = new TextEncoder().encode(JSON.stringify(['together-map:v2', room, password]));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
}
export const EMOJIS = ['🦆','🐱','🐶','🐸','🦊','🐼','🐧','🐙','🌸','⭐','🚀','🤖'];
export function roomFromUrl(url) {
  const value = new URL(url).searchParams.get('room');
  return value && value.trim() && value.length <= 64 ? value.trim() : '';
}
export function roomLink(url, room) {
  const link = new URL(url); link.search = ''; link.hash = ''; link.searchParams.set('room', room); return link.href;
}
export function validPresence(data) {
  if (!data || data.v !== 2 || !EMOJIS.includes(data.emoji) || typeof data.name !== 'string' || !data.name.trim() || data.name.length > 32) return false;
  if (data.position === null) return true;
  const p = data.position;
  return !!p && Number.isFinite(p.lat) && Math.abs(p.lat) <= 90 && Number.isFinite(p.lng) && Math.abs(p.lng) <= 180 && Number.isFinite(p.accuracy) && p.accuracy >= 0 && p.accuracy <= 1e7 && Number.isFinite(p.timestamp) && p.timestamp > 0;
}
