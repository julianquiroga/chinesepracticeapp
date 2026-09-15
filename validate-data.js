#!/usr/bin/env node
// Chequeo de integridad de datos — corre `node validate-data.js` antes de subir
// cambios a data.js o a PATTERN_CATEGORIES en app.js. No requiere dependencias.
const fs = require('fs');
const path = require('path');

global.window = {};
require('./data.js');
const ALL_CARDS = window.ALL_CARDS;
const UNIT_COLORS = window.UNIT_COLORS;

let errors = 0;
function fail(msg) { console.error('❌', msg); errors++; }
function warn(msg) { console.warn('⚠️ ', msg); }

// 1. IDs únicos
const idCounts = {};
ALL_CARDS.forEach(c => { idCounts[c.id] = (idCounts[c.id] || 0) + 1; });
Object.entries(idCounts).filter(([, n]) => n > 1).forEach(([id]) => fail(`id duplicado: ${id}`));

// 2. Campos requeridos
const REQUIRED = ['id', 'unit', 'unitName', 'zh', 'py', 'es', 'exZh', 'exPy', 'exEs'];
ALL_CARDS.forEach(c => {
  REQUIRED.forEach(f => {
    if (c[f] === undefined || c[f] === '') fail(`tarjeta ${c.id}: falta el campo "${f}"`);
  });
});

// 3. UNIT_COLORS cubre todas las unidades excepto 30 (pseudo-unidad de referencia cruzada)
const units = [...new Set(ALL_CARDS.map(c => c.unit))];
units.filter(u => u !== 30 && !UNIT_COLORS[u]).forEach(u => fail(`unidad ${u}: falta UNIT_COLORS`));

// 4. Cada unidad debe caer en uno de los 3 libros conocidos (o ser la unidad 30 de referencia).
//    Si esto falla, revisar bookInfo() en app.js — es el único lugar que debería
//    necesitar tocarse al agregar un libro nuevo.
units.forEach(u => {
  const inBook1 = u >= 1 && u <= 10;
  const inBook2 = u >= 13 && u <= 22;
  const inBook3 = u >= 23 && u !== 30;
  if (u !== 30 && !inBook1 && !inBook2 && !inBook3) fail(`unidad ${u}: no cae en ningún libro conocido (revisar bookInfo en app.js)`);
});

// 5. PATTERN_CATEGORIES (definida en app.js) — se extrae como literal de array,
//    sin ejecutar el resto de app.js (que tiene JSX y no se puede cargar con require).
const appSrc = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const match = appSrc.match(/const PATTERN_CATEGORIES = (\[[\s\S]*?\n\];)/);
if (!match) {
  fail('no se pudo extraer PATTERN_CATEGORIES de app.js (¿cambió el formato del archivo?)');
} else {
  const PATTERN_CATEGORIES = new Function(`return ${match[1]}`)();
  const idSet = new Set(ALL_CARDS.map(c => c.id));
  const categorized = new Set();
  const seenTwice = new Set();
  PATTERN_CATEGORIES.forEach(cat => cat.ids.forEach(id => {
    if (categorized.has(id)) seenTwice.add(id);
    categorized.add(id);
    if (!idSet.has(id)) fail(`PATTERN_CATEGORIES.${cat.key} referencia el id ${id}, que no existe en ALL_CARDS`);
  }));
  seenTwice.forEach(id => fail(`tarjeta ${id}: aparece en más de una categoría de PATTERN_CATEGORIES`));

  // Las tarjetas de patrón (unitName con 📐) que no están en ninguna categoría no
  // rompen la app, pero significan que quedaron fuera de "Patrones gramaticales"
  // en la navegación por categoría — es el tipo de olvido manual que este check existe para atrapar.
  const patternCards = ALL_CARDS.filter(c => c.unitName.includes('📐'));
  const uncategorized = patternCards.filter(c => !categorized.has(c.id));
  if (uncategorized.length > 0) {
    warn(`${uncategorized.length} tarjeta(s) de patrón sin categoría en PATTERN_CATEGORIES: ${uncategorized.map(c => c.id).join(', ')}`);
  }
}

console.log(`\n${ALL_CARDS.length} tarjetas, ${units.length} unidades revisadas.`);
if (errors > 0) {
  console.error(`\n${errors} error(es) encontrados.`);
  process.exit(1);
} else {
  console.log('\n✅ Todo OK.');
}
