import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@libsql/client';
import jwt from 'jsonwebtoken';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

const app = express();
const PORT = 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'analu_secret_2026';

// CLOUDINARY CONFIGURATION
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'ds0o82lax',
  api_key: process.env.CLOUDINARY_API_KEY || 'YOUR_API_KEY',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'YOUR_API_SECRET'
});

const delete_from_cloudinary = async (url: string) => {
  if (!url || !url.includes('cloudinary.com')) return;
  try {
    const parts = url.split('/');
    const filename = parts.pop();
    const folder = parts.pop();
    if (filename) {
      const publicId = `${folder}/${filename.split('.')[0]}`;
      await cloudinary.uploader.destroy(publicId);
      console.log(`Deleted from Cloudinary: ${publicId}`);
    }
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};

app.use(express.json());

// Database Setup
const db = createClient({
  url: process.env.TURSO_DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN as string,
});

// Initialization Script
(async () => {
  try {
    await db.executeMultiple(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        category TEXT,
        cover_url TEXT,
        tags TEXT
      );
      CREATE TABLE IF NOT EXISTS project_blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        type TEXT,
        content TEXT,
        sort_order INTEGER,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
      CREATE TABLE IF NOT EXISTS client_logos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_url TEXT,
        name TEXT
      );
      CREATE TABLE IF NOT EXISTS experiences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company TEXT,
        role TEXT,
        logo_url TEXT
      );
      CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,
        name TEXT,
        description TEXT,
        icon TEXT
      );
    `);

    try { await db.execute('ALTER TABLE experiences ADD COLUMN logo_url TEXT'); } catch (e) {}
    try { await db.execute('ALTER TABLE projects ADD COLUMN sort_order INTEGER DEFAULT 0'); } catch (e) {}
    try { await db.execute('ALTER TABLE projects ADD COLUMN subtitle TEXT'); } catch (e) {}
    try { await db.execute('ALTER TABLE experiences ADD COLUMN sort_order INTEGER DEFAULT 0'); } catch (e) {}
    try { await db.execute('ALTER TABLE skills ADD COLUMN sort_order INTEGER DEFAULT 0'); } catch (e) {}

    const aboutTextRes = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['about_text'] });
    if (aboutTextRes.rows.length === 0) {
      await db.execute({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?)', 
        args: ['about_text', 'Olá, eu sou a Analu. Sou designer gráfica apaixonada por criar identidades visuais com propósito e capturar a essência das marcas através da fotografia e do design.']
      });
    }

    const profilePhotoRes = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['profile_photo'] });
    if (profilePhotoRes.rows.length === 0) {
      await db.execute({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?)', 
        args: ['profile_photo', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80']
      });
    }

    const hasWiped = await db.execute({ sql: "SELECT value FROM settings WHERE key = ?", args: ['test_data_wiped'] });
    if (hasWiped.rows.length === 0) {
      await db.execute('DELETE FROM client_logos');
      try { await db.execute('DELETE FROM experiences'); } catch(e) {}
      try { await db.execute('DELETE FROM skills'); } catch(e) {}
      await db.execute({ sql: "INSERT INTO settings (key, value) VALUES (?, ?)", args: ['test_data_wiped', 'true'] });
      console.log("🧹 FAXINA CONCLUÍDA: Logos, Experiências e Skills de teste foram removidos!");
    }

    const hasWipedLogos = await db.execute({ sql: "SELECT value FROM settings WHERE key = ?", args: ['logos_wiped_v1'] });
    if (hasWipedLogos.rows.length === 0) {
      await db.execute('DELETE FROM client_logos');
      await db.execute({ sql: "INSERT INTO settings (key, value) VALUES (?, ?)", args: ['logos_wiped_v1', 'true'] });
      console.log("🧹 FAXINA CONCLUÍDA: Tabela de logos de clientes limpa!");
    }
  } catch (err) {
    console.error("Erro na inicialização do DB Turso:", err);
  }
})();

// Authentication Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(token, SECRET_KEY);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'analu2026';

  if (username === adminUser && password === adminPass) {
    const token = jwt.sign({ user: username }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    const settingsReq = await db.execute('SELECT * FROM settings');
    const result = settingsReq.rows.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }), {});
    res.json(result);
  } catch(e) {
    res.status(500).json({error: 'Server error'});
  }
});

app.put('/api/settings', authenticate, async (req, res) => {
  try {
    const { 
      about_text, profile_photo, 
      contact_email, contact_linkedin, contact_instagram, 
      contact_behance, contact_whatsapp, footer_text 
    } = req.body;
    
    const updateSetting = async (key: string, value: any) => {
      if (value !== undefined) {
        const exists = await db.execute({ sql: 'SELECT key FROM settings WHERE key = ?', args: [key] });
        if (exists.rows.length > 0) {
          await db.execute({ sql: 'UPDATE settings SET value = ? WHERE key = ?', args: [value, key] });
        } else {
          await db.execute({ sql: 'INSERT INTO settings (key, value) VALUES (?, ?)', args: [key, value] });
        }
      }
    };

    await updateSetting('about_text', about_text);
    await updateSetting('profile_photo', profile_photo);
    await updateSetting('contact_email', contact_email);
    await updateSetting('contact_linkedin', contact_linkedin);
    await updateSetting('contact_instagram', contact_instagram);
    await updateSetting('contact_behance', contact_behance);
    await updateSetting('contact_whatsapp', contact_whatsapp);
    await updateSetting('footer_text', footer_text);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({error: 'Server error'});
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const projectsReq = await db.execute('SELECT * FROM projects ORDER BY sort_order ASC, id DESC');
    res.json(projectsReq.rows);
  } catch (e) {
    res.status(500).json({error: 'Server error'});
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const projectReq = await db.execute({ sql: 'SELECT * FROM projects WHERE id = ?', args: [req.params.id] });
    if (projectReq.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const blocksReq = await db.execute({ sql: 'SELECT * FROM project_blocks WHERE project_id = ? ORDER BY sort_order ASC', args: [req.params.id] });
    res.json({ ...(projectReq.rows[0]), blocks: blocksReq.rows });
  } catch (e) {
    res.status(500).json({error: 'Server error'});
  }
});

app.post('/api/projects', authenticate, async (req, res) => {
  try {
    const { title, subtitle, category, cover_url, tags, blocks } = req.body;
    const info = await db.execute({
      sql: 'INSERT INTO projects (title, subtitle, category, cover_url, tags) VALUES (?, ?, ?, ?, ?)',
      args: [title, subtitle || '', category, cover_url, tags || '']
    });
    
    // Converte lastInsertRowid de bigint para número para retornar ao frontend pelo request json
    const projectId = Number(info.lastInsertRowid);
    
    if (blocks && Array.isArray(blocks)) {
      for (let index = 0; index < blocks.length; index++) {
        const b = blocks[index];
        await db.execute({
          sql: 'INSERT INTO project_blocks (project_id, type, content, sort_order) VALUES (?, ?, ?, ?)',
          args: [projectId, b.type, b.content, index]
        });
      }
    }
    res.json({ success: true, id: projectId });
  } catch (e) {
    res.status(500).json({error: 'Server error'});
  }
});

app.put('/api/projects/:id', authenticate, async (req, res) => {
  try {
    const { title, subtitle, category, cover_url, tags, blocks } = req.body;
    const projectId = req.params.id;
    
    await db.execute({
      sql: 'UPDATE projects SET title=?, subtitle=?, category=?, cover_url=?, tags=? WHERE id=?',
      args: [title, subtitle || '', category, cover_url, tags || '', projectId]
    });
    
    await db.execute({ sql: 'DELETE FROM project_blocks WHERE project_id=?', args: [projectId] });
    
    if (blocks && Array.isArray(blocks)) {
      for (let index = 0; index < blocks.length; index++) {
        const b = blocks[index];
        await db.execute({
          sql: 'INSERT INTO project_blocks (project_id, type, content, sort_order) VALUES (?, ?, ?, ?)',
          args: [projectId, b.type, b.content, index]
        });
      }
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({error: 'Server error'});
  }
});

app.delete('/api/projects/:id', authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
    
    const projectReq = await db.execute({ sql: 'SELECT cover_url FROM projects WHERE id = ?', args: [id] });
    const project = projectReq.rows[0];
    if (project && project.cover_url) {
      await delete_from_cloudinary(project.cover_url as string);
    }
    
    const blocksReq = await db.execute({ sql: 'SELECT content, type FROM project_blocks WHERE project_id = ?', args: [id] });
    for (const block of blocksReq.rows) {
      if (block.type === 'image' && block.content) {
        await delete_from_cloudinary(block.content as string);
      }
    }

    await db.execute({ sql: 'DELETE FROM project_blocks WHERE project_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM projects WHERE id = ?', args: [id] });
    
    res.json({ success: true, deletedId: id });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during deletion' });
  }
});

app.get('/api/logos', async (req, res) => {
  try {
    const logos = await db.execute('SELECT * FROM client_logos ORDER BY id DESC');
    res.json(logos.rows);
  } catch (e) { res.status(500).json({error: 'Server error'}); }
});

app.post('/api/logos', authenticate, async (req, res) => {
  try {
    const { image_url, name } = req.body;
    if (!image_url) return res.status(400).json({ error: 'Image URL is required' });
    
    const info = await db.execute({
      sql: 'INSERT INTO client_logos (image_url, name) VALUES (?, ?)',
      args: [image_url, name || '']
    });
    res.json({ success: true, id: Number(info.lastInsertRowid), url: image_url });
  } catch (e) { res.status(500).json({error: 'Server error'}); }
});

app.delete('/api/logos/:id', authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
    
    const logoReq = await db.execute({ sql: 'SELECT image_url FROM client_logos WHERE id = ?', args: [id] });
    const logo = logoReq.rows[0];
    if (logo && logo.image_url) {
      await delete_from_cloudinary(logo.image_url as string);
    }

    await db.execute({ sql: 'DELETE FROM client_logos WHERE id = ?', args: [id] });
    res.json({ success: true, deletedId: id });
  } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/experiences', async (req, res) => {
  try {
    const exps = await db.execute('SELECT * FROM experiences ORDER BY sort_order ASC, id ASC');
    res.json(exps.rows);
  } catch (e) { res.status(500).json({error: 'Server error'}); }
});

app.post('/api/experiences', authenticate, async (req, res) => {
  try {
    const { company, role, logo_url } = req.body;
    if (!company || !role) return res.status(400).json({ error: 'Required fields missing' });
    
    const info = await db.execute({
      sql: 'INSERT INTO experiences (company, role, logo_url) VALUES (?, ?, ?)',
      args: [company, role, logo_url || '']
    });
    res.json({ success: true, id: Number(info.lastInsertRowid) });
  } catch (e) { res.status(500).json({error: 'Server error'}); }
});

app.delete('/api/experiences/:id', authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
    
    const expReq = await db.execute({ sql: 'SELECT logo_url FROM experiences WHERE id = ?', args: [id] });
    const exp = expReq.rows[0];
    if (exp && exp.logo_url) {
      await delete_from_cloudinary(exp.logo_url as string);
    }

    await db.execute({ sql: 'DELETE FROM experiences WHERE id = ?', args: [id] });
    res.json({ success: true, deletedId: id });
  } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/skills', async (req, res) => {
  try {
    const skills = await db.execute('SELECT * FROM skills ORDER BY sort_order ASC, id ASC');
    res.json(skills.rows);
  } catch (e) { res.status(500).json({error: 'Server error'}); }
});

app.post('/api/skills', authenticate, async (req, res) => {
  try {
    const { category, name, description, icon } = req.body;
    if (!category || !name || !icon) return res.status(400).json({ error: 'Required fields missing' });
    
    const info = await db.execute({
      sql: 'INSERT INTO skills (category, name, description, icon) VALUES (?, ?, ?, ?)',
      args: [category, name, description || '', icon]
    });
    res.json({ success: true, id: Number(info.lastInsertRowid) });
  } catch (e) { res.status(500).json({error: 'Server error'}); }
});

app.delete('/api/skills/:id', authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
    await db.execute({ sql: 'DELETE FROM skills WHERE id = ?', args: [id] });
    res.json({ success: true, deletedId: id });
  } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

app.put('/api/reorder/:type', authenticate, async (req, res) => {
  try {
    const { type } = req.params;
    const { items } = req.body;
    
    if (!['projects', 'experiences', 'skills'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    const tx = await db.transaction('write');
    try {
      for (const item of items) {
        await tx.execute({
          sql: `UPDATE ${type} SET sort_order = ? WHERE id = ?`,
          args: [item.sort_order, item.id]
        });
      }
      await tx.commit();
      res.json({ success: true });
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder' });
  }
});

// Vite Middleware for Local Frontend
(async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
})();

export default app;