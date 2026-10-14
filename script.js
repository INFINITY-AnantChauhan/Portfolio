const localApiHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const configuredApiBase = typeof window.PORTFOLIO_API_BASE_URL === 'string'
  ? window.PORTFOLIO_API_BASE_URL.trim().replace(/\/+$/, '')
  : '';
window.PORTFOLIO_API_BASE = configuredApiBase || (localApiHost && window.location.port && window.location.port !== '5000'
  ? `${window.location.protocol}//${window.location.hostname}:5000`
  : '');
const API_BASE_URL = window.PORTFOLIO_API_BASE;

function backendUnavailableMessage(feature) {
  if (window.location.hostname.endsWith('.github.io') && !API_BASE_URL) {
    return `GitHub Pages only hosts static files, so the ${feature} API is unavailable. Deploy server.js to a Node host, set PORTFOLIO_API_BASE_URL in deployment-config.js, and allow this site in the backend's ALLOWED_ORIGINS.`;
  }
  return `The ${feature} API is unavailable on this server. Start the portfolio with npm start or configure its backend URL.`;
}

function backendConnectionErrorMessage(feature) {
  if (window.location.hostname.endsWith('.github.io')) {
    return API_BASE_URL
      ? `Could not reach the ${feature} backend. Check that its HTTPS URL is live and ALLOWED_ORIGINS includes this GitHub Pages origin.`
      : backendUnavailableMessage(feature);
  }
  return `Could not reach the ${feature} server. Check that it is running and retry.`;
}

const UNKNOWN_ANSWER = 'I don’t have verified information about that yet. You can contact Anant for clarification.';
const listItems = (items) => items.map((item) => String(item)).join('; ');

function normalizeChatText(value) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function formatProjectAnswer(project) {
  const details = [`${project.title}${project.category ? ` (${project.category})` : ''}: ${project.overview || 'No description is listed.'}`];
  if (project.status) details.push(project.status);
  if (Array.isArray(project.tech) && project.tech.length) details.push(`Technologies listed: ${listItems(project.tech)}.`);
  if (project.github) details.push(`GitHub: ${project.github}`);
  if (project.live) details.push(`Live demo: ${project.live}`);
  return details.join(' ');
}

function answerFromPortfolio(question, context) {
  const text = normalizeChatText(question);
  const person = context.person;
  const currentRoles = context.roles.now || [];
  const earlierRoles = context.roles.earlier || [];
  const projects = context.projects || [];
  const containsProject = projects.find((project) => {
    const title = normalizeChatText(project.title);
    return title && text.includes(title);
  });
  const unknown = () => ({ reply: UNKNOWN_ANSWER, mode: 'verified' });

  if (/\b(weather|forecast|temperature outside|raining|sunny today)\b/.test(text)) {
    return {
      reply: 'I can’t provide a live weather reading in this chat. Anant Pets can fetch current conditions after you choose a city or grant browser location permission.',
      mode: 'verified',
    };
  }

  if (/\b(latest|most recent|newest)\b/.test(text) && /\b(achievement|award|accomplishment)\b/.test(text)) return unknown();
  if (/\b(achievement|achievements|award|awards)\b/.test(text)) {
    return { reply: 'The portfolio does not include an achievement timeline or award records, so I can’t verify an achievement from it.', mode: 'verified' };
  }
  if (/\b(available|availability|open to work|seeking work|looking for work)\b/.test(text)) return unknown();

  if (/\b(who are you|what are you$|what are you (?:the|an) (?:assistant|bot)|are you anant|who is anant|tell me about anant)\b/.test(text)) {
    if (/\bwho are you\b|\bwhat are you$|\bwhat are you (?:the|an) (?:assistant|bot)\b|\bare you anant\b/.test(text)) {
      return { reply: `I’m the portfolio assistant for ${person.name}. I’m not Anant himself. I answer from the information listed in this portfolio.`, mode: 'verified' };
    }
    return { reply: `${person.intro} ${currentRoles.find((role) => role.org === 'UPES OPEN Community') ? `The portfolio lists ${currentRoles.find((role) => role.org === 'UPES OPEN Community').role} at UPES OPEN Community.` : ''}`.trim(), mode: 'verified' };
  }

  if (/\b(stud(y|ying)|education|degree|university|college|academic year|what year)\b/.test(text) || text.includes('b tech')) {
    return person.intro ? { reply: person.intro, mode: 'verified' } : unknown();
  }

  if (/\b(upes open|design lead)\b/.test(text)) {
    const role = currentRoles.find((item) => item.org.toLowerCase().includes('upes open') && item.role.toLowerCase().includes('design'));
    return role ? { reply: `The portfolio lists Anant’s current role as ${role.role} at ${role.org}.`, mode: 'verified' } : unknown();
  }

  if (/\b(sih|smart india hackathon)\b/.test(text)) {
    const role = currentRoles.find((item) => item.org.toLowerCase().includes('smart india hackathon'));
    return role
      ? { reply: `The portfolio lists the role as ${role.role} at ${role.org}. Its note says the exact formal title is still to be confirmed: ${role.note}`, mode: 'verified' }
      : unknown();
  }

  if (/\b(ambassador|lead enabler|organizing committee|organising committee|udbhav)\b/.test(text)) {
    const role = currentRoles.find((item) => normalizeChatText(`${item.role} ${item.org}`).split(' ').some((word) => word.length > 3 && text.includes(word)));
    return role ? { reply: `The portfolio lists ${role.role} at ${role.org}${role.note ? `. Note: ${role.note}` : '.'}`, mode: 'verified' } : unknown();
  }

  if (/\b(current roles?|positions?|leadership|role at|what roles|what do you do at upes)\b/.test(text)) {
    const wantsEarlier = /\b(former|past|previous|earlier|all)\b/.test(text);
    const current = currentRoles.map((role) => `${role.role}, ${role.org}`).join('; ');
    const earlier = earlierRoles.map((role) => `${role.role}, ${role.org}`).join('; ');
    if (wantsEarlier) return { reply: `Current roles listed: ${current || 'none listed'}. Earlier roles listed: ${earlier || 'none listed'}.`, mode: 'verified' };
    return current ? { reply: `Current roles listed in the portfolio: ${current}.`, mode: 'verified' } : unknown();
  }

  if (/\b(github|git hub|repository|repositories|repo|demo|live link)\b/.test(text)) {
    if (containsProject) {
      const links = [containsProject.github && `GitHub: ${containsProject.github}`, containsProject.live && `Live demo: ${containsProject.live}`].filter(Boolean);
      return { reply: links.length ? `${containsProject.title}: ${links.join('. ')}` : `No GitHub repository or live-demo URL is listed for ${containsProject.title}.`, mode: 'verified' };
    }
    if (/\b(profile|account|username|github|git hub)\b/.test(text) && person.github) {
      return { reply: `The GitHub profile listed in the portfolio is ${person.github}.`, mode: 'verified' };
    }
    return unknown();
  }

  if (/\b(contact|email|reach|linkedin|connect|hire)\b/.test(text)) {
    const links = [person.email && `Email: ${person.email}`, person.linkedin && `LinkedIn: ${person.linkedin}`, person.github && `GitHub: ${person.github}`].filter(Boolean);
    return links.length ? { reply: `Contact details listed in the portfolio: ${links.join('. ')}.`, mode: 'verified' } : unknown();
  }

  if (/\b(certificates?|certifications?|training|iirs|isro)\b/.test(text)) {
    const certificates = (context.certificates || []).map((item) => {
      const details = [item.issuer, item.date].filter(Boolean);
      return details.length ? `${item.title} (${details.join(', ')})` : item.title;
    }).filter(Boolean);
    return certificates.length ? { reply: `The portfolio’s Certificates and training section lists: ${listItems(certificates)}. Missing issuers or dates are not specified there.`, mode: 'verified' } : unknown();
  }

  if (/\b(upcl|scada|internship|intern|nextjob)\b/.test(text)) {
    const requested = text.includes('nextjob')
      ? (context.about || []).find((paragraph) => paragraph.toLowerCase().includes('nextjob'))
      : projects.find((project) => project.id === 'upcl')?.overview || (context.about || []).find((paragraph) => paragraph.toLowerCase().includes('upcl'));
    return requested ? { reply: typeof requested === 'string' ? requested : formatProjectAnswer(requested), mode: 'verified' } : unknown();
  }

  if (/\b(experience|worked|career|employment|internships)\b/.test(text) && !/\b(project|projects|ai|ml|built|build)\b/.test(text)) {
    const internships = (context.about || []).filter((paragraph) => /intern/i.test(paragraph));
    const previousRoles = earlierRoles.map((role) => `${role.role} at ${role.org}${role.note ? ` (${role.note})` : ''}`);
    const current = currentRoles.map((role) => `${role.role} at ${role.org}`);
    const parts = [];
    if (internships.length) parts.push(`Internship information in the portfolio: ${internships.join(' ')}`);
    if (current.length) parts.push(`Current roles listed separately: ${current.join('; ')}.`);
    if (previousRoles.length) parts.push(`Earlier roles listed: ${previousRoles.join('; ')}.`);
    parts.push('The portfolio does not give dates for these roles or additional details beyond the descriptions shown.');
    return { reply: parts.join(' '), mode: 'verified' };
  }

  if (/\b(skill|skills|technology|technologies|tech stack|programming|language|tools)\b/.test(text)) {
    const skills = (context.skills || []).map((group) => `${group.group}: ${listItems(group.items || [])}`);
    return skills.length ? { reply: `Skills listed in the portfolio: ${skills.join('. ')}.`, mode: 'verified' } : unknown();
  }

  if (containsProject || /\b(project|projects|built|build|developed|work samples)\b/.test(text)) {
    if (containsProject) return { reply: formatProjectAnswer(containsProject), mode: 'verified' };
    if (!projects.length) return unknown();
    return {
      reply: `The portfolio lists these projects and work samples; it does not establish that every item is complete: ${projects.map(formatProjectAnswer).join('\n')}`,
      mode: 'verified',
    };
  }

  if (/\b(interest|interests|focus|career goal|career goals)\b/.test(text)) {
    return context.about && context.about[0] ? { reply: context.about[0], mode: 'verified' } : unknown();
  }

  if (/\b(navigate|navigation|find the|where can i|how do i use|sections)\b/.test(text)) {
    return { reply: `Use the portfolio’s navigation menu or dock to open: ${listItems(context.navigation)}.`, mode: 'verified' };
  }

  const profileTerms = /\b(anant|my|me|his|he|profile|portfolio|student|upes|role|leadership|intern|skill|project|certificate|achievement|experience|github|linkedin|email|sih|iirs|isro|gemini)\b/;
  if (profileTerms.test(text)) return unknown();
  return null;
}

// ---- Static-hosting fallbacks (GitHub Pages has no Node backend) ----
function hasBackend() {
  return Boolean(API_BASE_URL) || !window.location.hostname.endsWith('.github.io');
}

function buildPortfolioContext() {
  const data = state.portfolio || {};
  return {
    person: data.person || {},
    highlights: data.highlights || [],
    facts: data.facts || [],
    about: data.about || [],
    skills: data.skills || [],
    projects: data.projects || [],
    certificates: data.certificates || [],
    roles: data.roles || { now: [], earlier: [] },
    navigation: ['Home', 'About', 'Projects', 'Skills', 'Certificates', 'Leadership', 'Contact'],
  };
}

function localChatAnswer(question) {
  if (!state.portfolio) return null;
  const result = answerFromPortfolio(question, buildPortfolioContext());
  if (result) return result;
  return {
    reply: 'I can only answer questions about Anant’s portfolio — his projects, skills, roles, certificates and contact details. Try one of the suggestions below.',
    mode: 'local',
  };
}

const sectionMeta = [
  { id: 'home', label: 'Home', icon: 'i-home' },
  { id: 'about', label: 'About', icon: 'i-about' },
  { id: 'projects', label: 'Projects', icon: 'i-projects' },
  { id: 'skills', label: 'Skills', icon: 'i-skills' },
  { id: 'certificates', label: 'Certificates', icon: 'i-certificates' },
  { id: 'leadership', label: 'Leadership', icon: 'i-leadership' },
  { id: 'contact', label: 'Contact', icon: 'i-contact' },
];

const state = {
  portfolio: null,
  activeSection: 'home',
  chatSending: false,
};

function buildMenu() {
  const menuList = document.getElementById('menu-sections');
  if (!menuList) return;

  menuList.innerHTML = '';
  sectionMeta.forEach((item) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.label;
    button.setAttribute('role', 'menuitem');
    button.addEventListener('click', () => {
      goToSection(item.id);
      closeMenus();
    });
    li.appendChild(button);
    menuList.appendChild(li);
  });
}

function buildDock() {
  const dock = document.getElementById('dock');
  if (!dock) return;

  dock.innerHTML = '';
  sectionMeta.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dock-item';
    button.setAttribute('data-section', item.id);
    button.setAttribute('aria-label', item.label);
    button.setAttribute('aria-current', item.id === state.activeSection ? 'true' : 'false');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${item.icon}`);
    svg.appendChild(use);

    const tip = document.createElement('span');
    tip.className = 'tip';
    tip.textContent = item.label;

    button.appendChild(svg);
    button.appendChild(tip);
    button.addEventListener('click', () => {
      rippleAt(button.getBoundingClientRect().left + button.offsetWidth / 2, button.getBoundingClientRect().top + button.offsetHeight / 2);
      goToSection(item.id);
    });

    dock.appendChild(button);
  });

  const separator = document.createElement('span');
  separator.className = 'dock-sep';
  separator.setAttribute('aria-hidden', 'true');
  dock.appendChild(separator);

  const chatButton = document.createElement('button');
  chatButton.type = 'button';
  chatButton.className = 'dock-item restore';
  chatButton.setAttribute('aria-label', 'Open AI assistant');
  const chatSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chatSvg.setAttribute('viewBox', '0 0 24 24');
  chatSvg.setAttribute('aria-hidden', 'true');
  const chatUse = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  chatUse.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#i-chat');
  chatSvg.appendChild(chatUse);
  const chatTip = document.createElement('span');
  chatTip.className = 'tip';
  chatTip.textContent = 'Assistant';
  chatButton.appendChild(chatSvg);
  chatButton.appendChild(chatTip);
  chatButton.addEventListener('click', () => {
    toggleChat(true);
  });
  dock.appendChild(chatButton);
}

function rippleAt(x, y) {
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 1200);
}

function updateDockSelection(id) {
  const items = document.querySelectorAll('.dock-item');
  items.forEach((item) => {
    const isCurrent = item.getAttribute('data-section') === id;
    item.setAttribute('aria-current', isCurrent ? 'true' : 'false');
    item.style.transform = isCurrent ? 'translateY(-6px)' : '';
  });
}

function setActiveSection(id) {
  state.activeSection = id;
  document.querySelectorAll('.dock-item[data-section]').forEach((item) => {
    item.setAttribute('aria-current', item.getAttribute('data-section') === id ? 'true' : 'false');
  });
  const title = document.getElementById('win-title');
  if (title) {
    const match = sectionMeta.find((section) => section.id === id);
    title.textContent = match ? match.label : 'Portfolio';
  }
}

function toggleChat(forceOpen) {
  const panel = document.getElementById('chat');
  const launch = document.getElementById('chat-launch');
  if (!panel || !launch) return;
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : panel.hidden;
  panel.hidden = !shouldOpen;
  launch.setAttribute('aria-expanded', String(shouldOpen));
  const greet = document.getElementById('chat-greet');
  if (greet) greet.hidden = shouldOpen;
  if (shouldOpen) {
    setTimeout(() => document.getElementById('chat-input')?.focus(), 80);
  }
}

function goToSection(id) {
  const section = document.getElementById(id);
  if (!section) return;
  setActiveSection(id);
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const body = document.getElementById('body');
  if (body) {
    const rect = section.getBoundingClientRect();
    const top = rect.top + body.scrollTop - 18;
    body.scrollTo({ top, behavior: 'smooth' });
  }
}

function initClock() {
  const clock = document.getElementById('clock');
  if (!clock) return;

  const update = () => {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    clock.textContent = time;
  };
  update();
  setInterval(update, 30000);
}

function initMenuActions() {
  const toggles = document.querySelectorAll('.menu-btn');
  toggles.forEach((btn) => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      toggles.forEach((other) => {
        other.setAttribute('aria-expanded', 'false');
      });
      btn.setAttribute('aria-expanded', String(!expanded));
    });
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!target.closest('.menu')) {
      closeMenus();
    }
  });

  const menuTriggers = document.querySelectorAll('[data-act]');
  menuTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const action = trigger.getAttribute('data-act');
      if (!action) return;
      if (action === 'close') setWindowClosed();
      if (action === 'minimize') setWindowMinimized();
      if (action === 'zoom') toggleExpanded();
      if (action === 'open') setWindowOpen();
      if (action === 'copy-email') copyEmail();
    });
  });

  document.querySelectorAll('[data-go]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-go');
      if (id) goToSection(id);
    });
  });

  document.getElementById('reopen')?.addEventListener('click', setWindowOpen);
}

function closeMenus() {
  document.querySelectorAll('.menu-btn').forEach((btn) => btn.setAttribute('aria-expanded', 'false'));
}

function setWindowClosed() {
  const windowEl = document.getElementById('window');
  const reopen = document.getElementById('reopen');
  if (!windowEl) return;
  windowEl.classList.add('closed');
  windowEl.classList.remove('minimized');
  windowEl.classList.remove('expanded');
  if (reopen) reopen.hidden = false;
}

function setWindowMinimized() {
  const windowEl = document.getElementById('window');
  const reopen = document.getElementById('reopen');
  if (!windowEl) return;
  windowEl.classList.add('minimized');
  windowEl.classList.remove('closed');
  windowEl.classList.remove('expanded');
  if (reopen) reopen.hidden = false;
}

function setWindowOpen() {
  const windowEl = document.getElementById('window');
  const reopen = document.getElementById('reopen');
  if (!windowEl) return;
  windowEl.classList.remove('closed', 'minimized', 'expanded');
  if (reopen) reopen.hidden = true;
  setTimeout(() => {
    const body = document.getElementById('body');
    body?.focus();
  }, 160);
}

function toggleExpanded() {
  const windowEl = document.getElementById('window');
  if (!windowEl) return;
  windowEl.classList.toggle('expanded');
}

function applyPointerHighlight(target) {
  if (!target) return;
  target.addEventListener('pointermove', (event) => {
    const rect = target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    target.style.setProperty('--mx', `${x}%`);
    target.style.setProperty('--my', `${y}%`);
  });
}

function renderPortfolio(data) {
  state.portfolio = data;
  const person = data.person || {};

  document.title = `${person.name || 'Anant Chauhan'} — Portfolio`;
  document.getElementById('headline').textContent = person.headline || '';
  document.getElementById('intro').textContent = person.intro || '';
  const nameHeading = document.getElementById('h-name');
  if (nameHeading) {
    const fullName = person.name || 'Anant Chauhan';
    nameHeading.setAttribute('aria-label', fullName);
    nameHeading.replaceChildren();
    fullName.split(/\s+/).forEach((word, index) => {
      if (index) nameHeading.appendChild(document.createTextNode(' '));
      const wordSpan = document.createElement('span');
      wordSpan.className = 'name-word';
      wordSpan.setAttribute('aria-hidden', 'true');
      wordSpan.textContent = word.toUpperCase();
      nameHeading.appendChild(wordSpan);
    });
    const home = document.getElementById('home');
    home?.classList.remove('hero-ready');
    requestAnimationFrame(() => home?.classList.add('hero-ready'));
  }

  const links = [
    ['h-linkedin', person.linkedin],
    ['h-github', person.github],
    ['m-linkedin', person.linkedin],
    ['m-github', person.github],
    ['c-linkedin', person.linkedin],
    ['c-github', person.github],
  ];

  links.forEach(([id, url]) => {
    const el = document.getElementById(id);
    if (el && url) {
      el.href = url;
      el.textContent = id.includes('linkedin') ? 'LinkedIn' : 'GitHub';
      el.setAttribute('aria-label', id.includes('linkedin') ? 'Open Anant on LinkedIn' : 'Open Anant on GitHub');
    }
  });

  const emailLink = document.getElementById('c-mail');
  if (emailLink) {
    emailLink.href = `mailto:${person.email || ''}`;
    emailLink.textContent = person.email || 'Email unavailable';
  }

  const year = new Date().getFullYear();
  document.getElementById('year').textContent = year;

  renderHighlights(data.highlights || []);
  renderAbout(data.about || []);
  renderFacts(data.facts || []);
  renderProjects(data.projects || []);
  renderSkills(data.skills || []);
  renderCertificates(data.certificates || []);
  renderLeadership(data.roles || {});
  renderChatSuggestions();
}

function renderHighlights(items) {
  const list = document.getElementById('highlights');
  if (!list) return;
  list.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = item.label;
    const text = document.createElement('p');
    text.textContent = item.text;
    li.appendChild(label);
    li.appendChild(text);
    list.appendChild(li);
  });
}

function renderAbout(paragraphs) {
  const prose = document.getElementById('about-text');
  if (!prose) return;
  prose.innerHTML = '';
  const heading = document.createElement('h2');
  heading.id = 'h-about';
  heading.textContent = 'Software, machine learning and design, in one place.';
  prose.appendChild(heading);

  paragraphs.forEach((text) => {
    const p = document.createElement('p');
    p.textContent = text;
    prose.appendChild(p);
  });
}

function renderFacts(facts) {
  const factsList = document.getElementById('facts');
  if (!factsList) return;
  factsList.innerHTML = '';
  facts.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    factsList.appendChild(dt);
    factsList.appendChild(dd);
  });
}

function renderProjects(projects) {
  const root = document.getElementById('project-index');
  if (!root) return;
  root.innerHTML = '';

  projects.forEach((project, index) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Open details for ${project.title}`);
    button.addEventListener('click', () => openProjectDetail(project));

    const num = document.createElement('span');
    num.className = 'n';
    num.textContent = String(index + 1).padStart(2, '0');

    const title = document.createElement('span');
    title.className = 't';
    title.textContent = project.title;

    const category = document.createElement('span');
    category.className = 'c';
    category.textContent = project.category || 'Featured';

    const overview = document.createElement('span');
    overview.className = 'o';
    overview.textContent = project.overview || 'Project details available upon request.';

    button.appendChild(num);
    button.appendChild(title);
    button.appendChild(category);
    button.appendChild(overview);

    if (project.image) {
      const image = document.createElement('img');
      image.className = 'project-image';
      image.src = project.image;
      image.alt = `${project.title} project`;
      image.loading = 'lazy';
      button.appendChild(image);
    }

    item.appendChild(button);

    if (project.github) {
      const github = document.createElement('a');
      github.className = 'project-repo textlink';
      github.href = project.github;
      github.target = '_blank';
      github.rel = 'noopener noreferrer';
      github.textContent = 'View GitHub repository';
      item.appendChild(github);
    }

    root.appendChild(item);
  });
}

function renderSkills(groups) {
  const root = document.getElementById('capmap');
  if (!root) return;
  root.innerHTML = '';

  groups.forEach((group) => {
    const wrap = document.createElement('div');
    const heading = document.createElement('h3');
    heading.textContent = group.group;

    const text = document.createElement('p');
    group.items.forEach((item, idx) => {
      const span = document.createElement('span');
      span.textContent = item;
      text.appendChild(span);
      if (idx < group.items.length - 1) {
        const dot = document.createTextNode(' ');
        text.appendChild(dot);
      }
    });

    wrap.appendChild(heading);
    wrap.appendChild(text);
    root.appendChild(wrap);
  });
}

function renderCertificates(items) {
  const root = document.getElementById('plates');
  if (!root) return;
  root.innerHTML = '';

  items.forEach((cert) => {
    const article = document.createElement('button');
    article.type = 'button';
    article.className = 'plate';
    article.setAttribute('aria-label', `Open details for ${cert.title}`);
    article.addEventListener('click', () => openCertificateDetail(cert));

    const frame = document.createElement('div');
    frame.className = 'frame';

    const image = cert.image ? document.createElement('img') : document.createElement('div');
    if (cert.image) {
      image.src = cert.image;
      image.alt = cert.title;
      image.loading = 'lazy';
      image.onerror = () => {
        frame.innerHTML = '<div class="ph">Credential image<br>to be provided</div>';
      };
    } else {
      image.className = 'ph';
      image.textContent = 'Credential image required';
    }
    frame.appendChild(image);

    const title = document.createElement('div');
    title.className = 'cap';
    title.textContent = cert.title;

    const issuer = document.createElement('div');
    issuer.className = 'iss';
    issuer.textContent = [cert.issuer, cert.date].filter(Boolean).join(' • ') || 'Verification pending';

    article.appendChild(frame);
    article.appendChild(title);
    article.appendChild(issuer);
    root.appendChild(article);
  });
}

function openCertificateDetail(cert) {
  const dialog = document.getElementById('detail');
  const body = document.getElementById('d-body');
  if (!dialog || !body) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'd-wrap has-img';

  const meta = document.createElement('div');
  meta.className = 'd-meta';
  meta.textContent = [cert.issuer || 'Credential', cert.date].filter(Boolean).join(' • ') || 'Credential';

  const title = document.createElement('h2');
  title.textContent = cert.title || 'Certificate';

  const desc = document.createElement('p');
  desc.textContent = cert.description || 'This credential reflects focused learning and practical experience relevant to the current portfolio.';

  const imageWrap = document.createElement('div');
  imageWrap.className = 'd-img';
  if (cert.image) {
    const img = document.createElement('img');
    img.src = cert.image;
    img.alt = cert.title;
    img.loading = 'lazy';
    img.onerror = () => {
      imageWrap.innerHTML = '<div class="d-ph">Certificate image to be provided</div>';
    };
    imageWrap.appendChild(img);
  } else {
    imageWrap.innerHTML = '<div class="d-ph">Certificate image to be provided</div>';
  }

  const details = document.createElement('div');
  const issuerLabel = document.createElement('h4');
  issuerLabel.textContent = 'Issuing organization';
  const issuer = document.createElement('p');
  issuer.textContent = cert.issuer || 'Verification details pending';

  const dateLabel = document.createElement('h4');
  dateLabel.textContent = 'Completion date';
  const date = document.createElement('p');
  date.textContent = cert.date || 'Date to be confirmed';

  const actionRow = document.createElement('div');
  actionRow.className = 'd-actions';
  if (cert.url) {
    const link = document.createElement('a');
    link.className = 'textlink';
    link.href = cert.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Verification link';
    actionRow.appendChild(link);
  }

  details.appendChild(issuerLabel);
  details.appendChild(issuer);
  details.appendChild(dateLabel);
  details.appendChild(date);
  if (actionRow.childNodes.length) details.appendChild(actionRow);

  wrapper.appendChild(meta);
  wrapper.appendChild(title);
  wrapper.appendChild(desc);
  wrapper.appendChild(imageWrap);
  wrapper.appendChild(details);

  body.innerHTML = '';
  body.appendChild(wrapper);
  dialog.showModal?.();
}

function renderLeadership(rolesObj) {
  const root = document.getElementById('roles');
  if (!root) return;
  root.innerHTML = '';

  const current = rolesObj.now || [];
  const earlier = rolesObj.earlier || [];
  const groups = [
    { heading: 'Current leadership', items: current },
    { heading: 'Earlier roles', items: earlier },
  ];

  groups.forEach((group) => {
    const section = document.createElement('div');
    const heading = document.createElement('h3');
    heading.textContent = group.heading;
    section.appendChild(heading);

    group.items.forEach((item) => {
      const role = document.createElement('div');
      role.className = 'role';

      const name = document.createElement('b');
      name.textContent = item.role;

      const org = document.createElement('div');
      org.className = 'org';
      org.textContent = item.org;

      const note = document.createElement('div');
      note.className = 'nt';
      note.textContent = item.note || 'Role and scope developed through active community leadership.';

      role.appendChild(name);
      role.appendChild(org);
      role.appendChild(note);
      section.appendChild(role);
    });

    root.appendChild(section);
  });
}

function copyEmail() {
  const email = (state.portfolio?.person?.email || '').trim();
  if (!email) {
    setFormStatus('No email address is available on this site.', 'err');
    return;
  }

  navigator.clipboard.writeText(email)
    .then(() => setFormStatus('Email address copied to your clipboard.', 'ok'))
    .catch(() => setFormStatus('Copy failed. You can still email manually.', 'err'));
}

function setFormStatus(message, type) {
  const status = document.getElementById('form-status');
  if (!status) return;
  status.textContent = message;
  status.className = `form-status ${type}`;
}

async function submitContactStatic(payload) {
  if (payload.website) return; // honeypot
  const endpoint = (typeof window.PORTFOLIO_CONTACT_ENDPOINT === 'string' ? window.PORTFOLIO_CONTACT_ENDPOINT : '').trim();
  const to = state.portfolio?.person?.email || 'anantchauhan2006@gmail.com';

  if (endpoint) {
    // Works with Formspree (https://formspree.io/f/xxxx) or any JSON form endpoint.
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ name: payload.name, email: payload.email, message: payload.message }),
    });
    if (!response.ok) throw new Error(`The message service returned an error (HTTP ${response.status}). Please retry or email ${to} directly.`);
    setFormStatus('Thanks! Your message has been sent.', 'ok');
    return;
  }

  const subject = `Portfolio message from ${payload.name}`;
  const body = `${payload.message}\n\n— ${payload.name} (${payload.email})`;
  window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  setFormStatus('Opening your email app with the message ready to send. If nothing opens, email ' + to + ' directly.', 'ok');
}

async function handleContactSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.submitting === 'true') return;
  const submitButton = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  const payload = {
    name: (formData.get('name') || '').toString().trim(),
    email: (formData.get('email') || '').toString().trim(),
    message: (formData.get('message') || '').toString().trim(),
    website: (formData.get('website') || '').toString().trim(),
  };

  if (!payload.name || !payload.email || !payload.message) {
    setFormStatus('Please complete all required fields.', 'err');
    return;
  }

  form.dataset.submitting = 'true';
  submitButton.disabled = true;
  setFormStatus('Sending your message…', '');

  if (!hasBackend()) {
    try {
      await submitContactStatic(payload);
      form.reset();
    } catch (error) {
      setFormStatus(error.message || 'Could not send your message. Please email me directly.', 'err');
    } finally {
      delete form.dataset.submitting;
      submitButton.disabled = false;
    }
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/save-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      if (response.status === 404 || response.status === 405) {
        throw new Error(backendUnavailableMessage('contact'));
      }
      throw new Error(`The contact service returned an unexpected response (HTTP ${response.status}). Please retry.`);
    }

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error('The contact service returned invalid data. Your message was not confirmed; please retry.');
    }
    if (!response.ok || result?.success !== true) {
      throw new Error(typeof result?.message === 'string' ? result.message : `Unable to save your message (HTTP ${response.status}). Please retry.`);
    }

    setFormStatus(result.message || 'Your message has been saved.', 'ok');
    form.reset();
  } catch (error) {
    setFormStatus(error instanceof TypeError ? `${backendConnectionErrorMessage('contact')} Your message is still in the form.` : error.message || 'Something went wrong. Your message is still in the form; please retry.', 'err');
  } finally {
    delete form.dataset.submitting;
    submitButton.disabled = false;
  }
}

function initContactForm() {
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', handleContactSubmit);
    document.getElementById('copy-mail')?.addEventListener('click', copyEmail);
  }
}

function closeProjectDetail() {
  const dialog = document.getElementById('detail');
  if (!dialog) return;
  if (typeof dialog.close === 'function') dialog.close();
}

function openProjectDetail(project) {
  const dialog = document.getElementById('detail');
  const body = document.getElementById('d-body');
  if (!dialog || !body) return;

  const title = project.title || 'Project';
  const category = project.category || 'Featured work';
  const overview = project.overview || 'Project details are being documented.';
  const problem = project.problem || 'The project addresses a real-world problem in a focused and practical way.';
  const approach = project.approach || 'The work prioritised a clear technical approach, thoughtful implementation, and user-centred design.';
  const contribution = project.contribution || 'I contributed through design, development, testing, and project coordination based on the scope of the work.';
  const tech = Array.isArray(project.tech) && project.tech.length ? project.tech : ['Project planning', 'Design', 'Implementation'];
  const githubLink = project.github ? '<a class="textlink" href="' + project.github + '" target="_blank" rel="noopener">GitHub</a>' : '';
  const liveLink = project.live ? '<a class="textlink" href="' + project.live + '" target="_blank" rel="noopener">Live demo</a>' : '';

  const wrapper = document.createElement('div');
  wrapper.className = 'd-wrap';
  const hasImage = Boolean(project.image);
  if (hasImage) wrapper.classList.add('has-img');

  const header = document.createElement('div');
  const meta = document.createElement('div');
  meta.className = 'd-meta';
  meta.textContent = category;

  const h2 = document.createElement('h2');
  h2.textContent = title;

  header.appendChild(meta);
  header.appendChild(h2);
  wrapper.appendChild(header);

  if (hasImage) {
    const imageWrap = document.createElement('div');
    imageWrap.className = 'd-img';
    const img = document.createElement('img');
    img.src = project.image;
    img.alt = title;
    img.loading = 'lazy';
    imageWrap.appendChild(img);
    header.appendChild(imageWrap);
  } else {
    const ph = document.createElement('div');
    ph.className = 'd-ph';
    ph.textContent = 'Project image to be added';
    header.appendChild(ph);
  }

  const overviewP = document.createElement('p');
  overviewP.textContent = overview;
  wrapper.appendChild(overviewP);

  const status = document.createElement('div');
  status.className = 'd-status';
  status.textContent = project.status || 'Project information is current and has been represented accurately.';
  wrapper.appendChild(status);

  const techWrap = document.createElement('div');
  const techLabel = document.createElement('h4');
  techLabel.textContent = 'Technologies';
  const tags = document.createElement('div');
  tags.className = 'd-tech';
  tech.forEach((item) => {
    const tag = document.createElement('span');
    tag.textContent = item;
    tags.appendChild(tag);
  });
  techWrap.appendChild(techLabel);
  techWrap.appendChild(tags);
  wrapper.appendChild(techWrap);

  const problemTitle = document.createElement('h4');
  problemTitle.textContent = 'Problem addressed';
  const problemP = document.createElement('p');
  problemP.textContent = problem;
  wrapper.appendChild(problemTitle);
  wrapper.appendChild(problemP);

  const approachTitle = document.createElement('h4');
  approachTitle.textContent = 'Approach';
  const approachP = document.createElement('p');
  approachP.textContent = approach;
  wrapper.appendChild(approachTitle);
  wrapper.appendChild(approachP);

  const contributionTitle = document.createElement('h4');
  contributionTitle.textContent = 'Contribution';
  const contributionP = document.createElement('p');
  contributionP.textContent = contribution;
  wrapper.appendChild(contributionTitle);
  wrapper.appendChild(contributionP);

  const actionRow = document.createElement('div');
  actionRow.className = 'd-actions';
  if (githubLink) {
    const a = document.createElement('a');
    a.className = 'textlink';
    a.href = project.github;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'GitHub';
    actionRow.appendChild(a);
  }
  if (liveLink) {
    const a = document.createElement('a');
    a.className = 'textlink';
    a.href = project.live;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Live demo';
    actionRow.appendChild(a);
  }
  wrapper.appendChild(actionRow);

  body.innerHTML = '';
  body.appendChild(wrapper);
  dialog.showModal?.();
}

function renderChatSuggestions() {
  const chips = document.getElementById('chips');
  if (!chips) return;
  const prompts = [
    'Tell me about Anant.',
    'What AI/ML projects has he worked on?',
    'Tell me about his UPCL internship.',
    'What leadership roles does he hold?',
    'What technologies does he use?',
    'How can I contact him?',
  ];

  chips.innerHTML = '';
  prompts.forEach((prompt) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = prompt;
    button.addEventListener('click', () => sendChat(prompt));
    chips.appendChild(button);
  });
}

function appendChatMessage(role, content) {
  const log = document.getElementById('chat-log');
  if (!log) return;

  const bubble = document.createElement('div');
  bubble.className = `msg ${role}`;
  bubble.textContent = content;
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;
}

function appendChatError(message, prompt) {
  const log = document.getElementById('chat-log');
  if (!log) return;
  const bubble = document.createElement('div');
  bubble.className = 'msg bot error';
  bubble.setAttribute('role', 'alert');
  const text = document.createElement('p');
  text.textContent = message;
  const retry = document.createElement('button');
  retry.className = 'chat-retry';
  retry.type = 'button';
  retry.textContent = 'Retry';
  retry.setAttribute('aria-label', 'Retry your last question');
  retry.addEventListener('click', () => {
    bubble.remove();
    sendChat(prompt, { isRetry: true });
  });
  bubble.append(text, retry);
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;
}

function setChatMode(mode) {
  const label = document.getElementById('chat-mode');
  if (!label) return;
  const labels = {
    ai: 'Verified portfolio · general AI available',
    ai_general: 'General answer · not an Anant fact',
    verified: 'Verified portfolio answer',
    local: 'Portfolio-only mode',
  };
  label.textContent = labels[mode] || 'Verified portfolio Q&A';
}

function setChatSending(isSending) {
  state.chatSending = isSending;
  const input = document.getElementById('chat-input');
  const send = document.querySelector('#chat-form button[type="submit"]');
  if (input) input.disabled = isSending;
  if (send) {
    send.disabled = isSending;
    send.textContent = isSending ? 'Sending…' : 'Send';
  }
  document.querySelectorAll('#chips button').forEach((button) => {
    button.disabled = isSending;
  });
}

function showTypingIndicator() {
  const log = document.getElementById('chat-log');
  if (!log) return;
  const bubble = document.createElement('div');
  bubble.className = 'msg bot typing';
  bubble.setAttribute('data-typing', 'true');
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;
  return bubble;
}

function removeTypingIndicator() {
  const indicator = document.querySelector('.msg.typing[data-typing="true"]');
  indicator?.remove();
}

async function sendChat(prompt, { isRetry = false } = {}) {
  const input = document.getElementById('chat-input');
  const finalPrompt = (prompt || input?.value || '').toString().trim();
  if (state.chatSending) return;
  if (!finalPrompt) {
    input?.setCustomValidity('Enter a question before sending.');
    input?.reportValidity();
    return;
  }
  input?.setCustomValidity('');
  if (input) input.value = '';

  if (!isRetry) appendChatMessage('me', finalPrompt);
  showTypingIndicator();
  setChatSending(true);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 17000);

  if (!hasBackend()) {
    clearTimeout(timeout);
    const local = localChatAnswer(finalPrompt);
    await new Promise((resolve) => setTimeout(resolve, 350));
    removeTypingIndicator();
    appendChatMessage('bot', local ? local.reply : 'Portfolio data is still loading — please try again in a moment.');
    setChatMode('local');
    setChatSending(false);
    return;
  }

  try {
    const messages = [{ role: 'user', content: finalPrompt }];

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });

    let result;
    try {
      result = await response.json();
    } catch {
      if (!response.ok && response.status === 405) {
        throw new Error(backendUnavailableMessage('assistant'));
      }
      if (!response.ok) throw new Error(`The assistant request failed (HTTP ${response.status}). Check that the portfolio server is running and retry.`);
      throw new Error(`The assistant returned an invalid response (HTTP ${response.status}). Please retry.`);
    }
    if (!response.ok) {
      if (response.status === 405 || response.status === 404) throw new Error(backendUnavailableMessage('assistant'));
      throw new Error(typeof result?.message === 'string' ? result.message : `The assistant request failed (HTTP ${response.status}). Please retry.`);
    }
    if (result?.success !== true || typeof result.reply !== 'string' || !result.reply.trim()) throw new Error('The assistant returned an incomplete response. Please retry.');
    const reply = result.reply.trim();
    removeTypingIndicator();
    appendChatMessage('bot', reply);
    setChatMode(result.mode);
  } catch (error) {
    removeTypingIndicator();
    const localFallback = localChatAnswer(finalPrompt);
    if (localFallback) {
      appendChatMessage('bot', localFallback.reply);
      setChatMode('local');
      return;
    }
    const message = error.name === 'AbortError'
      ? 'The assistant took too long to respond. Check that the server is running, then retry.'
      : error instanceof TypeError
        ? backendConnectionErrorMessage('assistant')
        : error.message || 'The assistant could not respond. Please retry or contact Anant directly.';
    appendChatError(message, finalPrompt);
  } finally {
    clearTimeout(timeout);
    setChatSending(false);
  }
}

function initChat() {
  const launch = document.getElementById('chat-launch');
  const panel = document.getElementById('chat');
  const closeButton = document.getElementById('chat-close');
  const greet = document.getElementById('chat-greet');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');

  if (!launch || !panel || !form || !input || !closeButton) return;

  const show = () => {
    panel.hidden = false;
    launch.setAttribute('aria-expanded', 'true');
    if (greet) greet.hidden = true;
    setTimeout(() => input.focus(), 80);
  };

  const hide = () => {
    panel.hidden = true;
    launch.setAttribute('aria-expanded', 'false');
  };

  launch.addEventListener('click', () => {
    if (panel.hidden) {
      show();
    } else {
      hide();
    }
  });

  closeButton.addEventListener('click', hide);

  input.addEventListener('input', () => input.setCustomValidity(''));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    sendChat(input.value);
  });

  const welcome = 'I’m the portfolio assistant for Anant Chauhan, not Anant himself. Ask me about facts listed in this portfolio.';
  appendChatMessage('bot', welcome);
  if (!hasBackend()) setChatMode('local');
  else fetch(`${API_BASE_URL}/api/chat/status`)
    .then((response) => response.ok ? response.json() : null)
    .then((result) => result?.mode && setChatMode(result.mode))
    .catch(() => {});

  if (greet) {
    greet.hidden = false;
  }
}

function initRobotCursor() {
  const cursor = document.getElementById('robot-cursor');
  if (!cursor) return () => {};

  const body = document.body;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 721px) and (prefers-reduced-motion: no-preference)');
  const interactiveSelector = 'a, button, [role="button"], .dock-item, .desktop-widget, .plate, .index li, .capmap > div, .pet-window';
  let active = false;
  let frame = 0;
  let clickTimer = 0;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let initializedPosition = false;
  let positionCursor = () => {};

  const hideCursor = () => {
    body.classList.remove('robot-cursor-active', 'robot-cursor-visible', 'robot-cursor-hover', 'robot-cursor-typing');
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    initializedPosition = false;
  };

  const updateInteraction = (target) => {
    if (!(target instanceof Element)) return;
    body.classList.toggle('robot-cursor-hover', Boolean(target.closest(interactiveSelector)));
    body.classList.toggle('robot-cursor-typing', Boolean(target.closest('input, textarea, [contenteditable="true"]')));
  };

  const animateCursor = () => {
    currentX += (targetX - currentX) * 0.78;
    currentY += (targetY - currentY) * 0.78;
    cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
    if (Math.abs(targetX - currentX) > 0.2 || Math.abs(targetY - currentY) > 0.2) {
      frame = requestAnimationFrame(animateCursor);
    } else {
      currentX = targetX;
      currentY = targetY;
      cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      frame = 0;
    }
  };

  const onPointerOver = (event) => {
    updateInteraction(event.target);
    positionCursor(event);
  };
  const onPointerOut = (event) => updateInteraction(event.relatedTarget);
  const onPointerDown = (event) => {
    if (!active || event.button !== 0 || body.classList.contains('robot-cursor-typing')) return;
    body.classList.add('robot-cursor-click');
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => body.classList.remove('robot-cursor-click'), 260);
  };
  const onPointerLeave = () => hideCursor();

  const enable = () => {
    if (active) return;
    active = true;
    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('pointerout', onPointerOut, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('blur', onPointerLeave);
  };

  const disable = () => {
    if (!active) return;
    active = false;
    body.classList.remove('robot-cursor-active', 'robot-cursor-click');
    document.removeEventListener('pointerover', onPointerOver, true);
    document.removeEventListener('pointerout', onPointerOut, true);
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('blur', onPointerLeave);
    clearTimeout(clickTimer);
    hideCursor();
  };

  const onPreferenceChange = (event) => event.matches ? enable() : disable();
  if (finePointer.matches) enable();
  finePointer.addEventListener('change', onPreferenceChange);

  positionCursor = (event) => {
    if (!active || !event || typeof event.clientX !== 'number') return;
    targetX = event.clientX;
    targetY = event.clientY;
    if (!initializedPosition) {
      currentX = targetX;
      currentY = targetY;
      initializedPosition = true;
    }
    body.classList.add('robot-cursor-active');
    body.classList.add('robot-cursor-visible');
    if (document.visibilityState === 'hidden') {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      currentX = targetX;
      currentY = targetY;
      cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      return;
    }
    if (!frame) frame = requestAnimationFrame(animateCursor);
  };
  return positionCursor;
}

function initWindowEffects() {
  const windowEl = document.getElementById('window');
  if (windowEl) applyPointerHighlight(windowEl);

  const desktop = document.getElementById('desktop');
  if (!desktop) return;
  const updateRobotCursor = initRobotCursor();

  const updateDesktopLight = (event) => {
    const x = typeof event === 'object' && event.clientX !== undefined ? (event.clientX / window.innerWidth) * 100 : 50;
    const y = typeof event === 'object' && event.clientY !== undefined ? (event.clientY / window.innerHeight) * 100 : 50;
    desktop.style.setProperty('--pointer-x', `${x}%`);
    desktop.style.setProperty('--pointer-y', `${y}%`);
    desktop.style.setProperty('--wallpaper-parallax-x', `${(x / 50 - 1) * 8}px`);
    desktop.style.setProperty('--wallpaper-parallax-y', `${(y / 50 - 1) * 6}px`);
    if (event && event.type === 'pointermove') updateRobotCursor(event);
  };

  document.addEventListener('pointermove', updateDesktopLight, { passive: true });
  updateDesktopLight({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 });
}

function initTerminalCommands() {
  const terminal = document.getElementById('desktop-terminal');
  const toggle = terminal?.querySelector('.terminal-toggle');
  const form = document.getElementById('terminal-form');
  const input = document.getElementById('terminal-input');
  if (toggle && terminal) {
    toggle.addEventListener('click', () => {
      const minimized = terminal.classList.toggle('minimized');
      toggle.setAttribute('aria-label', minimized ? 'Restore portfolio terminal' : 'Minimize portfolio terminal');
      toggle.title = minimized ? 'Restore' : 'Minimize';
      toggle.textContent = minimized ? '+' : '−';
      terminal.setAttribute('aria-expanded', String(!minimized));
    });
  }

  if (!form || !input) return;

  const resolveCommand = (query) => {
    const normalized = query.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const simplified = normalized.replace(/\s+/g, ' ').trim();

    if (!simplified) return null;

    const commands = {
      help: () => goToSection('home'),
      about: () => goToSection('about'),
      projects: () => goToSection('projects'),
      skills: () => goToSection('skills'),
      certificates: () => goToSection('certificates'),
      leadership: () => goToSection('leadership'),
      contact: () => goToSection('contact'),
      home: () => goToSection('home'),
      clear: () => {
        const body = document.querySelector('.terminal-body');
        if (body) body.innerHTML = '';
      },
    };

    if (simplified in commands) return commands[simplified];

    if (/(^|\s)(tell me about|about|who is|who are you|who am i)\b/.test(simplified)) {
      return () => goToSection('about');
    }
    if (/(^|\s)(projects?|work|portfolio)\b/.test(simplified)) {
      return () => goToSection('projects');
    }
    if (/(^|\s)(skills?|tech|technology|stack)\b/.test(simplified)) {
      return () => goToSection('skills');
    }
    if (/(^|\s)(certificate|certificates|training)\b/.test(simplified)) {
      return () => goToSection('certificates');
    }
    if (/(^|\s)(leadership|roles?|positions?)\b/.test(simplified)) {
      return () => goToSection('leadership');
    }
    if (/(^|\s)(contact|email|reach|linkedin|github|hire)\b/.test(simplified)) {
      return () => goToSection('contact');
    }
    if (/(^|\s)help\b/.test(simplified)) {
      return () => goToSection('home');
    }

    return null;
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    const command = resolveCommand(query);
    if (command) {
      command();
      input.value = '';
      return;
    }

    const body = document.querySelector('.terminal-body');
    if (body) {
      const line = document.createElement('div');
      line.className = 'terminal-line terminal-meta';
      line.textContent = `Unknown command: ${query}. Try: help, about, projects, skills, contact`;
      body.appendChild(line);
    }
    input.value = '';
  });
}

function buildDesktopWidgets() {
  const desktop = document.getElementById('desktop');
  const widgets = document.getElementById('desktop-widgets');
  if (!desktop || !widgets) return;

  const elements = Array.from(widgets.querySelectorAll('.desktop-widget'));
  elements.forEach((element, index) => {
    element.style.animationDelay = `${index * 0.15}s`;
    element.style.setProperty('--widget-shift', `${index % 2 === 0 ? '8px' : '-8px'}`);
  });
}

async function loadPortfolio() {
  try {
    const response = await fetch(new URL('portfolio.json', window.location.href), { cache: 'no-store' });
    if (!response.ok) throw new Error('Portfolio data could not be loaded');
    const data = await response.json();
    renderPortfolio(data);
  } catch (error) {
    console.error('Portfolio data could not be loaded:', error.message);
    const headline = document.getElementById('headline');
    if (headline) headline.textContent = 'Portfolio information is unavailable. Refresh the page to try again.';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const detailClose = document.getElementById('d-close');
  detailClose?.addEventListener('click', closeProjectDetail);

  buildMenu();
  buildDock();
  initClock();
  initMenuActions();
  initWindowEffects();
  buildDesktopWidgets();
  initContactForm();
  initChat();
  initTerminalCommands();
  loadPortfolio();
  setTimeout(() => setWindowOpen(), 160);
});
