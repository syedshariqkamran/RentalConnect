import db from './db';

const stmt = db.prepare("DELETE FROM properties WHERE location LIKE '%shaheen%' OR location LIKE '%okhla%'");
const info = stmt.run();
console.log(`Deleted ${info.changes} properties.`);
