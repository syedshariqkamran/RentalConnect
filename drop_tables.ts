import Database from 'better-sqlite3';

const db = new Database('rental.db');

console.log('Dropping tables...');
db.exec('DROP TABLE IF EXISTS property_images');
db.exec('DROP TABLE IF EXISTS interests');
db.exec('DROP TABLE IF EXISTS properties');
db.exec('DROP TABLE IF EXISTS users');
console.log('Tables dropped.');
