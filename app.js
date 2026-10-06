const GRADIENTS = [
  ['#6366f1', '#8b5cf6'],
  ['#10b981', '#14b8a6'],
  ['#f59e0b', '#f97316'],
  ['#ec4899', '#f43f5e'],
  ['#3b82f6', '#06b6d4'],
  ['#8b5cf6', '#d946ef'],
];

const teamsEl = document.getElementById('teams');
const searchEl = document.getElementById('search');
const statsEl = document.getElementById('stats');

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function str(value) {
  return value == null ? '' : String(value).trim();
}

async function loadTeams() {
  const res = await fetch('teams.yml', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not load teams.yml (HTTP ${res.status}).`);
  let data;
  try {
    data = jsyaml.load(await res.text());
  } catch (e) {
    const line = e.mark ? ` near line ${e.mark.line + 1}` : '';
    throw new Error(`There is a formatting problem in teams.yml${line}.`);
  }
  if (!data || !Array.isArray(data.teams)) {
    throw new Error('teams.yml must contain "teams:" followed by a list of teams.');
  }
  return data.teams.map((t, i) => ({
    name: str(t && t.team) || `Team ${i + 1}`,
    members: (Array.isArray(t && t.members) ? t.members : []).map(str).filter(Boolean),
  }));
}

// Renders text with the matched part wrapped in <mark>, without using innerHTML.
function highlight(node, text, q) {
  node.replaceChildren();
  const i = q ? text.toLowerCase().indexOf(q) : -1;
  if (i < 0) {
    node.textContent = text;
    return;
  }
  node.append(text.slice(0, i), el('mark', null, text.slice(i, i + q.length)), text.slice(i + q.length));
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
}

function render(teams) {
  teamsEl.replaceChildren();

  const people = teams.reduce((n, t) => n + t.members.length, 0);
  statsEl.textContent = `${teams.length} teams \u00b7 ${people} people`;

  teams.forEach((team, i) => {
    const [c1, c2] = GRADIENTS[i % GRADIENTS.length];
    const section = el('section', 'team');
    section.style.setProperty('--c1', c1);
    section.style.setProperty('--c2', c2);
    section.style.setProperty('--i', i);

    const header = el('div', 'team-header');
    header.append(
      el('span', 'team-badge', String(i + 1).padStart(2, '0')),
      el('h2', 'team-name', team.name),
      el('span', 'team-count', `${team.members.length} ${team.members.length === 1 ? 'member' : 'members'}`),
    );

    const list = el('ul', 'members');
    team.members.forEach(name => {
      const li = el('li', 'member');
      li.dataset.name = name;
      li.append(el('span', 'avatar', initials(name)), el('span', 'member-name', name));
      list.append(li);
    });

    section.append(header, list);
    teamsEl.append(section);
  });

  teamsEl.append(el('p', 'status no-results', 'No one found with that name.'));
}

function applySearch() {
  const q = searchEl.value.trim().toLowerCase();
  let anyVisible = false;

  teamsEl.querySelectorAll('.team').forEach(section => {
    let matches = 0;
    section.querySelectorAll('.member').forEach(li => {
      const show = !q || li.dataset.name.toLowerCase().includes(q);
      li.hidden = !show;
      highlight(li.querySelector('.member-name'), li.dataset.name, show ? q : '');
      if (show) matches++;
    });
    section.hidden = q && matches === 0;
    if (!section.hidden) anyVisible = true;
  });

  teamsEl.querySelector('.no-results').hidden = anyVisible;
}

loadTeams()
  .then(teams => {
    render(teams);
    applySearch();
    searchEl.addEventListener('input', applySearch);
  })
  .catch(err => {
    teamsEl.replaceChildren(el('p', 'status error', err.message));
  });
