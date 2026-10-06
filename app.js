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
    pm: str(t && t.pm),
    mentor: str(t && t.mentor),
    building: str(t && t.building),
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

function renderLead(label, name) {
  const tile = el('div', 'lead');
  tile.append(el('span', 'lead-label', label));
  if (name) {
    const who = el('div', 'lead-person');
    const nameEl = el('span', 'lead-name searchable', name);
    nameEl.dataset.name = name;
    who.append(el('span', 'avatar avatar-sm', initials(name)), nameEl);
    tile.append(who);
  } else {
    tile.append(el('span', 'placeholder', 'To be assigned'));
  }
  return tile;
}

function render(teams) {
  teamsEl.replaceChildren();

  const people = new Set(teams.flatMap(t => [t.pm, t.mentor, ...t.members].filter(Boolean))).size;
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

    const building = el('div', 'building');
    building.append(
      el('span', 'section-label', "What we're building"),
      team.building ? el('p', 'building-text', team.building) : el('p', 'placeholder', 'To be announced'),
    );

    const leads = el('div', 'leads');
    leads.append(renderLead('PM', team.pm), renderLead('Mentor', team.mentor));

    const list = el('ul', 'members');
    team.members.forEach(name => {
      const li = el('li', 'member');
      const nameEl = el('span', 'member-name searchable', name);
      nameEl.dataset.name = name;
      li.append(el('span', 'avatar', initials(name)), nameEl);
      list.append(li);
    });

    const body = el('div', 'team-body');
    body.append(building, leads, el('span', 'section-label members-label', 'Members'), list);
    section.append(header, body);
    teamsEl.append(section);
  });

  teamsEl.append(el('p', 'status no-results', 'No one found with that name.'));
}

function applySearch() {
  const q = searchEl.value.trim().toLowerCase();
  let anyVisible = false;

  teamsEl.querySelectorAll('.team').forEach(section => {
    let matches = 0;
    section.querySelectorAll('.searchable').forEach(nameEl => {
      const hit = !q || nameEl.dataset.name.toLowerCase().includes(q);
      highlight(nameEl, nameEl.dataset.name, hit ? q : '');
      const li = nameEl.closest('.member');
      if (li) li.hidden = !hit;
      if (hit) matches++;
    });
    section.hidden = q && matches === 0;
    section.querySelector('.members-label').hidden = !section.querySelector('.member:not([hidden])');
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
