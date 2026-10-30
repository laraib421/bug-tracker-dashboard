const STORAGE_KEY = 'bugboard.bugs';
const STATUSES = ['open', 'progress', 'retest', 'closed'];

const load = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || seed(); } catch { return seed(); }
};
const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bugs)); } catch {} };

function seed() {
  return [
    { id: 'BUG-1', title: 'Login button unresponsive on Safari', steps: '1. Open login\n2. Enter valid creds\n3. Tap Login', severity: 'critical', env: 'Safari 17 / iOS', status: 'open', created: Date.now() },
    { id: 'BUG-2', title: 'Cart badge not updating after remove', steps: 'Add 2 items, remove 1 → badge still 2', severity: 'major', env: 'Chrome 130', status: 'progress', created: Date.now() },
    { id: 'BUG-3', title: 'Typo in footer copyright', steps: 'Scroll to footer', severity: 'trivial', env: 'All', status: 'retest', created: Date.now() },
  ];
}

let bugs = load();
let counter = bugs.reduce((m, b) => Math.max(m, parseInt(b.id.split('-')[1], 10) || 0), 0);

const $ = (s) => document.querySelector(s);
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function render() {
  const q = $('#search').value.toLowerCase();
  const sev = $('#filterSeverity').value;
  document.querySelectorAll('.column').forEach((col) => {
    const list = col.querySelector('.list');
    list.innerHTML = '';
    bugs
      .filter((b) => b.status === col.dataset.status)
      .filter((b) => sev === 'all' || b.severity === sev)
      .filter((b) => !q || (b.title + b.steps + b.id).toLowerCase().includes(q))
      .forEach((b) => list.appendChild(card(b)));
  });
  renderStats();
  save();
}

function card(b) {
  const el = document.createElement('div');
  el.className = `bug ${b.severity}`;
  el.draggable = true;
  el.dataset.id = b.id;
  el.innerHTML = `
    <h4>${escapeHtml(b.title)}</h4>
    <p>${escapeHtml(b.steps)}</p>
    <div class="meta"><span>${b.id} · ${b.severity}${b.env ? ' · ' + escapeHtml(b.env) : ''}</span>
    <button class="del" title="Delete" aria-label="Delete ${b.id}">✕</button></div>`;
  el.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', b.id));
  el.querySelector('.del').addEventListener('click', () => {
    bugs = bugs.filter((x) => x.id !== b.id);
    render();
  });
  return el;
}

function renderStats() {
  const count = (fn) => bugs.filter(fn).length;
  const closed = count((b) => b.status === 'closed');
  const rate = bugs.length ? Math.round((closed / bugs.length) * 100) : 0;
  const items = [
    ['Total', bugs.length],
    ['Open', count((b) => b.status === 'open')],
    ['Critical', count((b) => b.severity === 'critical' && b.status !== 'closed')],
    ['Retest', count((b) => b.status === 'retest')],
    ['Fix rate', rate + '%'],
  ];
  $('#stats').innerHTML = items.map(([l, v]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
}

document.querySelectorAll('.column').forEach((col) => {
  col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('over'); });
  col.addEventListener('dragleave', () => col.classList.remove('over'));
  col.addEventListener('drop', (e) => {
    e.preventDefault();
    col.classList.remove('over');
    const bug = bugs.find((b) => b.id === e.dataTransfer.getData('text/plain'));
    if (bug && STATUSES.includes(col.dataset.status)) { bug.status = col.dataset.status; render(); }
  });
});

$('#bugForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = $('#title').value.trim();
  const steps = $('#steps').value.trim();
  if (!title || !steps) return;
  bugs.push({ id: `BUG-${++counter}`, title, steps, severity: $('#severity').value, env: $('#env').value.trim(), status: 'open', created: Date.now() });
  e.target.reset();
  $('#severity').value = 'minor';
  render();
});

$('#exportBtn').addEventListener('click', () => {
  const header = ['id', 'title', 'steps', 'severity', 'env', 'status'];
  const csv = [header.join(',')]
    .concat(bugs.map((b) => header.map((h) => `"${String(b[h] ?? '').replace(/"/g, '""')}"`).join(',')))
    .join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'bug-report.csv';
  a.click();
});

$('#search').addEventListener('input', render);
$('#filterSeverity').addEventListener('change', render);
render();
