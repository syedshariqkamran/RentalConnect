import express from "express";
import { createServer as createViteServer } from "vite";
import db from "./db";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // --- API Routes ---

  // Auth
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password, role, phone } = req.body;
    try {
      const result = await db.query(
        'INSERT INTO users (name, email, password, role, phone, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [name, email, password, role, phone, 'active']
      );
      const newUserId = result.rows[0].id;
      const newUser = await db.query('SELECT id, name, email, role, phone, status, created_at FROM users WHERE id = $1', [newUserId]);
      res.json(newUser.rows[0]);
    } catch (err: any) {
      if (err.code === '23505') { // PostgreSQL unique violation
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const result = await db.query('SELECT * FROM users WHERE (email = $1 OR phone = $2) AND password = $3', [email, email, password]);
      const user = result.rows[0];
      if (user) {
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- OAuth Routes ---
  app.get('/api/auth/google/url', (req, res) => {
    const redirectUri = `${req.headers.origin || process.env.APP_URL}/auth/callback/google`;
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email profile',
      access_type: 'offline',
      prompt: 'consent'
    });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  });

  app.get('/api/auth/facebook/url', (req, res) => {
    const redirectUri = `${req.headers.origin || process.env.APP_URL}/auth/callback/facebook`;
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email,public_profile'
    });
    res.json({ url: `https://www.facebook.com/v18.0/dialog/oauth?${params}` });
  });

  app.post('/api/auth/social', async (req, res) => {
    const { provider, code, redirectUri } = req.body;
    
    try {
      let userInfo: any = null;

      if (provider === 'google') {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID || '',
            client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
          })
        });
        const tokenData: any = await tokenRes.json();
        if (!tokenData.access_token) throw new Error('Failed to get Google access token');

        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const userData: any = await userRes.json();
        userInfo = { name: userData.name, email: userData.email };

      } else if (provider === 'facebook') {
        const tokenRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.FACEBOOK_CLIENT_ID}&redirect_uri=${redirectUri}&client_secret=${process.env.FACEBOOK_CLIENT_SECRET}&code=${code}`);
        const tokenData: any = await tokenRes.json();
        if (!tokenData.access_token) throw new Error('Failed to get Facebook access token');

        const userRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${tokenData.access_token}`);
        const userData: any = await userRes.json();
        userInfo = { name: userData.name, email: userData.email };
      }

      if (!userInfo || !userInfo.email) {
        throw new Error('Could not retrieve user email from provider');
      }

      const userResult = await db.query('SELECT * FROM users WHERE email = $1', [userInfo.email]);
      let user = userResult.rows[0];
      
      if (!user) {
        const result = await db.query(
          'INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [userInfo.name, userInfo.email, 'social_login_no_password', 'customer', 'active']
        );
        const newUserResult = await db.query('SELECT * FROM users WHERE id = $1', [result.rows[0].id]);
        user = newUserResult.rows[0];
      } else if (user.status !== 'active') {
        return res.status(403).json({ error: 'Account is blocked' });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);

    } catch (error: any) {
      console.error('Social auth error:', error);
      res.status(500).json({ error: error.message || 'Social authentication failed' });
    }
  });

  app.get(['/auth/callback/:provider', '/auth/callback/:provider/'], async (req, res) => {
    const { provider } = req.params;
    const { code } = req.query;
    
    if (!code) {
      return res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: 'No code provided' }, '*');
                window.close();
              } else {
                window.location.href = '/login';
              }
            </script>
            <p>Authentication failed. This window should close automatically.</p>
          </body>
        </html>
      `);
    }

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: '${provider}', code: '${code}' }, '*');
              window.close();
            } else {
              window.location.href = '/login';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  });

  // Properties
  app.get("/api/properties", async (req, res) => {
    try {
      const propertiesResult = await db.query(`
        SELECT p.*, u.name as agent_name, u.phone as agent_phone 
        FROM properties p 
        JOIN users u ON p.agent_id = u.id
      `);
      
      const propertiesWithImages = await Promise.all(propertiesResult.rows.map(async (p: any) => {
        const imagesResult = await db.query('SELECT image_url FROM property_images WHERE property_id = $1', [p.id]);
        return { ...p, images: imagesResult.rows.map((i: any) => i.image_url) };
      }));
      
      res.json(propertiesWithImages);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/properties/agent/:id", async (req, res) => {
    try {
      const propertiesResult = await db.query('SELECT * FROM properties WHERE agent_id = $1', [req.params.id]);
      const propertiesWithImages = await Promise.all(propertiesResult.rows.map(async (p: any) => {
        const imagesResult = await db.query('SELECT image_url FROM property_images WHERE property_id = $1', [p.id]);
        return { ...p, images: imagesResult.rows.map((i: any) => i.image_url) };
      }));
      res.json(propertiesWithImages);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/properties", async (req, res) => {
    const { agent_id, title, description, price, location, pincode, bhk_type, bathrooms, images, status } = req.body;
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const insertPropResult = await client.query(`
        INSERT INTO properties (agent_id, title, description, price, location, pincode, bhk_type, bathrooms, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
      `, [agent_id, title, description, price, location, pincode, bhk_type, bathrooms, status || 'available']);
      
      const propertyId = insertPropResult.rows[0].id;
      
      if (images && Array.isArray(images)) {
        for (const img of images) {
          await client.query('INSERT INTO property_images (property_id, image_url) VALUES ($1, $2)', [propertyId, img]);
        }
      }
      await client.query('COMMIT');
      res.json({ id: propertyId });
    } catch (err: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.put("/api/properties/:id", async (req, res) => {
    const { title, description, price, location, pincode, bhk_type, bathrooms, images, status } = req.body;
    const propertyId = req.params.id;
    const client = await db.connect();

    try {
      await client.query('BEGIN');
      await client.query(`
        UPDATE properties 
        SET title = $1, description = $2, price = $3, location = $4, pincode = $5, bhk_type = $6, bathrooms = $7, status = $8
        WHERE id = $9
      `, [title, description, price, location, pincode, bhk_type, bathrooms, status, propertyId]);
      
      if (images && Array.isArray(images)) {
        await client.query('DELETE FROM property_images WHERE property_id = $1', [propertyId]);
        for (const img of images) {
          await client.query('INSERT INTO property_images (property_id, image_url) VALUES ($1, $2)', [propertyId, img]);
        }
      }
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.post("/api/properties/:id/view", async (req, res) => {
    try {
      await db.query('UPDATE properties SET views = COALESCE(views, 0) + 1 WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Interests / Leads
  app.get("/api/user/interests/:userId", async (req, res) => {
    try {
      const interests = await db.query('SELECT property_id, type FROM interests WHERE user_id = $1', [req.params.userId]);
      res.json(interests.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/interests", async (req, res) => {
    const { property_id, user_id, type } = req.body;
    try {
      const existing = await db.query('SELECT * FROM interests WHERE property_id = $1 AND user_id = $2 AND type = $3', [property_id, user_id, type]);
      
      if (existing.rows.length === 0) {
        await db.query('INSERT INTO interests (property_id, user_id, type) VALUES ($1, $2, $3)', [property_id, user_id, type]);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/agent/leads/:agentId", async (req, res) => {
    try {
      const leads = await db.query(`
        SELECT 
          i.type, 
          i.created_at,
          p.title as property_title,
          (SELECT image_url FROM property_images WHERE property_id = p.id LIMIT 1) as property_image,
          u.name as user_name,
          u.email as user_email,
          u.phone as user_phone,
          u.role as user_role
        FROM interests i
        JOIN properties p ON i.property_id = p.id
        JOIN users u ON i.user_id = u.id
        WHERE p.agent_id = $1
        ORDER BY i.created_at DESC
      `, [req.params.agentId]);
      res.json(leads.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/property/leads/:propertyId", async (req, res) => {
    try {
      const leads = await db.query(`
        SELECT 
          i.type, 
          i.created_at,
          p.title as property_title,
          (SELECT image_url FROM property_images WHERE property_id = p.id LIMIT 1) as property_image,
          u.name as user_name,
          u.email as user_email,
          u.phone as user_phone,
          u.role as user_role
        FROM interests i
        JOIN properties p ON i.property_id = p.id
        JOIN users u ON i.user_id = u.id
        WHERE p.id = $1
        ORDER BY i.created_at DESC
      `, [req.params.propertyId]);
      res.json(leads.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Routes
  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await db.query(`
        SELECT u.id, u.name, u.email, u.role, u.phone, u.status, u.created_at, COUNT(p.id) as ads_count 
        FROM users u 
        LEFT JOIN properties p ON u.id = p.agent_id 
        GROUP BY u.id 
        ORDER BY u.created_at DESC
      `);
      res.json(users.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/admin/users/:id/status", async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    try {
      await db.query('UPDATE users SET status = $1 WHERE id = $2', [status, id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    const { id } = req.params;
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const properties = await client.query('SELECT id FROM properties WHERE agent_id = $1', [id]);
      for (const prop of properties.rows) {
        await client.query('DELETE FROM property_images WHERE property_id = $1', [prop.id]);
        await client.query('DELETE FROM interests WHERE property_id = $1', [prop.id]);
      }
      await client.query('DELETE FROM properties WHERE agent_id = $1', [id]);
      await client.query('DELETE FROM interests WHERE user_id = $1', [id]);
      await client.query('DELETE FROM users WHERE id = $1', [id]);
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.get("/api/admin/properties", async (req, res) => {
    try {
      const propertiesResult = await db.query(`
        SELECT p.*, u.name as agent_name, u.email as agent_email, u.phone as agent_phone,
        (SELECT COUNT(*) FROM interests WHERE property_id = p.id) as interest_count
        FROM properties p 
        JOIN users u ON p.agent_id = u.id
        ORDER BY p.created_at DESC
      `);
      
      const propertiesWithImages = await Promise.all(propertiesResult.rows.map(async (p: any) => {
        const imagesResult = await db.query('SELECT image_url FROM property_images WHERE property_id = $1', [p.id]);
        return { ...p, images: imagesResult.rows.map((i: any) => i.image_url) };
      }));

      res.json(propertiesWithImages);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/properties/:id", async (req, res) => {
    const { id } = req.params;
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM property_images WHERE property_id = $1', [id]);
      await client.query('DELETE FROM interests WHERE property_id = $1', [id]);
      await client.query('DELETE FROM properties WHERE id = $1', [id]);
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    try {
      const totalUsers = await db.query('SELECT count(*) as count FROM users');
      const totalProperties = await db.query('SELECT count(*) as count FROM properties');
      const totalAgents = await db.query("SELECT count(*) as count FROM users WHERE role = 'agent'");
      const totalCustomers = await db.query("SELECT count(*) as count FROM users WHERE role = 'customer'");
      const totalVisitors = await db.query('SELECT count(*) as count FROM visitors');
      const indiaVisitors = await db.query("SELECT count(*) as count FROM visitors WHERE country = 'IN' OR country = 'India'");
      
      res.json({
        totalUsers: parseInt(totalUsers.rows[0].count),
        totalProperties: parseInt(totalProperties.rows[0].count),
        totalAgents: parseInt(totalAgents.rows[0].count),
        totalCustomers: parseInt(totalCustomers.rows[0].count),
        totalVisitors: parseInt(totalVisitors.rows[0].count),
        indiaVisitors: parseInt(indiaVisitors.rows[0].count)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/track-visitor", async (req, res) => {
    try {
      let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      if (Array.isArray(ip)) ip = ip[0];
      if (typeof ip === 'string' && ip.includes(',')) ip = ip.split(',')[0];
      
      if (ip === '::1' || ip === '127.0.0.1' || ip === 'unknown') {
        return res.json({ success: true, message: 'Ignored local IP' });
      }

      const existing = await db.query('SELECT id FROM visitors WHERE ip_address = $1', [ip]);
      if (existing.rows.length > 0) {
        return res.json({ success: true, message: 'Already tracked' });
      }

      let city = 'Unknown';
      let region = 'Unknown';
      let country = 'Unknown';
      
      try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        if (response.ok) {
          const data = await response.json();
          city = data.city || 'Unknown';
          region = data.region || 'Unknown';
          country = data.country_name || data.country || 'Unknown';
        }
      } catch (e) {
        console.error('Error fetching IP data:', e);
      }

      await db.query(`
        INSERT INTO visitors (ip_address, city, region, country) 
        VALUES ($1, $2, $3, $4) 
        ON CONFLICT (ip_address) DO NOTHING
      `, [ip, city, region, country]);
      
      res.json({ success: true });
    } catch (err: any) {
      console.error('Visitor tracking error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/visitors", async (req, res) => {
    try {
      const visitors = await db.query('SELECT * FROM visitors ORDER BY visited_at DESC');
      res.json(visitors.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
