// Datos de PRUEBA para verificar la búsqueda a mano (SPEC-001 V-20).
// Solo para la base de DESARROLLO. Se niega a ejecutarse con NODE_ENV=production.
// Es repetible: los libros que ya existen (mismo título y autor normalizados) se omiten.
import { loadConfig } from '../src/config/env.js';
import { assertSchemaReady, openDatabase } from '../src/database/connection.js';
import { normalizeText } from '../src/utils/normalize-text.js';

const SAMPLE_BOOKS = [
  { title: 'Cien años de soledad', author: 'Gabriel García Márquez', quantity: 3, shelfLabel: 'A-3' },
  { title: 'Crónica de una muerte anunciada', author: 'Gabriel García Márquez', quantity: 4, shelfLabel: null },
  { title: 'El amor en los tiempos del cólera', author: 'Gabriel García Márquez', quantity: 0, shelfLabel: 'A-4' },
  { title: 'El principito', author: 'Antoine de Saint-Exupéry', quantity: 0, shelfLabel: 'B-1' },
  { title: 'Don Quijote de la Mancha', author: 'Miguel de Cervantes Saavedra', quantity: 2, shelfLabel: null },
  { title: 'Rayuela', author: 'Julio Cortázar', quantity: 1, shelfLabel: 'C-2' },
  { title: 'Rayuela', author: 'Otra Persona', quantity: 5, shelfLabel: null },
  { title: '<b>Título con HTML</b>', author: 'Prueba <i>textContent</i>', quantity: 1, shelfLabel: null },
  { title: `Título muy largo ${'palabra '.repeat(22)}fin`.slice(0, 200), author: 'Autor de prueba', quantity: 1, shelfLabel: null },
];

const config = loadConfig();
if (config.isProduction) {
  console.error('Rechazado: seed-dev.js es solo para desarrollo.');
  process.exit(1);
}

const db = openDatabase(config.databasePath);
try {
  assertSchemaReady(db);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO books (title, author, quantity, shelf_label, title_normalized, author_normalized)
    VALUES (@title, @author, @quantity, @shelfLabel, @titleNormalized, @authorNormalized)
  `);

  let inserted = 0;
  for (const book of SAMPLE_BOOKS) {
    const result = insert.run({
      ...book,
      titleNormalized: normalizeText(book.title),
      authorNormalized: normalizeText(book.author),
    });
    inserted += result.changes;
  }
  console.log(`Libros de prueba insertados: ${inserted} (de ${SAMPLE_BOOKS.length}).`);
} finally {
  db.close();
}