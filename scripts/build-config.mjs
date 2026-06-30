/*
 * Erzeugt src/config.js für die Online-Bestenliste (Supabase).
 *
 * Reihenfolge:
 *   1. GitHub-Secrets / Umgebungsvariablen SUPABASE_URL + SUPABASE_ANON_KEY
 *   2. die öffentlichen Default-Werte unten (Publishable Key + Projekt-URL)
 *   3. fehlt beides -> lokaler Fallback (localStorage)
 *
 * Der Publishable Key ist DESIGNGEMÄSS ÖFFENTLICH: er wird an jeden Browser
 * ausgeliefert und ausschließlich durch Row-Level-Security (siehe db/schema.sql)
 * abgesichert. Secret Key / DB-Passwort gehören NIEMALS hierher.
 *
 * Nutzung:  node scripts/build-config.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Öffentliche Default-Konfiguration (Publishable Key – kein Geheimnis).
const DEFAULT_SUPABASE_URL = 'https://lzsmtbpeyxziksacwucd.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_VaDzpm5NgEjymLzulPFdHA_BEJ45pLQ';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = join(root, 'src', 'config.js');

const url = (process.env.SUPABASE_URL || '').trim() || DEFAULT_SUPABASE_URL;
const key = (process.env.SUPABASE_ANON_KEY || '').trim() || DEFAULT_SUPABASE_ANON_KEY;
const online = url && key;

const payload = online ? { supabaseUrl: url, supabaseAnonKey: key } : null;

const banner = online
  ? '// Generiert von scripts/build-config.mjs – Online-Bestenliste (Supabase) aktiv.'
  : '// Generiert von scripts/build-config.mjs – lokaler Fallback aktiv.';

const content = `${banner}\nwindow.DB_CONFIG = ${JSON.stringify(payload)};\n`;

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, content, 'utf8');

console.log(online
  ? `[build-config] Online-Konfiguration geschrieben -> ${outFile}`
  : `[build-config] Fallback-Konfiguration (lokal) geschrieben -> ${outFile}`);
