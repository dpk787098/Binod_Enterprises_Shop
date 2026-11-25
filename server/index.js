import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new Low(new JSONFile(path.join(dataDir, 'shop.json')), {
  users: [], products: [], sales: [], purchases: [], syncEvents: []
});
await db.read();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('JWT_SECRET is required and must contain at least 32 characters');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.WEB_ORIGIN ? process.env.WEB_ORIGIN.split(',') : true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));

const sign = user => jwt.sign({ sub: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '8h' });
const auth = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); } catch { res.status(401).json({ error: 'Invalid or expired session' }); }
};
const requireRole = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Permission denied' });

if (!db.data.users.length) {
  db.data.users = [
    { id: 'owner', name: 'Owner', username: 'owner', passwordHash: await bcrypt.hash('owner123', 12), role: 'owner' },
    { id: 'admin', name: 'Admin', username: 'admin', passwordHash: await bcrypt.hash('admin123', 12), role: 'admin' },
    { id: 'user', name: 'User', username: 'user', passwordHash: await bcrypt.hash('user123', 12), role: 'user' }
  ];
  await db.write();
}

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.post('/api/auth/login', async (req, res) => {
  const parsed = z.object({ username: z.string().trim().min(1).max(100), password: z.string().min(1).max(200) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid login details' });
  await db.read();
  const user = db.data.users.find(u => u.username.toLowerCase() === parsed.data.username.toLowerCase());
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return res.status(401).json({ error: 'Invalid username or password' });
  res.json({ token: sign(user), user: { id: user.id, name: user.name, username: user.username, role: user.role } });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.data.users.find(u => u.id === req.user.sub);
  if (!user) return res.status(401).json({ error: 'Account no longer exists' });
  res.json({ id: user.id, name: user.name, username: user.username, role: user.role });
});

app.get('/api/users', auth, requireRole('owner'), (_req, res) => res.json(db.data.users.map(({ passwordHash, ...u }) => u)));
app.post('/api/users', auth, requireRole('owner'), async (req, res) => {
  const parsed = z.object({ name: z.string().trim().min(1).max(100), username: z.string().trim().min(3).max(100), password: z.string().min(8).max(200), role: z.enum(['owner', 'admin', 'user']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  await db.read();
  if (db.data.users.some(u => u.username.toLowerCase() === parsed.data.username.toLowerCase())) return res.status(409).json({ error: 'Username already exists' });
  const user = { id: crypto.randomUUID(), name: parsed.data.name, username: parsed.data.username, passwordHash: await bcrypt.hash(parsed.data.password, 12), role: parsed.data.role };
  db.data.users.push(user); await db.write();
  const { passwordHash, ...safe } = user; res.status(201).json(safe);
});
app.delete('/api/users/:id', auth, requireRole('owner'), async (req, res) => {
  await db.read();
  if (req.params.id === 'owner') return res.status(400).json({ error: 'The initial owner account cannot be deleted' });
  db.data.users = db.data.users.filter(u => u.id !== req.params.id); await db.write(); res.status(204).end();
});

const decimal = z.coerce.number().finite().min(0);
const productSchema = z.object({
  productId: z.string().trim().min(1).max(100), name: z.string().trim().min(1).max(100), use: z.string().trim().min(1).max(100), brand: z.string().trim().min(1).max(100),
  unit: z.enum(['KG','PCS','Ltr','Bottle','Can','Jar','Bucket','Dozen','Bag','packet']), stock: decimal, purchase: decimal, selling: decimal,
  comments: z.string().max(100).optional().default(''), extra1: z.string().max(100).optional().default(''), extra2: z.string().max(100).optional().default(''), extra3: z.string().max(100).optional().default('')
});

app.get('/api/products', auth, async (_req, res) => { await db.read(); res.json(db.data.products); });
app.post('/api/products', auth, requireRole('owner', 'admin'), async (req, res) => {
  const parsed = productSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  await db.read(); if (db.data.products.some(p => p.productId === parsed.data.productId)) return res.status(409).json({ error: 'Product ID already exists' });
  const product = { id: crypto.randomUUID(), ...parsed.data, updatedAt: new Date().toISOString() }; db.data.products.push(product); await db.write(); res.status(201).json(product);
});
app.put('/api/products/:id', auth, requireRole('owner', 'admin'), async (req, res) => {
  const parsed = productSchema.partial().safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  await db.read(); const i = db.data.products.findIndex(p => p.id === req.params.id); if (i < 0) return res.status(404).json({ error: 'Product not found' });
  db.data.products[i] = { ...db.data.products[i], ...parsed.data, updatedAt: new Date().toISOString() }; await db.write(); res.json(db.data.products[i]);
});
app.delete('/api/products/:id', auth, requireRole('owner', 'admin'), async (req, res) => { await db.read(); db.data.products = db.data.products.filter(p => p.id !== req.params.id); await db.write(); res.status(204).end(); });

const saleSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), productId: z.string(), qty: decimal.refine(n => n > 0), comments: z.string().max(100).optional().default(''), extra1: z.string().max(100).optional().default(''), extra2: z.string().max(100).optional().default(''), extra3: z.string().max(100).optional().default('') });
app.get('/api/sales', auth, async (req, res) => { await db.read(); const { from, to } = req.query; res.json(db.data.sales.filter(s => (!from || s.date >= from) && (!to || s.date <= to))); });
app.post('/api/sales', auth, async (req, res) => {
  const parsed = saleSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  await db.read(); const product = db.data.products.find(p => p.productId === parsed.data.productId); if (!product) return res.status(404).json({ error: 'Product not found' });
  if (parsed.data.qty > product.stock) return res.status(409).json({ error: 'Insufficient stock' });
  product.stock -= parsed.data.qty;
  const sale = { id: crypto.randomUUID(), ...parsed.data, name: product.name, use: product.use, brand: product.brand, unit: product.unit, rate: product.selling, total: parsed.data.qty * product.selling, createdAt: new Date().toISOString() };
  db.data.sales.push(sale); await db.write(); res.status(201).json(sale);
});

const purchaseSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), productId: z.string(), qty: decimal, unitPrice: decimal, supplier: z.string().max(100).optional().default(''), comments: z.string().max(100).optional().default(''), extra1: z.string().max(100).optional().default(''), extra2: z.string().max(100).optional().default(''), extra3: z.string().max(100).optional().default('') });
app.get('/api/purchases', auth, async (req, res) => { await db.read(); const { from, to } = req.query; res.json(db.data.purchases.filter(p => (!from || p.date >= from) && (!to || p.date <= to))); });
app.post('/api/purchases', auth, async (req, res) => {
  const parsed = purchaseSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  await db.read(); const product = db.data.products.find(p => p.productId === parsed.data.productId); if (!product) return res.status(404).json({ error: 'Product not found' });
  product.stock += parsed.data.qty; product.purchase = parsed.data.unitPrice;
  const purchase = { id: crypto.randomUUID(), ...parsed.data, name: product.name, use: product.use, brand: product.brand, unit: product.unit, total: parsed.data.qty * parsed.data.unitPrice, createdAt: new Date().toISOString() };
  db.data.purchases.push(purchase); await db.write(); res.status(201).json(purchase);
});

app.get('/api/sync', auth, async (req, res) => { await db.read(); res.json({ users: db.data.users.map(({ passwordHash, ...u }) => u), products: db.data.products, sales: db.data.sales, purchases: db.data.purchases, serverTime: new Date().toISOString() }); });

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(root, 'dist')));
  app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
}

const port = Number(process.env.PORT || 8787);
if (process.env.NODE_ENV !== 'test') app.listen(port, '0.0.0.0', () => console.log(`Binod Enterprises API listening on port ${port}`));
export default app;
