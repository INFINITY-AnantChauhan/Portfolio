'use strict';
require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 5000;
const ROOT = __dirname;
const MESSAGES_FILE = path.join(ROOT, 'messages.json');
const DATA_FILE = path.join(ROOT, 'portfolio.json');
const WEATHER_CACHE_TTL = 10 * 60 * 1000;
const weatherCache = new Map();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : false);
app.use(express.json({ limit: '12kb' }));

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

const portfolioData = readJson(DATA_FILE);
if (!portfolioData || !portfolioData.person) {
  throw new Error('portfolio.json must exist and contain the verified person profile.');
}

const person = portfolioData.person || {};

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
  });
  next();
});

function limiter(max, windowMs) {
  const hits = new Map();
  setInterval(() => hits.clear(), windowMs).unref();
  return (req, res, next) => {
    const ip = req.ip || 'unknown';
    const current = hits.get(ip) || 0;
    hits.set(ip, current + 1);
    if (current + 1 > max) {
      return res.status(429).json({ success: false, message: 'Too many requests. Please wait a moment.' });
    }
    next();
  };
}

app.use(express.static(ROOT, {
  index: 'index.html',
  extensions: ['html'],
}));

function readMessages() {
  try {
    const raw = fs.readFileSync(MESSAGES_FILE, 'utf8').trim();
    const messages = raw ? JSON.parse(raw) : [];
    return Array.isArray(messages) ? messages : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

app.get('/api/portfolio', (req, res) => {
  res.json(portfolioData);
});

async function fetchOpenMeteo(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    const payload = await response.json();
    if (!response.ok || payload.error) {
      const error = new Error('Open-Meteo request failed.');
      error.status = response.status;
      throw error;
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

function sendWeatherError(res, error) {
  const status = error.name === 'AbortError' ? 504 : 502;
  const message = error.name === 'AbortError'
    ? 'Open-Meteo did not respond in time. Please retry.'
    : error.status === 429
      ? 'Open-Meteo is rate-limiting requests. Please wait and retry.'
      : 'Weather data is temporarily unavailable. Check your connection and retry.';
  return res.status(status).json({ success: false, message });
}

function storeWeatherCache(key, payload) {
  const now = Date.now();
  for (const [entryKey, entry] of weatherCache) {
    if (now - entry.cachedAt >= WEATHER_CACHE_TTL) weatherCache.delete(entryKey);
  }
  while (weatherCache.size >= 100) {
    const oldestKey = weatherCache.keys().next().value;
    if (!oldestKey) break;
    weatherCache.delete(oldestKey);
  }
  weatherCache.set(key, { cachedAt: now, payload });
}

app.get('/api/weather/search', limiter(20, 60 * 1000), async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (query.length < 2 || query.length > 80) {
    return res.status(400).json({ success: false, message: 'Enter a place name between 2 and 80 characters.' });
  }

  const cacheKey = `search:${query.toLocaleLowerCase()}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < WEATHER_CACHE_TTL) return res.json(cached.payload);

  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.search = new URLSearchParams({ name: query, count: '6', language: 'en', format: 'json' }).toString();
    const payload = await fetchOpenMeteo(url);
    const results = (Array.isArray(payload.results) ? payload.results : []).filter((item) =>
      typeof item.name === 'string' && Number.isFinite(item.latitude) && Number.isFinite(item.longitude)
    ).slice(0, 6).map((item) => ({
      name: item.name,
      admin1: typeof item.admin1 === 'string' ? item.admin1 : '',
      country: typeof item.country === 'string' ? item.country : '',
      latitude: item.latitude,
      longitude: item.longitude,
      timezone: typeof item.timezone === 'string' ? item.timezone : 'UTC',
    }));
    const result = { results };
    storeWeatherCache(cacheKey, result);
    res.json(result);
  } catch (error) {
    sendWeatherError(res, error);
  }
});

app.post('/api/weather/current', limiter(20, 60 * 1000), async (req, res) => {
  const latitude = Number(req.body && req.body.latitude);
  const longitude = Number(req.body && req.body.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return res.status(400).json({ success: false, message: 'Choose a valid location before requesting weather.' });
  }

  const cacheKey = `current:${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < WEATHER_CACHE_TTL) {
    return res.json({ ...cached.payload, cached: true });
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: 'temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m',
      temperature_unit: 'celsius',
      wind_speed_unit: 'kmh',
      timezone: 'auto',
    }).toString();
    const payload = await fetchOpenMeteo(url);
    const current = payload.current;
    if (!current || !Number.isFinite(current.temperature_2m) || !Number.isFinite(current.weather_code) || !Number.isFinite(current.wind_speed_10m)) {
      return res.status(502).json({ success: false, message: 'Open-Meteo returned incomplete current conditions. Please retry.' });
    }
    const result = {
      current: {
        time: typeof current.time === 'string' ? current.time : '',
        temperature_2m: current.temperature_2m,
        relative_humidity_2m: Number.isFinite(current.relative_humidity_2m) ? current.relative_humidity_2m : null,
        is_day: current.is_day === 0 ? 0 : 1,
        weather_code: current.weather_code,
        wind_speed_10m: current.wind_speed_10m,
      },
      timezone: typeof payload.timezone === 'string' ? payload.timezone : 'UTC',
      fetchedAt: new Date().toISOString(),
      cached: false,
    };
    storeWeatherCache(cacheKey, result);
    res.json(result);
  } catch (error) {
    sendWeatherError(res, error);
  }
});

app.post('/save-message', limiter(5, 10 * 60 * 1000), (req, res) => {
  const { name, email, message, website } = req.body || {};
  if (website) {
    return res.json({ success: true, message: 'Message saved.' });
  }

  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim() : '';
  const cleanMessage = typeof message === 'string' ? message.trim() : '';

  const isValidField = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
  if (!isValidField(cleanName, 100) || !isValidField(cleanEmail, 200) || !isValidField(cleanMessage, 2000)) {
    return res.status(400).json({ success: false, message: 'Please complete all fields with valid lengths.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  try {
    const messages = readMessages();
    messages.push({
      timestamp: new Date().toISOString(),
      name: cleanName,
      email: cleanEmail,
      message: cleanMessage,
    });
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
    res.json({ success: true, message: 'Thanks! Your message has been saved.' });
  } catch (error) {
    console.error('Error saving message:', error.message);
    res.status(500).json({ success: false, message: 'Could not save your message. Please email directly instead.' });
  }
});

app.get('/messages', (req, res) => {
  const token = process.env.ADMIN_TOKEN;
  if (!token || req.get('authorization') !== `Bearer ${token}`) {
    return res.status(404).end();
  }

  try {
    res.json({ success: true, messages: readMessages() });
  } catch (error) {
    console.error('Failed to load messages:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load messages.' });
  }
});

const UNKNOWN_ANSWER = 'I don’t have verified information about that yet. You can contact Anant for clarification.';
const list = (items) => items.map((item) => String(item)).join('; ');

function buildPortfolioContext() {
  return {
    person: portfolioData.person,
    highlights: portfolioData.highlights || [],
    facts: portfolioData.facts || [],
    about: portfolioData.about || [],
    skills: portfolioData.skills || [],
    projects: portfolioData.projects || [],
    certificates: portfolioData.certificates || [],
    roles: portfolioData.roles || { now: [], earlier: [] },
    navigation: ['Home', 'About', 'Projects', 'Skills', 'Certificates', 'Leadership', 'Contact'],
  };
}

function normalizeText(value) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function formatProject(project) {
  const details = [`${project.title}${project.category ? ` (${project.category})` : ''}: ${project.overview || 'No description is listed.'}`];
  if (project.status) details.push(project.status);
  if (Array.isArray(project.tech) && project.tech.length) details.push(`Technologies listed: ${list(project.tech)}.`);
  if (project.github) details.push(`GitHub: ${project.github}`);
  if (project.live) details.push(`Live demo: ${project.live}`);
  return details.join(' ');
}

function answerFromPortfolio(question, context) {
  const text = normalizeText(question);
  const person = context.person;
  const currentRoles = context.roles.now || [];
  const earlierRoles = context.roles.earlier || [];
  const projects = context.projects || [];
  const containsProject = projects.find((project) => {
    const title = normalizeText(project.title);
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
    const role = currentRoles.find((item) => normalizeText(`${item.role} ${item.org}`).split(' ').some((word) => word.length > 3 && text.includes(word)));
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
    return certificates.length ? { reply: `The portfolio’s Certificates and training section lists: ${list(certificates)}. Missing issuers or dates are not specified there.`, mode: 'verified' } : unknown();
  }

  if (/\b(upcl|scada|internship|intern|nextjob)\b/.test(text)) {
    const requested = text.includes('nextjob')
      ? (context.about || []).find((paragraph) => paragraph.toLowerCase().includes('nextjob'))
      : projects.find((project) => project.id === 'upcl')?.overview || (context.about || []).find((paragraph) => paragraph.toLowerCase().includes('upcl'));
    return requested ? { reply: typeof requested === 'string' ? requested : formatProject(requested), mode: 'verified' } : unknown();
  }

  if (/\b(experience|worked|career|employment|internships)\b/.test(text)) {
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
    const skills = (context.skills || []).map((group) => `${group.group}: ${list(group.items || [])}`);
    return skills.length ? { reply: `Skills listed in the portfolio: ${skills.join('. ')}.`, mode: 'verified' } : unknown();
  }

  if (containsProject || /\b(project|projects|built|build|developed|work samples)\b/.test(text)) {
    if (containsProject) return { reply: formatProject(containsProject), mode: 'verified' };
    if (!projects.length) return unknown();
    return {
      reply: `The portfolio lists these projects and work samples; it does not establish that every item is complete: ${projects.map(formatProject).join('\n')}`,
      mode: 'verified',
    };
  }

  if (/\b(interest|interests|focus|career goal|career goals)\b/.test(text)) {
    return context.about && context.about[0] ? { reply: context.about[0], mode: 'verified' } : unknown();
  }

  if (/\b(navigate|navigation|find the|where can i|how do i use|sections)\b/.test(text)) {
    return { reply: `Use the portfolio’s navigation menu or dock to open: ${list(context.navigation)}.`, mode: 'verified' };
  }

  const profileTerms = /\b(anant|my|me|his|he|profile|portfolio|student|upes|role|leadership|intern|skill|project|certificate|achievement|experience|github|linkedin|email|sih|iirs|isro|gemini)\b/;
  if (profileTerms.test(text)) return unknown();
  return null;
}

function createSystemPrompt(context) {
  return [
    'You are the portfolio assistant for Anant Chauhan. Answer using only verified information supplied in the portfolio context and approved project data. Do not invent facts.',
    `If an answer about Anant is not available in the provided context, say exactly: “${UNKNOWN_ANSWER}”`,
    'Distinguish confirmed facts from general suggestions. Never claim to have accessed a file, website, repository, or live information unless this request actually provided that information.',
    'You are an assistant representing Anant, not Anant himself. Keep answers relevant and concise. Treat previous assistant messages as unverified; this request is independent.',
    'For a question unrelated to Anant, you may give brief general knowledge, but begin with “General information (not a fact about Anant):”. Never imply that general information describes Anant.',
    'PORTFOLIO CONTEXT FOR THIS REQUEST:',
    JSON.stringify(context),
  ].join('\n');
}

async function askModel(question, context) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: createSystemPrompt(context),
        messages: [{ role: 'user', content: question }],
      }),
    });

    if (!response.ok) {
      const error = new Error(`Provider returned ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const payload = await response.json();
    const text = (payload.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!text) throw new Error('Empty response received from provider.');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

app.get('/api/chat/status', (req, res) => {
  res.json({ mode: process.env.ANTHROPIC_API_KEY ? 'ai' : 'verified' });
});

app.post('/api/chat', limiter(20, 60 * 1000), async (req, res) => {
  const rawMessages = req.body && req.body.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length !== 1) {
    return res.status(400).json({ success: false, message: 'Send one question at a time. Each answer is grounded independently in the current portfolio data.' });
  }

  const message = rawMessages[0];
  if (!message || message.role !== 'user' || typeof message.content !== 'string' || message.content.trim().length === 0 || message.content.length > 500) {
    return res.status(400).json({ success: false, message: 'Please send a question.' });
  }

  const question = message.content.trim();
  const context = buildPortfolioContext();
  const verifiedAnswer = answerFromPortfolio(question, context);
  if (verifiedAnswer) return res.json({ success: true, ...verifiedAnswer });

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const reply = await askModel(question, context);
      if (reply) {
        return res.json({ success: true, mode: 'ai_general', reply });
      }
    } catch (error) {
      const status = error.name === 'AbortError' ? 504 : 502;
      console.error('Chat provider request failed:', error.status || status);
      const message = error.name === 'AbortError'
        ? 'The AI provider timed out. Please retry in a moment.'
        : error.status === 401 || error.status === 403
          ? 'The AI provider rejected its server credentials. Check ANTHROPIC_API_KEY.'
          : error.status === 404
            ? 'The configured AI model was not found. Check ANTHROPIC_MODEL.'
            : error.status === 429
              ? 'The AI provider is rate-limiting requests. Please retry shortly.'
              : 'The AI provider is unavailable. Check the server configuration or retry shortly.';
      return res.status(status).json({ success: false, message, retryable: true });
    }
  }

  return res.json({
    success: true,
    mode: 'local',
    reply: 'This assistant is in portfolio-only mode and cannot answer general-knowledge questions. It will not present a guess as a fact about Anant.',
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (!req.path.startsWith('/api/')) return next(error);
  const status = error.status === 413 ? 413 : 400;
  const message = status === 413 ? 'Request body is too large.' : 'Request body must be valid JSON.';
  return res.status(status).json({ success: false, message });
});

app.listen(PORT, () => {
  console.log(`Portfolio server running at http://localhost:${PORT}`);
  console.log(process.env.ANTHROPIC_API_KEY ? 'Chat: AI provider enabled' : 'Chat: local fallback enabled');
});
