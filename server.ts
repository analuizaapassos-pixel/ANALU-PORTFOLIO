import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

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

// Database Setup
const db = new Database('portfolio.db');
db.pragma('foreign_keys = ON');

db.exec(`
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

try {
  db.exec('ALTER TABLE experiences ADD COLUMN logo_url TEXT');
} catch (e) {
  // Column already exists
}

// Seed initial settings
const aboutText = db.prepare('SELECT value FROM settings WHERE key = ?').get('about_text');
if (!aboutText) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(
    'about_text', 
    'Olá, eu sou a Analu. Sou designer gráfica apaixonada por criar identidades visuais com propósito e capturar a essência das marcas através da fotografia e do design.'
  );
}
const profilePhoto = db.prepare('SELECT value FROM settings WHERE key = ?').get('profile_photo');
if (!profilePhoto) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(
    'profile_photo', 
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
  );
}

// --- SCRIPT DE LIMPEZA ÚNICA (One-Time Wipe) ---
try {
  // Verifica se a limpeza já foi feita para não apagar dados reais no futuro
  const hasWiped = db.prepare("SELECT value FROM settings WHERE key = 'test_data_wiped'").get();
  
  if (!hasWiped) {
    // Apaga apenas as tabelas solicitadas (verifique os nomes exatos das suas tabelas de skills e experiences)
    db.prepare('DELETE FROM client_logos').run();
    
    // Deleta experiences se a tabela existir
    try { db.prepare('DELETE FROM experiences').run(); } catch(e) {}
    
    // Deleta skills se a tabela existir
    try { db.prepare('DELETE FROM skills').run(); } catch(e) {}
    
    // Marca na tabela settings que a limpeza foi concluída
    db.prepare("INSERT INTO settings (key, value) VALUES ('test_data_wiped', 'true')").run();
    
    console.log("🧹 FAXINA CONCLUÍDA: Logos, Experiências e Skills de teste foram removidos!");
  }
} catch (error) {
  console.error("Erro no script de limpeza:", error);
}

// --- SCRIPT DE LIMPEZA ÚNICA LOGOS (One-Time Wipe) ---
try {
  const hasWipedLogos = db.prepare("SELECT value FROM settings WHERE key = 'logos_wiped_v1'").get();
  
  if (!hasWipedLogos) {
    db.prepare('DELETE FROM client_logos').run();
    db.prepare("INSERT INTO settings (key, value) VALUES ('logos_wiped_v1', 'true')").run();
    console.log("🧹 FAXINA CONCLUÍDA: Tabela de logos de clientes limpa!");
  }
} catch (error) {
  console.error("Erro no script de limpeza de logos:", error);
}

// Add new columns for sort_order and subtitle
try { db.exec('ALTER TABLE projects ADD COLUMN sort_order INTEGER DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE projects ADD COLUMN subtitle TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE experiences ADD COLUMN sort_order INTEGER DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE skills ADD COLUMN sort_order INTEGER DEFAULT 0'); } catch (e) {}
// ------------------------------------------------

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

app.get('/api/settings', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings').all() as any[];
  const result = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
  res.json(result);
});

app.put('/api/settings', authenticate, (req, res) => {
  const { 
    about_text, profile_photo, 
    contact_email, contact_linkedin, contact_instagram, 
    contact_behance, contact_whatsapp, footer_text 
  } = req.body;
  
  const updateSetting = (key: string, value: any) => {
    if (value !== undefined) {
      const exists = db.prepare('SELECT key FROM settings WHERE key = ?').get(key);
      if (exists) {
        db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(value, key);
      } else {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
      }
    }
  };

  updateSetting('about_text', about_text);
  updateSetting('profile_photo', profile_photo);
  updateSetting('contact_email', contact_email);
  updateSetting('contact_linkedin', contact_linkedin);
  updateSetting('contact_instagram', contact_instagram);
  updateSetting('contact_behance', contact_behance);
  updateSetting('contact_whatsapp', contact_whatsapp);
  updateSetting('footer_text', footer_text);

  res.json({ success: true });
});

app.get('/api/projects', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY sort_order ASC, id DESC').all();
  res.json(projects);
});

app.get('/api/projects/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  const blocks = db.prepare('SELECT * FROM project_blocks WHERE project_id = ? ORDER BY sort_order ASC').all(req.params.id);
  res.json({ ...(project as any), blocks });
});

app.post('/api/projects', authenticate, (req, res) => {
  const { title, subtitle, category, cover_url, tags, blocks } = req.body;
  
  const stmt = db.prepare('INSERT INTO projects (title, subtitle, category, cover_url, tags) VALUES (?, ?, ?, ?, ?)');
  const info = stmt.run(title, subtitle || '', category, cover_url, tags || '');
  const projectId = info.lastInsertRowid;
  
  if (blocks && Array.isArray(blocks)) {
    const blockStmt = db.prepare('INSERT INTO project_blocks (project_id, type, content, sort_order) VALUES (?, ?, ?, ?)');
    blocks.forEach((b: any, index: number) => {
      blockStmt.run(projectId, b.type, b.content, index);
    });
  }
  
  res.json({ success: true, id: projectId });
});

app.put('/api/projects/:id', authenticate, (req, res) => {
  const { title, subtitle, category, cover_url, tags, blocks } = req.body;
  const projectId = req.params.id;
  
  db.prepare('UPDATE projects SET title=?, subtitle=?, category=?, cover_url=?, tags=? WHERE id=?').run(title, subtitle || '', category, cover_url, tags || '', projectId);
  
  // Delete old blocks
  db.prepare('DELETE FROM project_blocks WHERE project_id=?').run(projectId);
  
  // Insert new blocks
  if (blocks && Array.isArray(blocks)) {
    const blockStmt = db.prepare('INSERT INTO project_blocks (project_id, type, content, sort_order) VALUES (?, ?, ?, ?)');
    blocks.forEach((b: any, index: number) => {
      blockStmt.run(projectId, b.type, b.content, index);
    });
  }
  
  res.json({ success: true });
});

app.delete('/api/projects/:id', authenticate, async (req, res) => {
  console.log("Servidor recebeu pedido para deletar projeto:", req.params.id);
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
  
  try {
    const project = db.prepare('SELECT cover_url FROM projects WHERE id = ?').get(id) as any;
    if (project && project.cover_url) {
      await delete_from_cloudinary(project.cover_url);
    }
    
    const blocks = db.prepare('SELECT content, type FROM project_blocks WHERE project_id = ?').all(id) as any[];
    for (const block of blocks) {
      if (block.type === 'image' && block.content) {
        await delete_from_cloudinary(block.content);
      }
    }

    // Explicitly delete associated blocks first (cascade fallback)
    db.prepare('DELETE FROM project_blocks WHERE project_id = ?').run(id);
    
    // Delete from database
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    
    res.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Internal server error during deletion' });
  }
});

// Logos API Routes
app.get('/api/logos', (req, res) => {
  const logos = db.prepare('SELECT * FROM client_logos ORDER BY id DESC').all();
  res.json(logos);
});

app.post('/api/logos', authenticate, (req, res) => {
  const { image_url, name } = req.body;
  if (!image_url) return res.status(400).json({ error: 'Image URL is required' });
  
  const stmt = db.prepare('INSERT INTO client_logos (image_url, name) VALUES (?, ?)');
  const info = stmt.run(image_url, name || '');
  
  res.json({ success: true, id: info.lastInsertRowid, url: image_url });
});

app.delete('/api/logos/:id', authenticate, async (req, res) => {
  console.log("Servidor recebeu pedido para deletar logo:", req.params.id);
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
  
  try {
    const logo = db.prepare('SELECT image_url FROM client_logos WHERE id = ?').get(id) as any;
    if (logo && logo.image_url) {
      await delete_from_cloudinary(logo.image_url);
    }

    db.prepare('DELETE FROM client_logos WHERE id = ?').run(id);
    res.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({ error: 'Internal server error during deletion' });
  }
});

// Experiences API Routes
app.get('/api/experiences', (req, res) => {
  const experiences = db.prepare('SELECT * FROM experiences ORDER BY sort_order ASC, id ASC').all();
  res.json(experiences);
});

app.post('/api/experiences', authenticate, (req, res) => {
  const { company, role, logo_url } = req.body;
  if (!company || !role) return res.status(400).json({ error: 'Company and role are required' });
  
  const stmt = db.prepare('INSERT INTO experiences (company, role, logo_url) VALUES (?, ?, ?)');
  const info = stmt.run(company, role, logo_url || '');
  
  res.json({ success: true, id: info.lastInsertRowid });
});

app.delete('/api/experiences/:id', authenticate, async (req, res) => {
  console.log("Servidor recebeu pedido para deletar experiência:", req.params.id);
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
  
  try {
    const exp = db.prepare('SELECT logo_url FROM experiences WHERE id = ?').get(id) as any;
    if (exp && exp.logo_url) {
      await delete_from_cloudinary(exp.logo_url);
    }

    db.prepare('DELETE FROM experiences WHERE id = ?').run(id);
    res.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Error deleting experience:', error);
    res.status(500).json({ error: 'Internal server error during deletion' });
  }
});

// Skills API Routes
app.get('/api/skills', (req, res) => {
  const skills = db.prepare('SELECT * FROM skills ORDER BY sort_order ASC, id ASC').all();
  res.json(skills);
});

app.post('/api/skills', authenticate, (req, res) => {
  const { category, name, description, icon } = req.body;
  if (!category || !name || !icon) return res.status(400).json({ error: 'Category, name and icon are required' });
  
  const stmt = db.prepare('INSERT INTO skills (category, name, description, icon) VALUES (?, ?, ?, ?)');
  const info = stmt.run(category, name, description || '', icon);
  
  res.json({ success: true, id: info.lastInsertRowid });
});

app.delete('/api/skills/:id', authenticate, (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });
  
  try {
    db.prepare('DELETE FROM skills WHERE id = ?').run(id);
    res.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Error deleting skill:', error);
    res.status(500).json({ error: 'Internal server error during deletion' });
  }
});

// Reorder API Route
app.put('/api/reorder/:type', authenticate, (req, res) => {
  const { type } = req.params;
  const { items } = req.body;
  
  if (!['projects', 'experiences', 'skills'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }

  const stmt = db.prepare(`UPDATE ${type} SET sort_order = ? WHERE id = ?`);
  const updateMany = db.transaction((items) => {
    for (const item of items) {
      stmt.run(item.sort_order, item.id);
    }
  });

  try {
    updateMany(items);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder' });
  }
});

// Vite Middleware for Frontend
async function startServer() {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();