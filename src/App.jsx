import React, { useEffect, useMemo, useState } from 'react';

const TODAY = () => new Date().toISOString().slice(0, 10);
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const uid = () => Math.random().toString(36).slice(2, 10);
const money = n => Number(n || 0).toFixed(2);

const seedUsers = [
  { id: 'owner', name: 'Owner', username: 'owner', password: 'owner123', role: 'owner' },
  { id: 'admin', name: 'Admin', username: 'admin', password: 'admin123', role: 'admin' },
  { id: 'user', name: 'User', username: 'user', password: 'user123', role: 'user' }
];
const seedProducts = [
  { id: '1', productId: '1', name: 'Surf Excel Easy Wash', use: 'Laundry detergent', brand: 'Surf Excel', unit: 'KG', stock: 25, purchase: 180, selling: 220, comments: '', extra1: '', extra2: '', extra3: '' },
  { id: '2', productId: '2', name: 'Dove Soap', use: 'Personal care', brand: 'Dove', unit: 'PCS', stock: 48, purchase: 42, selling: 55, comments: '', extra1: '', extra2: '', extra3: '' }
];

const emptyProduct = () => ({ id: uid(), productId: '', name: '', use: '', brand: '', unit: 'PCS', stock: 0, purchase: 0, selling: 0, comments: '', extra1: '', extra2: '', extra3: '' });

function App() {
  const [users, setUsers] = useState(() => read('bes_users', seedUsers));
  const [products, setProducts] = useState(() => read('bes_products', seedProducts));
  const [sales, setSales] = useState(() => read('bes_sales', []));
  const [purchases, setPurchases] = useState(() => read('bes_purchases', []));
  const [session, setSession] = useState(() => read('bes_session', null));
  const [page, setPage] = useState('Dashboard');
  const [notice, setNotice] = useState('');
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => write('bes_users', users), [users]);
  useEffect(() => write('bes_products', products), [products]);
  useEffect(() => write('bes_sales', sales), [sales]);
  useEffect(() => write('bes_purchases', purchases), [purchases]);
  useEffect(() => write('bes_session', session), [session]);
  useEffect(() => { const on = () => setOnline(true); const off = () => setOnline(false); window.addEventListener('online', on); window.addEventListener('offline', off); return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); }; }, []);
  useEffect(() => { if (notice) { const t = setTimeout(() => setNotice(''), 3000); return () => clearTimeout(t); } }, [notice]);

  const notify = text => setNotice(text);
  if (!session) return <Login users={users} setSession={setSession} />;
  const canManage = ['owner', 'admin'].includes(session.role);

  const updateProduct = (id, patch) => setProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  const removeProduct = id => { if (!canManage) return; setProducts(prev => prev.filter(p => p.id !== id)); notify('Product deleted'); };
  const addProduct = product => { setProducts(prev => [...prev, { ...product, id: uid(), productId: String(prev.length + 1) }]); notify('Product added'); };

  const nav = ['Dashboard', 'Products', 'Stocks', 'Sales', 'Billing', 'Purchases', ...(session.role === 'owner' ? ['Users'] : [])];
  return <div className="shell">
    <aside><div className="brand"><div className="logo">BE</div><div><b>BINOD</b><small>ENTERPRISES</small></div></div>
      <nav>{nav.map(item => <button key={item} className={page === item ? 'active' : ''} onClick={() => setPage(item)}><span>{item === 'Dashboard' ? '▦' : item === 'Products' ? '◫' : item === 'Stocks' ? '▥' : item === 'Sales' ? '↗' : item === 'Billing' ? '▣' : item === 'Purchases' ? '▤' : '♙'}</span>{item}</button>)}</nav>
      <button className="logout" onClick={() => setSession(null)}>⇥ Sign out</button>
    </aside>
    <main>
      <header><div><small>{online ? '● Online' : '● Offline'}</small><h1>{page}</h1></div><div className="profile"><span>{session.name[0]}</span><div><b>{session.name}</b><small>{session.role}</small></div></div></header>
      {notice && <div className="notice">✓ {notice}</div>}
      <section>
        {page === 'Dashboard' && <Dashboard products={products} sales={sales} purchases={purchases} setPage={setPage} />}
        {page === 'Products' && <Products products={products} canManage={canManage} updateProduct={updateProduct} removeProduct={removeProduct} addProduct={addProduct} notify={notify} />}
        {page === 'Stocks' && <Stocks products={products} canManage={canManage} updateProduct={updateProduct} notify={notify} />}
        {page === 'Sales' && <Sales sales={sales} setSales={setSales} products={products} canManage={canManage} updateProduct={updateProduct} notify={notify} />}
        {page === 'Billing' && <Billing products={products} setProducts={setProducts} sales={sales} setSales={setSales} notify={notify} />}
        {page === 'Purchases' && <Purchases purchases={purchases} setPurchases={setPurchases} products={products} setProducts={setProducts} notify={notify} />}
        {page === 'Users' && session.role === 'owner' && <Users users={users} setUsers={setUsers} notify={notify} />}
      </section>
    </main>
  </div>;
}

function Login({ users, setSession }) {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('');
  const submit = e => { e.preventDefault(); const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password); if (!user) return setError('Invalid username or password'); setSession(user); };
  return <div className="login-page"><div className="login-card"><div className="login-logo">BE</div><h2>Binod Enterprises</h2><p>Shop Management</p><form onSubmit={submit}><label>Username<input value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" required /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required /></label>{error && <div className="error">{error}</div>}<button className="primary" type="submit">Sign in</button></form><div className="demo">Demo: owner / owner123 · admin / admin123 · user / user123</div></div></div>;
}

function Dashboard({ products, sales, purchases, setPage }) {
  const today = TODAY();
  const todaySales = sales.filter(s => s.date === today).reduce((n,s) => n + Number(s.total || 0), 0);
  const lowStock = products.filter(p => Number(p.stock) <= 5).length;
  return <><div className="cards"><Card label="Products" value={products.length} detail="Total inventory" /><Card label="Today's Sales" value={`₹${money(todaySales)}`} detail={`${sales.filter(s => s.date === today).length} transactions`} /><Card label="Purchase Value" value={`₹${money(purchases.filter(p => p.date === today).reduce((n,p) => n + Number(p.total || 0), 0))}`} detail="Today's purchases" /><Card label="Low Stock" value={lowStock} detail="5 units or less" warn={lowStock > 0} /></div><div className="grid2"><Panel title="Quick actions"><div className="quick"><button onClick={() => setPage('Billing')}>Create bill</button><button onClick={() => setPage('Purchases')}>Add purchase</button><button onClick={() => setPage('Products')}>View products</button></div></Panel><Panel title="Stock alerts"><Table headers={['Product','Available']} rows={products.filter(p => Number(p.stock) <= 5).slice(0,6).map(p => [p.name, p.stock])}/></Panel></div></>;
}
const Card = ({ label, value, detail, warn }) => <div className={`card ${warn ? 'warn' : ''}`}><small>{label}</small><h2>{value}</h2><span>{detail}</span></div>;
const Panel = ({ title, children }) => <div className="panel"><div className="panel-title">{title}</div>{children}</div>;

function Toolbar({ query, setQuery, children }) { return <div className="toolbar"><input className="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..." />{children}</div>; }
function Table({ headers, rows }) { return <div className="table-wrap"><table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length ? rows : <tr><td colSpan={headers.length} className="empty">No records found</td></tr>}</tbody></table></div>; }

function Products({ products, canManage, updateProduct, removeProduct, addProduct, notify }) {
  const [query,setQuery]=useState(''); const [editing,setEditing]=useState(null); const [form,setForm]=useState(null);
  const filtered=useMemo(()=>products.filter(p=>Object.values(p).join(' ').toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.productId.localeCompare(b.productId)),[products,query]);
  const openNew=()=>setForm(emptyProduct());
  const submit=e=>{e.preventDefault(); if(!form.name||!form.use||!form.brand||form.stock===''||form.purchase===''||form.selling==='') return notify('Please complete required fields'); addProduct(form); setForm(null)};
  return <><Toolbar query={query} setQuery={setQuery}>{canManage&&<button className="primary" onClick={openNew}>＋ Add product</button>}</Toolbar>
  <div className="panel"><Table headers={['ID','Product','Use','Brand','Unit','Stock','Purchase','Selling','Comments','Extra 1','Extra 2','Extra 3',...(canManage?['Actions']:[])]} rows={filtered.map(p=><tr key={p.id}>{editing===p.id?<><td>{p.productId}</td>{['name','use','brand','unit','stock','purchase','selling','comments','extra1','extra2','extra3'].map(k=>{const value=k==='unit'?p[k]:p[k]; return <td key={k}>{k==='unit'?<select value={p[k]} onChange={e=>updateProduct(p.id,{[k]:e.target.value})}>{['KG','PCS','Ltr','Bottle','Can','Jar','Bucket','Dozen','Bag','packet'].map(u=><option key={u}>{u}</option>)}</select>:<input disabled={['stock','purchase','selling'].includes(k)&&!canManage||!canManage&&['name','use','brand','unit','stock','purchase','selling'].includes(k)} value={value??''} onChange={e=>updateProduct(p.id,{[k]:e.target.value})}/>}</td>)}</>:<><td>{p.productId}</td><td><b>{p.name}</b></td><td>{p.use}</td><td>{p.brand}</td><td>{p.unit}</td><td>{p.stock}</td><td>₹{money(p.purchase)}</td><td>₹{money(p.selling)}</td><td>{p.comments}</td><td>{p.extra1}</td><td>{p.extra2}</td><td>{p.extra3}</td></>}{canManage&&<td><button className="icon" onClick={()=>setEditing(editing===p.id?null:p.id)}>{editing===p.id?'✓':'Edit'}</button>{editing!==p.id&&<button className="icon danger" onClick={()=>{if(confirm('Delete this product?'))removeProduct(p.id)}}>Delete</button>}</td>}</tr>)}/></div>
  {form&&<Modal title="Add product" onClose={()=>setForm(null)}><form onSubmit={submit} className="form-grid"><label>Product ID<input value={String(products.length+1)} disabled /></label><label>Product Name*<input maxLength="100" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required /></label><label>Use*<input maxLength="100" value={form.use} onChange={e=>setForm({...form,use:e.target.value})} required /></label><label>Brand Name*<input maxLength="100" value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})} required /></label><label>Unit Type*<select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>{['KG','PCS','Ltr','Bottle','Can','Jar','Bucket','Dozen','Bag','packet'].map(u=><option key={u}>{u}</option>)}</select></label><label>Stocks Available*<input type="number" step="0.01" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} required /></label><label>Unit Purchase Price*<input type="number" step="0.01" value={form.purchase} onChange={e=>setForm({...form,purchase:e.target.value})} required /></label><label>Unit Selling Price*<input type="number" step="0.01" value={form.selling} onChange={e=>setForm({...form,selling:e.target.value})} required /></label>{['comments','extra1','extra2','extra3'].map(k=><label key={k}>{k.replace('extra','Extra ')}<input maxLength="100" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}</form><div className="modal-actions"><button onClick={()=>setForm(null)}>Cancel</button><button className="primary" onClick={submit}>Save product</button></div></Modal>}
  </>;
}

function Stocks({ products, canManage, updateProduct, notify }) { const [q,setQ]=useState(''); const rows=products.filter(p=>Object.values(p).join(' ').toLowerCase().includes(q.toLowerCase())); return <><Toolbar query={q} setQuery={setQ}/><div className="panel"><Table headers={['Product ID','Product','Use','Brand','Unit','Stocks Available','Comments','Extra 1','Extra 2','Extra 3']} rows={rows.map(p=><tr key={p.id}><td>{p.productId}</td><td>{p.name}</td><td>{p.use}</td><td>{p.brand}</td><td>{p.unit}</td><td>{canManage?<input type="number" value={p.stock} onChange={e=>updateProduct(p.id,{stock:e.target.value})}/>:p.stock}</td>{['comments','extra1','extra2','extra3'].map(k=><td key={k}><input maxLength="100" value={p[k]} onChange={e=>updateProduct(p.id,{[k]:e.target.value})}/></td>)}</tr>)}/></div></>; }

function Sales({ sales,setSales,products,canManage,updateProduct,notify }) {
  const [q,setQ]=useState(''); const [from,setFrom]=useState(TODAY()); const [to,setTo]=useState(TODAY()); const [open,setOpen]=useState(false); const [form,setForm]=useState({date:TODAY(),productId:'',qty:1,comments:'',extra1:'',extra2:'',extra3:''});
  const rows=sales.filter(s=>s.date>=from&&s.date<=to&&Object.values(s).join(' ').toLowerCase().includes(q.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date));
  const selected=products.find(p=>p.productId===form.productId);
  const submit=e=>{e.preventDefault(); if(!selected||Number(form.qty)<=0)return notify('Select a product and valid quantity'); if(Number(form.qty)>Number(selected.stock))return notify('Insufficient stock'); const total=Number(selected.selling)*Number(form.qty); setSales(prev=>[...prev,{id:uid(),date:form.date,productId:selected.productId,name:selected.name,use:selected.use,brand:selected.brand,unit:selected.unit,qty:Number(form.qty),rate:selected.selling,total,...form}]); updateProduct(selected.id,{stock:Number(selected.stock)-Number(form.qty)}); setOpen(false); notify('Sale recorded');};
  const exportExcel=()=>{import('xlsx').then(XLSX=>{const ws=XLSX.utils.json_to_sheet(rows);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Sales');XLSX.writeFile(wb,`sales-${from}-to-${to}.xlsx`)})};
  return <><Toolbar query={q} setQuery={setQ}><input type="date" value={from} onChange={e=>setFrom(e.target.value)} /><input type="date" value={to} onChange={e=>setTo(e.target.value)} /><button onClick={exportExcel}>↓ Export Excel</button><button className="primary" onClick={()=>setOpen(true)}>＋ Add sale</button></Toolbar><div className="panel"><Table headers={['Date','Product ID','Product','Qty','Unit','Selling','Total','Comments','Extra 1','Extra 2','Extra 3',...(canManage?['Actions']:[])]} rows={rows.map(s=><tr key={s.id}><td>{s.date}</td><td>{s.productId}</td><td>{s.name}</td><td>{s.qty}</td><td>{s.unit}</td><td>₹{money(s.rate)}</td><td>₹{money(s.total)}</td>{['comments','extra1','extra2','extra3'].map(k=><td key={k}><input maxLength="100" value={s[k]||''} onChange={e=>setSales(prev=>prev.map(x=>x.id===s.id?{...x,[k]:e.target.value}:x))}/></td>)}{canManage&&<td><button className="icon danger" onClick={()=>{if(confirm('Delete sale record?'))setSales(prev=>prev.filter(x=>x.id!==s.id))}}>Delete</button></td>}</tr>)}/></div>{open&&<Modal title="Add sales data" onClose={()=>setOpen(false)}><form onSubmit={submit} className="form-grid"><label>Sales Date<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required /></label><label>Product<select value={form.productId} onChange={e=>setForm({...form,productId:e.target.value})}><option value="">Select product</option>{products.map(p=><option key={p.id} value={p.productId}>{p.name}</option>)}</select></label><label>Quantity<input type="number" min="0.01" step="0.01" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} required /></label><label>Brand<input value={selected?.brand||''} disabled /></label><label>Unit<input value={selected?.unit||''} disabled /></label><label>Available Stock<input value={selected?.stock||0} disabled /></label>{['comments','extra1','extra2','extra3'].map(k=><label key={k}>{k}<input maxLength="100" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}</form><div className="modal-actions"><button onClick={()=>setOpen(false)}>Cancel</button><button className="primary" onClick={submit}>Save sale</button></div></Modal>}</>;
}

function Billing({ products,setProducts,sales,setSales,notify }) {
  const [cart,setCart]=useState([]); const [query,setQuery]=useState(''); const [qty,setQty]=useState(1); const [discount,setDiscount]=useState(0); const [selected,setSelected]=useState('');
  const p=products.find(x=>x.productId===selected); const total=p?Number(p.selling)*Number(qty)*(1-Number(discount)/100):0;
  const add=()=>{if(!p||qty<=0||qty>p.stock)return notify(qty>p.stock?'Insufficient stock':'Enter valid quantity');setCart(prev=>[...prev,{key:uid(),product:p,qty:Number(qty),discount:Number(discount),total}]);setQty(1);setDiscount(0);setSelected('')};
  const grand=cart.reduce((n,x)=>n+x.total,0);
  const checkout=()=>{if(!cart.length)return notify('Add at least one item'); const date=TODAY();cart.forEach(x=>{setProducts(prev=>prev.map(p=>p.id===x.product.id?{...p,stock:Number(p.stock)-x.qty}:p));setSales(prev=>[...prev,{id:uid(),date,productId:x.product.productId,name:x.product.name,use:x.product.use,brand:x.product.brand,unit:x.product.unit,qty:x.qty,rate:x.product.selling,total:x.total,discount:x.discount,comments:'',extra1:'',extra2:'',extra3:''}])});setCart([]);notify('Bill generated successfully')};
  return <div className="billing"><div className="panel"><div className="panel-title">Add items</div><div className="billing-form"><input className="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search product"/><select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Select product</option>{products.filter(p=>`${p.name} ${p.brand}`.toLowerCase().includes(query.toLowerCase())).map(p=><option key={p.id} value={p.productId}>{p.name} — {p.brand}</option>)}</select><label>Qty<input type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)}/></label><label>Discount %<input type="number" min="0" max="100" value={discount} onChange={e=>setDiscount(e.target.value)}/></label><button className="primary" onClick={add}>Add</button></div>{p&&<div className="bill-info"><span>Brand: <b>{p.brand}</b></span><span>Unit: <b>{p.unit}</b></span><span>Price: <b>₹{money(p.selling)}</b></span><span>Total: <b>₹{money(total)}</b></span></div>}</div><div className="panel"><div className="panel-title">Current bill</div><Table headers={['Product','Qty','Discount','Amount','']} rows={cart.map(x=><tr key={x.key}><td>{x.product.name}</td><td>{x.qty}</td><td>{x.discount}%</td><td>₹{money(x.total)}</td><td><button className="icon danger" onClick={()=>setCart(prev=>prev.filter(y=>y.key!==x.key))}>Remove</button></td></tr>)}/><div className="grand"><span>Grand Total</span><b>₹{money(grand)}</b></div><button className="checkout" onClick={checkout}>Generate bill</button></div></div>;
}

function Purchases({ purchases,setPurchases,products,setProducts,notify }) {
  const [q,setQ]=useState(''); const [from,setFrom]=useState(TODAY()); const [to,setTo]=useState(TODAY()); const [open,setOpen]=useState(false); const [supplier,setSupplier]=useState(''); const [form,setForm]=useState({date:TODAY(),productId:'',qty:0,unitPrice:0,comments:'',extra1:'',extra2:'',extra3:''});
  const p=products.find(x=>x.productId===form.productId); const total=Number(form.qty)*Number(form.unitPrice);
  const rows=purchases.filter(x=>x.date>=from&&x.date<=to&&`${x.name} ${x.brand} ${x.supplier||''}`.toLower?.(q) !== undefined).filter(x=>Object.values(x).join(' ').toLowerCase().includes(q.toLowerCase()));
  const submit=e=>{e.preventDefault();if(!p||Number(form.qty)<0||Number(form.unitPrice)<0)return notify('Complete required purchase details');setPurchases(prev=>[...prev,{id:uid(),date:form.date,sno:prev.length+1,productId:p.productId,name:p.name,use:p.use,brand:p.brand,unit:p.unit,qty:Number(form.qty),unitPrice:Number(form.unitPrice),total,supplier,comments:form.comments,extra1:form.extra1,extra2:form.extra2,extra3:form.extra3}]);setProducts(prev=>prev.map(x=>x.id===p.id?{...x,stock:Number(x.stock)+Number(form.qty),purchase:Number(form.unitPrice)}:x));setOpen(false);notify('Purchase recorded and stock updated')};
  return <><Toolbar query={q} setQuery={setQ}><input type="date" value={from} onChange={e=>setFrom(e.target.value)} /><input type="date" value={to} onChange={e=>setTo(e.target.value)} /><button className="primary" onClick={()=>setOpen(true)}>＋ Add purchase</button></Toolbar><div className="panel"><Table headers={['S.No','Date','Product ID','Product','Use','Brand','Unit','Qty','Unit Price','Total','Supplier','Comments','Extra 1','Extra 2','Extra 3']} rows={rows.map((x,i)=><tr key={x.id}><td>{i+1}</td><td>{x.date}</td><td>{x.productId}</td><td>{x.name}</td><td>{x.use}</td><td>{x.brand}</td><td>{x.unit}</td><td>{x.qty}</td><td>₹{money(x.unitPrice)}</td><td>₹{money(x.total)}</td><td>{x.supplier||''}</td><td>{x.comments}</td><td>{x.extra1}</td><td>{x.extra2}</td><td>{x.extra3}</td></tr>)}/></div>{open&&<Modal title="Add purchase" onClose={()=>setOpen(false)}><form onSubmit={submit} className="form-grid"><label>Purchase Date<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required /></label><label>Product Name*<select value={form.productId} onChange={e=>setForm({...form,productId:e.target.value})}><option value="">Select product</option>{products.map(x=><option key={x.id} value={x.productId}>{x.name}</option>)}</select></label><label>Product ID<input value={p?.productId||''} disabled /></label><label>Use<input value={p?.use||''} disabled /></label><label>Brand<input value={p?.brand||''} disabled /></label><label>Unit<input value={p?.unit||''} disabled /></label><label>Purchase Qty*<input type="number" step="0.01" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} required /></label><label>Unit Purchase Price*<input type="number" step="0.01" value={form.unitPrice} onChange={e=>setForm({...form,unitPrice:e.target.value})} required /></label><label>Total Purchase Price<input value={money(total)} disabled /></label><label>Supplier Name<input value={supplier} onChange={e=>setSupplier(e.target.value)} /></label>{['comments','extra1','extra2','extra3'].map(k=><label key={k}>{k}<input maxLength="100" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}</form><div className="modal-actions"><button onClick={()=>setOpen(false)}>Cancel</button><button className="primary" onClick={submit}>Save purchase</button></div></Modal>}</>;
}

function Users({ users,setUsers,notify }) { const [open,setOpen]=useState(false); const [form,setForm]=useState({name:'',username:'',password:'',role:'user'}); const submit=e=>{e.preventDefault();if(users.some(u=>u.username===form.username))return notify('Username already exists');setUsers(prev=>[...prev,{...form,id:uid()}]);setOpen(false);setForm({name:'',username:'',password:'',role:'user'});notify('User created')};return <><Toolbar query="" setQuery={()=>{}}><button className="primary" onClick={()=>setOpen(true)}>＋ Add account</button></Toolbar><div className="panel"><Table headers={['Name','Username','Role','']} rows={users.map(u=><tr key={u.id}><td>{u.name}</td><td>{u.username}</td><td><span className={`role ${u.role}`}>{u.role}</span></td><td>{u.id!=='owner'&&<button className="icon danger" onClick={()=>setUsers(prev=>prev.filter(x=>x.id!==u.id))}>Delete</button>}</td></tr>)}/></div>{open&&<Modal title="Create account" onClose={()=>setOpen(false)}><form onSubmit={submit} className="form-grid"><label>Full Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required /></label><label>Username<input value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required /></label><label>Password<input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required /></label><label>Role<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="owner">Owner</option><option value="admin">Admin</option><option value="user">User</option></select></label></form><div className="modal-actions"><button onClick={()=>setOpen(false)}>Cancel</button><button className="primary" onClick={submit}>Create account</button></div></Modal>}</>; }

function Modal({title,onClose,children}) { return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><h3>{title}</h3><button onClick={onClose}>×</button></div>{children}</div></div>; }

export default App;
