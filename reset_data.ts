import Database from 'better-sqlite3';

const db = new Database('rental.db');

// Clear existing data
db.exec('DELETE FROM property_images');
db.exec('DELETE FROM interests');
db.exec('DELETE FROM properties');
// We keep users to avoid breaking login, but we need the agent ID.
const agent = db.prepare("SELECT id FROM users WHERE role = 'agent' LIMIT 1").get() as { id: number };

if (agent) {
  const agentId = agent.id;
  
  const insertProp = db.prepare(`
    INSERT INTO properties (agent_id, title, description, price, location, bhk_type, bathrooms)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertImage = db.prepare('INSERT INTO property_images (property_id, image_url) VALUES (?, ?)');

  // Delhi Property 1
  const p1 = insertProp.run(
    agentId,
    'Modern 2 BHK in Saket',
    'Near Select City Walk, fully furnished with modular kitchen. Gated society.',
    35000,
    'Saket, Delhi',
    '2 BHK',
    2
  );
  insertImage.run(p1.lastInsertRowid, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80');
  insertImage.run(p1.lastInsertRowid, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80');

  // Delhi Property 2
  const p2 = insertProp.run(
    agentId,
    'Affordable 1 RK in Laxmi Nagar',
    'Best for students preparing for CA/UPSC. Near Metro Station.',
    8000,
    'Laxmi Nagar, Delhi',
    '1 RK',
    1
  );
  insertImage.run(p2.lastInsertRowid, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80');

  // Delhi Property 3
  const p3 = insertProp.run(
    agentId,
    'Luxury 3 BHK in Vasant Kunj',
    'Premium apartment with servant quarter and 2 car parkings.',
    65000,
    'Vasant Kunj, Delhi',
    '3 BHK',
    3
  );
  insertImage.run(p3.lastInsertRowid, 'https://images.unsplash.com/photo-1600596542815-e328701102b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80');
  insertImage.run(p3.lastInsertRowid, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80');

  // Delhi Property 4
  const p4 = insertProp.run(
    agentId,
    'Spacious 2 BHK Floor in Rohini',
    'Newly built builder floor, park facing, near market.',
    22000,
    'Rohini Sector 13, Delhi',
    '2 BHK',
    2
  );
  insertImage.run(p4.lastInsertRowid, 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80');

  console.log('Database reset with Delhi properties.');
} else {
  console.log('No agent found to assign properties to.');
}
