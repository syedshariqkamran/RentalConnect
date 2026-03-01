import db from './db.ts';

const props = db.prepare('SELECT location FROM properties').all();
console.log(props);
