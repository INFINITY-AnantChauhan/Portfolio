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
    item.appendChild(button);
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

async function handleContactSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
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

  submitButton.disabled = true;
  setFormStatus('Sending your message…', '');

  try {
    const response = await fetch('/save-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Unable to send your message.');
    }

    setFormStatus(result.message || 'Message sent.', 'ok');
    form.reset();
  } catch (error) {
    setFormStatus(error.message || 'Something went wrong. Please email directly.', 'err');
  } finally {
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

  try {
    const messages = [{ role: 'user', content: finalPrompt }];

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error(`The assistant returned an unreadable response (HTTP ${response.status}). Please retry.`);
    }
    if (!response.ok || result?.success !== true || typeof result.reply !== 'string' || !result.reply.trim()) {
      throw new Error(result?.message || `The assistant request failed (HTTP ${response.status}). Please retry.`);
    }
    const reply = result.reply.trim();
    removeTypingIndicator();
    appendChatMessage('bot', reply);
    setChatMode(result.mode);
  } catch (error) {
    removeTypingIndicator();
    const message = error.name === 'AbortError'
      ? 'The assistant took too long to respond. Check that the server is running, then retry.'
      : error instanceof TypeError
        ? 'Could not reach the assistant server. Check your connection and retry.'
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
  fetch('/api/chat/status')
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
  const form = document.getElementById('terminal-form');
  const input = document.getElementById('terminal-input');
  if (!form || !input) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim().toLowerCase();
    if (!query) return;

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

    if (query in commands) {
      commands[query]();
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
    const response = await fetch('/portfolio.json', { cache: 'no-store' });
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
