import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@libsql/client';
import jwt from 'jsonwebtoken';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;
const SECRET_KEY = 'analu_secret_2026';

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

// Database Setup (LibSQL for Turso or local SQLite)
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:portfolio.db',
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Database schema initialization
async function initDb() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        category TEXT,
        cover_url TEXT,
        tags TEXT,
        sort_order INTEGER DEFAULT 0,
        subtitle TEXT
      );
    `);
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS project_blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        type TEXT,
        content TEXT,
        sort_order INTEGER,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
      );
    `);
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS client_logos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_url TEXT,
        name TEXT
      );
    `);
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS experiences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company TEXT,
        role TEXT,
        logo_url TEXT,
        sort_order INTEGER DEFAULT 0
      );
    `);
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,
        name TEXT,
        description TEXT,
        icon TEXT,
        sort_order INTEGER DEFAULT 0
      );
    `);

    // Column updates (tolerating existing columns in LibSQL)
    try { await db.execute('ALTER TABLE experiences ADD COLUMN logo_url TEXT'); } catch (e) {}
    try { await db.execute('ALTER TABLE projects ADD COLUMN sort_order INTEGER DEFAULT 0'); } catch (e) {}
    try { await db.execute('ALTER TABLE projects ADD COLUMN subtitle TEXT'); } catch (e) {}
    try { await db.execute('ALTER TABLE experiences ADD COLUMN sort_order INTEGER DEFAULT 0'); } catch (e) {}
    try { await db.execute('ALTER TABLE skills ADD COLUMN sort_order INTEGER DEFAULT 0'); } catch (e) {}

    // Seed initial settings
    const aboutText = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['about_text'] });
    if (aboutText.rows.length === 0) {
      await db.execute({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
        args: ['about_text', 'Olá, eu sou a Analu. Sou designer gráfica apaixonada por criar identidades visuais com propósito e capturar a essência das marcas através da fotografia e do design.']
      });
    }

    const profilePhoto = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['profile_photo'] });
    if (profilePhoto.rows.length === 0) {
      await db.execute({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
        args: ['profile_photo', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80']
      });
    }

    // Seed admin credentials
    const adminUser = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['admin_user'] });
    if (adminUser.rows.length === 0) {
      await db.execute({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
        args: ['admin_user', process.env.ADMIN_USER || 'admin']
      });
    }

    const adminPass = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['admin_pass'] });
    if (adminPass.rows.length === 0) {
      await db.execute({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
        args: ['admin_pass', process.env.ADMIN_PASS || 'analu2026']
      });
    }

    // Seed cleanup logic
    const hasWiped = await db.execute({ sql: "SELECT value FROM settings WHERE key = 'test_data_wiped'", args: [] });
    if (hasWiped.rows.length === 0) {
      await db.execute('DELETE FROM client_logos');
      try { await db.execute('DELETE FROM experiences'); } catch(e) {}
      try { await db.execute('DELETE FROM skills'); } catch(e) {}
      await db.execute({ sql: "INSERT INTO settings (key, value) VALUES ('test_data_wiped', 'true')", args: [] });
      console.log("🧹 FAXINA CONCLUÍDA: Logos, Experiências e Skills de teste foram removidos!");
    }
  } catch (err) {
    console.error("Erro na inicialização do banco:", err);
  }
}

// Authentication Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log("Falha na autenticação: Token não fornecido");
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    jwt.verify(token, SECRET_KEY);
    next();
  } catch (err) {
    console.log("Falha na autenticação: Token inválido");
    res.status(401).json({ error: 'Invalid token' });
  }
};

// API Routes
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const dbUserRes = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['admin_user'] });
    const dbPassRes = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['admin_pass'] });

    const adminUser = (dbUserRes.rows[0]?.value as string) || process.env.ADMIN_USER || 'admin';
    const adminPass = (dbPassRes.rows[0]?.value as string) || process.env.ADMIN_PASS || 'analu2026';

    if (username === adminUser && password === adminPass) {
      const token = jwt.sign({ user: username }, SECRET_KEY, { expiresIn: '24h' });
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Credenciais inválidas' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Update credentials route
app.put('/api/admin/credentials', authenticate, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }

    await db.execute({ sql: 'UPDATE settings SET value = ? WHERE key = ?', args: [username, 'admin_user'] });
    await db.execute({ sql: 'UPDATE settings SET value = ? WHERE key = ?', args: [password, 'admin_pass'] });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar credenciais' });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.execute('SELECT * FROM settings');
    const result = settings.rows.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }), {});
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao obter configurações' });
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const projects = await db.execute('SELECT * FROM projects ORDER BY sort_order ASC, id DESC');
    res.json(projects.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao obter projetos' });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await db.execute({ sql: 'SELECT * FROM projects WHERE id = ?', args: [req.params.id] });
    if (project.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const blocks = await db.execute({ sql: 'SELECT * FROM project_blocks WHERE project_id = ? ORDER BY sort_order ASC', args: [req.params.id] });
    
    res.json({ ...(project.rows[0] as any), blocks: blocks.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao obter projeto' });
  }
});

app.post('/api/projects', authenticate, async (req, res) => {
  try {
    const { title, subtitle, category, cover_url, tags, blocks } = req.body;
    
    const info = await db.execute({
      sql: 'INSERT INTO projects (title, subtitle, category, cover_url, tags) VALUES (?, ?, ?, ?, ?)',
      args: [title, subtitle || '', category, cover_url, tags || '']
    });
    
    const projectId = info.lastInsertRowid;
    if (projectId === undefined) throw new Error('Falha ao obter ID do projeto inserido');
    
    if (blocks && Array.isArray(blocks)) {
      for (let index = 0; index < blocks.length; index++) {
        const b = blocks[index];
        await db.execute({
          sql: 'INSERT INTO project_blocks (project_id, type, content, sort_order) VALUES (?, ?, ?, ?)',
          args: [Number(projectId), b.type, b.content, index]
        });
      }
    }
    
    res.json({ success: true, id: Number(projectId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar projeto' });
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
    
    // Delete old blocks
    await db.execute({ sql: 'DELETE FROM project_blocks WHERE project_id=?', args: [projectId] });
    
    // Insert new blocks
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar projeto' });
  }
});

app.delete('/api/projects/:id', authenticate, async (req, res) => {
  console.log("Servidor recebeu pedido para deletar projeto:", req.params.id);
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
  
  try {
    const projectRes = await db.execute({ sql: 'SELECT cover_url FROM projects WHERE id = ?', args: [id] });
    const project = projectRes.rows[0];
    if (project && project.cover_url) {
      await delete_from_cloudinary(project.cover_url as string);
    }
    
    const blocksRes = await db.execute({ sql: 'SELECT content, type FROM project_blocks WHERE project_id = ?', args: [id] });
    const blocks = blocksRes.rows;
    for (const block of blocks) {
      if (block.type === 'image' && block.content) {
        await delete_from_cloudinary(block.content as string);
      }
    }

    // Explicitly delete associated blocks first (cascade fallback)
    await db.execute({ sql: 'DELETE FROM project_blocks WHERE project_id = ?', args: [id] });
    
    // Delete from database
    await db.execute({ sql: 'DELETE FROM projects WHERE id = ?', args: [id] });
    
    res.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Erro interno ao deletar projeto' });
  }
});

// Logos API Routes
app.get('/api/logos', async (req, res) => {
  try {
    const logos = await db.execute('SELECT * FROM client_logos ORDER BY id DESC');
    res.json(logos.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao obter logos' });
  }
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao adicionar logo' });
  }
});

app.delete('/api/logos/:id', authenticate, async (req, res) => {
  console.log("Servidor recebeu pedido para deletar logo:", req.params.id);
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
  
  try {
    const logoRes = await db.execute({ sql: 'SELECT image_url FROM client_logos WHERE id = ?', args: [id] });
    const logo = logoRes.rows[0];
    if (logo && logo.image_url) {
      await delete_from_cloudinary(logo.image_url as string);
    }

    await db.execute({ sql: 'DELETE FROM client_logos WHERE id = ?', args: [id] });
    res.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({ error: 'Erro interno ao deletar logo' });
  }
});

// Experiences API Routes
app.get('/api/experiences', async (req, res) => {
  try {
    const experiences = await db.execute('SELECT * FROM experiences ORDER BY sort_order ASC, id ASC');
    res.json(experiences.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao obter experiências' });
  }
});

app.post('/api/experiences', authenticate, async (req, res) => {
  try {
    const { company, role, logo_url } = req.body;
    if (!company || !role) return res.status(400).json({ error: 'Company and role are required' });
    
    const info = await db.execute({
      sql: 'INSERT INTO experiences (company, role, logo_url) VALUES (?, ?, ?)',
      args: [company, role, logo_url || '']
    });
    
    res.json({ success: true, id: Number(info.lastInsertRowid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao adicionar experiência' });
  }
});

app.delete('/api/experiences/:id', authenticate, async (req, res) => {
  console.log("Servidor recebeu pedido para deletar experiência:", req.params.id);
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
  
  try {
    const expRes = await db.execute({ sql: 'SELECT logo_url FROM experiences WHERE id = ?', args: [id] });
    const exp = expRes.rows[0];
    if (exp && exp.logo_url) {
      await delete_from_cloudinary(exp.logo_url as string);
    }

    await db.execute({ sql: 'DELETE FROM experiences WHERE id = ?', args: [id] });
    res.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Error deleting experience:', error);
    res.status(500).json({ error: 'Erro interno ao deletar experiência' });
  }
});

// Skills API Routes
app.get('/api/skills', async (req, res) => {
  try {
    const skills = await db.execute('SELECT * FROM skills ORDER BY sort_order ASC, id ASC');
    res.json(skills.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao obter skills' });
  }
});

app.post('/api/skills', authenticate, async (req, res) => {
  try {
    const { category, name, description, icon } = req.body;
    if (!category || !name || !icon) return res.status(400).json({ error: 'Category, name and icon are required' });
    
    const info = await db.execute({
      sql: 'INSERT INTO skills (category, name, description, icon) VALUES (?, ?, ?, ?)',
      args: [category, name, description || '', icon]
    });
    
    res.json({ success: true, id: Number(info.lastInsertRowid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao adicionar skill' });
  }
});

app.delete('/api/skills/:id', authenticate, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
  
  try {
    await db.execute({ sql: 'DELETE FROM skills WHERE id = ?', args: [id] });
    res.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Error deleting skill:', error);
    res.status(500).json({ error: 'Erro interno ao deletar skill' });
  }
});

// Reorder API Route
app.put('/api/reorder/:type', authenticate, async (req, res) => {
  const { type } = req.params;
  const { items } = req.body;
  
  if (!['projects', 'experiences', 'skills'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }

  try {
    const queries = items.map((item: any) => ({
      sql: `UPDATE ${type} SET sort_order = ? WHERE id = ?`,
      args: [item.sort_order, item.id]
    }));

    await db.batch(queries, "write");
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao reordenar itens' });
  }
});

// Vite Middleware for Frontend / Local Running
async function startServer() {
  await initDb();

  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
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

  // Only run standard listener when not on Vercel
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;