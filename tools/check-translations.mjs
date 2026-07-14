import { readFile } from 'node:fs/promises';
import process from 'node:process';

const englishFile = 'strings/strings.json';
const germanFiles = [
  'strings/strings-de.json',
  'strings/de/game.json',
  'strings/de/game-items.json',
  'strings/de/game-world.json',
  'strings/de/game-upgrades.json',
  'strings/de/story.json',
  'strings/de/story-dialogue-2.json',
  'strings/de/story-dialogue-3.json',
  'strings/de/story-dialogue-4.json',
  'strings/de/story-dialogue-5.json',
  'strings/de/story-dialogue-6.json',
  'strings/de/story-dialogue-7.json',
  'strings/de/story-other.json',
  'strings/de/ui.json',
  'strings/de/ui-characters.json',
  'strings/de/ui-exploration.json',
  'strings/de/ui-inventory.json',
  'strings/de/ui-rest.json',
];

async function readJson(file) {
  const source = await readFile(file, 'utf8');
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`${file}: ungültiges JSON (${error.message})`);
  }
}

function mergeDeep(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      target[key] = mergeDeep(target[key] || {}, value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function flatten(value, prefix = '', result = new Map()) {
  for (const [key, child] of Object.entries(value || {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flatten(child, path, result);
    } else {
      result.set(path, child);
    }
  }
  return result;
}

function placeholders(value) {
  if (typeof value !== 'string') return [];
  return [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)]
    .map(match => match[1])
    .sort();
}

function sameArray(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

const english = await readJson(englishFile);
const german = {};
for (const file of germanFiles) {
  mergeDeep(german, await readJson(file));
}

const englishFlat = flatten(english);
const germanFlat = flatten(german);
const missing = [];
const empty = [];
const placeholderErrors = [];

for (const [key, englishValue] of englishFlat) {
  if (!germanFlat.has(key)) {
    missing.push(key);
    continue;
  }

  const germanValue = germanFlat.get(key);
  if (typeof englishValue === 'string' && englishValue.length > 0 && (germanValue === null || germanValue === undefined || germanValue === '')) {
    empty.push(key);
  }

  const englishPlaceholders = placeholders(englishValue);
  const germanPlaceholders = placeholders(germanValue);
  if (!sameArray(englishPlaceholders, germanPlaceholders)) {
    placeholderErrors.push(`${key}: EN {${englishPlaceholders.join(', ')}} / DE {${germanPlaceholders.join(', ')}}`);
  }
}

if (missing.length || empty.length || placeholderErrors.length) {
  console.error('\nDie deutsche Übersetzung ist unvollständig.');
  if (missing.length) {
    console.error(`\nFehlende Schlüssel (${missing.length}):\n${missing.join('\n')}`);
  }
  if (empty.length) {
    console.error(`\nLeere Übersetzungen (${empty.length}):\n${empty.join('\n')}`);
  }
  if (placeholderErrors.length) {
    console.error(`\nFehlerhafte Platzhalter (${placeholderErrors.length}):\n${placeholderErrors.join('\n')}`);
  }
  process.exit(1);
}

console.log(`Deutsche Übersetzung vollständig: ${englishFlat.size} von ${englishFlat.size} Schlüsseln, alle Platzhalter korrekt.`);
