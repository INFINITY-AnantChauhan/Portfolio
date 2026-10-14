(() => {
  'use strict';

  const CACHE_KEY = 'anant-pets-weather-v1';
  const API_BASE_URL = window.PORTFOLIO_API_BASE || '';
  const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;
  const REFRESH_INTERVAL = 12 * 60 * 1000;
  const REQUEST_TIMEOUT = 10000;
  const petNames = {
    cat: 'Pixel cat',
    fox: 'Mountain fox',
    dog: 'Studio dog',
    snow: 'Snow pal',
    anant: 'Anant with laptop',
  };
  const weatherTypes = {
    0: { kind: 'clear', label: 'Clear sky', icon: '☀' },
    1: { kind: 'clear', label: 'Mainly clear', icon: '◒' },
    2: { kind: 'partly-cloudy', label: 'Partly cloudy', icon: '◐' },
    3: { kind: 'overcast', label: 'Overcast', icon: '☁' },
    45: { kind: 'fog', label: 'Fog', icon: '≋' },
    48: { kind: 'fog', label: 'Rime fog', icon: '≋' },
    51: { kind: 'rain', label: 'Light drizzle', icon: '☂' },
    53: { kind: 'rain', label: 'Drizzle', icon: '☂' },
    55: { kind: 'rain', label: 'Dense drizzle', icon: '☂' },
    56: { kind: 'rain', label: 'Freezing drizzle', icon: '☂' },
    57: { kind: 'rain', label: 'Freezing drizzle', icon: '☂' },
    61: { kind: 'rain', label: 'Light rain', icon: '☂' },
    63: { kind: 'rain', label: 'Rain', icon: '☂' },
    65: { kind: 'rain', label: 'Heavy rain', icon: '☂' },
    66: { kind: 'rain', label: 'Freezing rain', icon: '☂' },
    67: { kind: 'rain', label: 'Heavy freezing rain', icon: '☂' },
    71: { kind: 'snow', label: 'Light snow', icon: '❄' },
    73: { kind: 'snow', label: 'Snow', icon: '❄' },
    75: { kind: 'snow', label: 'Heavy snow', icon: '❄' },
    77: { kind: 'snow', label: 'Snow grains', icon: '❄' },
    80: { kind: 'rain', label: 'Light showers', icon: '☂' },
    81: { kind: 'rain', label: 'Showers', icon: '☂' },
    82: { kind: 'rain', label: 'Heavy showers', icon: '☂' },
    85: { kind: 'snow', label: 'Snow showers', icon: '❄' },
    86: { kind: 'snow', label: 'Heavy snow showers', icon: '❄' },
    95: { kind: 'storm', label: 'Thunderstorm', icon: 'ϟ' },
    96: { kind: 'storm', label: 'Thunderstorm with hail', icon: 'ϟ' },
    97: { kind: 'storm', label: 'Heavy thunderstorm', icon: 'ϟ' },
    99: { kind: 'storm', label: 'Thunderstorm with hail', icon: 'ϟ' },
  };
  const petLines = {
    cat: ['Purr-fect moment for a coding break.', 'Anant is building something cool.', 'One more idea, then a nap.'],
    fox: ['The mountain path is looking pixel-perfect.', 'A little curiosity goes a long way.', 'Let’s explore this tiny world.'],
    dog: ['Good code deserves a happy tail.', 'I’m here for the big ideas and small treats.', 'Stretch break, developer.'],
    snow: ['A tiny snow day is still a snow day.', 'Keep calm and stay pixel-cool.', 'There’s always room for one more idea.'],
    anant: ['Back to the build, one good idea at a time.', 'I brought my laptop. You bring the curiosity.', 'Tiny scene, ambitious roadmap.'],
  };
  const weatherLines = {
    rain: 'I’ll take the tiny umbrella.',
    storm: 'Tucking in until this scene clears.',
    snow: 'Pixel snow! Let’s explore.',
    night: 'Saving a few ideas for tomorrow.',
    hot: 'Taking the shady side of the scene.',
  };

  const state = {
    location: null,
    lastGood: null,
    lastCheckedAt: 0,
    pet: 'cat',
    paused: false,
    sound: false,
    requestController: null,
    speechTimer: 0,
    petLineIndex: 0,
    refreshTimer: 0,
  };

  const $ = (selector) => document.querySelector(selector);
  const windowEl = $('#pet-window');
  const scene = $('#pet-scene');
  const statusEl = $('#pet-status');
  const resultsEl = $('#pet-results');
  const petCharacter = $('#pet-character');

  function setStatus(message, kind = '') {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `pet-status${kind ? ` is-${kind}` : ''}`;
  }

  function formatLocation(result) {
    return [...new Set([result.name, result.admin1, result.country].filter(Boolean))].join(', ');
  }

  function cacheWeather(locationName, weather, updatedAt) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ locationName, weather, updatedAt }));
    } catch {
      // Private browsing can disable storage; live weather still works for this visit.
    }
  }

  function restoreWeatherCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!cached || !cached.weather || !cached.locationName || Date.now() - cached.updatedAt > CACHE_MAX_AGE) return;
      state.lastGood = cached;
      renderWeather(cached, { stale: true });
      setStatus('Showing saved weather; choose a location to request a fresh reading.', 'stale');
    } catch {
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {
        // Storage is optional; the widget remains usable without it.
      }
    }
  }

  async function fetchOpenMeteoDirect(url, options) {
    const localUrl = new URL(url, window.location.href);
    const directController = new AbortController();
    let providerUrl;
    const requestOptions = { signal: directController.signal, headers: { Accept: 'application/json' } };
    if (localUrl.pathname === '/api/weather/search') {
      providerUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
      providerUrl.search = new URLSearchParams({ name: localUrl.searchParams.get('q') || '', count: '6', language: 'en', format: 'json' });
    } else if (localUrl.pathname === '/api/weather/current') {
      let coordinates;
      try {
        coordinates = JSON.parse(options.body || '{}');
      } catch {
        throw new Error('Choose a valid location before requesting weather.');
      }
      if (!Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude)) {
        throw new Error('Choose a valid location before requesting weather.');
      }
      providerUrl = new URL('https://api.open-meteo.com/v1/forecast');
      providerUrl.search = new URLSearchParams({
        latitude: String(coordinates.latitude),
        longitude: String(coordinates.longitude),
        current: 'temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m',
        temperature_unit: 'celsius',
        wind_speed_unit: 'kmh',
        timezone: 'auto',
      });
    } else {
      throw new Error('Weather service is unavailable. Please retry.');
    }

    const directTimer = setTimeout(() => directController.abort(), REQUEST_TIMEOUT);
    try {
      const response = await fetch(providerUrl, requestOptions);
      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error(`Open-Meteo returned invalid data (HTTP ${response.status}). Please retry.`);
      }
      if (!response.ok || payload.error) {
        throw new Error(payload.reason || `Open-Meteo returned HTTP ${response.status}.`);
      }
      if (localUrl.pathname === '/api/weather/search') {
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
        return { results };
      }

      const current = payload.current;
      if (!current || !Number.isFinite(current.temperature_2m) || !Number.isFinite(current.weather_code) || !Number.isFinite(current.wind_speed_10m)) {
        throw new Error('Open-Meteo returned incomplete current conditions. Please retry.');
      }
      return {
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
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      if (error instanceof TypeError) throw new Error('Could not reach Open-Meteo. Check your connection and retry.');
      throw error;
    } finally {
      clearTimeout(directTimer);
    }
  }

  function isWeatherEndpoint(url) {
    return url.startsWith('/api/weather/search') || url.startsWith('/api/weather/current');
  }

  async function requestJson(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    state.requestController = controller;
    try {
      let response;
      try {
        response = await fetch(`${API_BASE_URL}${url}`, { ...options, signal: controller.signal });
      } catch (error) {
        if (!isWeatherEndpoint(url) || error.name === 'AbortError') throw error;
        return await fetchOpenMeteoDirect(url, options);
      }
      let payload;
      try {
        payload = await response.json();
      } catch {
        if (isWeatherEndpoint(url) && [404, 405, 502, 504].includes(response.status)) {
          return await fetchOpenMeteoDirect(url, options);
        }
        if (!response.ok) {
          if (response.status === 405) throw new Error('The weather API route does not accept this request. Start the portfolio with `npm start` and open http://localhost:5000.');
          throw new Error(`Weather request failed (HTTP ${response.status}). Check that the portfolio server is running and retry.`);
        }
        throw new Error(`Weather service returned an invalid response (HTTP ${response.status}). Please retry.`);
      }
      if (!response.ok) {
        if (isWeatherEndpoint(url) && [404, 405, 502, 504].includes(response.status)) {
          return await fetchOpenMeteoDirect(url, options);
        }
        const message = typeof payload?.message === 'string' ? payload.message : '';
        if (response.status === 405) throw new Error('The weather API route does not accept this request. Start the portfolio with `npm start` and open http://localhost:5000.');
        throw new Error(message || `Weather request failed (HTTP ${response.status}). Please retry.`);
      }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Weather service returned an invalid response. Please retry.');
      return payload;
    } finally {
      clearTimeout(timer);
      if (state.requestController === controller) state.requestController = null;
    }
  }

  function getCondition(code) {
    return weatherTypes[code] || { kind: 'overcast', label: 'Condition unavailable', icon: '☁' };
  }

  function getDayPhase(current, timeZone) {
    if (current.is_day === 0) return 'night';
    const match = typeof current.time === 'string' && current.time.match(/T(\d{2}):/);
    const hour = match ? Number(match[1]) : Number(new Intl.DateTimeFormat('en', { hour: '2-digit', hourCycle: 'h23', timeZone }).format(new Date()));
    if (hour >= 5 && hour < 8) return 'sunrise';
    if (hour >= 17 && hour < 20) return 'sunset';
    return 'day';
  }

  function formatTime(timestamp) {
    if (!timestamp) return 'Time unavailable';
    const match = timestamp.match(/T(\d{2}:\d{2})/);
    return match ? `${match[1]} local` : timestamp;
  }

  function renderWeather(record, { stale = false } = {}) {
    if (!record || !record.weather || !record.weather.current) return;
    const { weather, locationName, updatedAt } = record;
    const current = weather.current;
    const condition = getCondition(current.weather_code);
    const timePhase = getDayPhase(current, weather.timezone || 'UTC');
    scene.className = `pet-scene condition-${condition.kind} time-${timePhase}`;
    scene.classList.toggle('condition-hot', Number(current.temperature_2m) >= 30);
    scene.setAttribute('aria-label', `${condition.label} pixel mountain scene for ${locationName}${stale ? ', showing cached conditions' : ''}`);
    const weatherIcon = timePhase === 'night' && (condition.kind === 'clear' || condition.kind === 'partly-cloudy') ? '☾' : condition.icon;
    $('#pet-weather-icon').textContent = weatherIcon;
    $('#pet-temperature').textContent = `${Math.round(current.temperature_2m)}°C`;
    $('#pet-condition').textContent = condition.label;
    $('#pet-location-name').textContent = locationName;
    $('#pet-wind').textContent = `Wind ${Math.round(current.wind_speed_10m)} km/h`;
    $('#pet-updated').textContent = `Observed ${formatTime(current.time)}`;
    $('#pet-updated').dateTime = current.time || '';
    $('#pet-weather-label').textContent = `${condition.label} · ${timePhase === 'night' ? 'Night' : timePhase === 'sunrise' ? 'Sunrise' : timePhase === 'sunset' ? 'Sunset' : 'Day'}`;
    $('#pet-weather-card')?.setAttribute('data-stale', String(stale));
    $('#pet-weather-label').classList.toggle('is-stale', stale);
    if (stale && updatedAt) $('#pet-updated').textContent += ` · saved ${new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  function setLoading(isLoading) {
    windowEl.classList.toggle('is-loading', isLoading);
    windowEl.setAttribute('aria-busy', String(isLoading));
    $('#pet-search-form button').disabled = isLoading;
    $('#pet-geolocate').disabled = isLoading;
    $('#pet-refresh').disabled = isLoading || !state.location;
    $('#pet-city').disabled = isLoading;
  }

  async function loadWeather() {
    if (!state.location) {
      setStatus('Choose a city or allow location access before refreshing.');
      return;
    }
    setLoading(true);
    setStatus(`Fetching current weather for ${state.location.name}…`);
    try {
      const payload = await requestJson('/api/weather/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: state.location.latitude, longitude: state.location.longitude }),
      });
      const updatedAt = payload.fetchedAt || new Date().toISOString();
      const record = { locationName: state.location.name, weather: payload, updatedAt };
      state.lastGood = record;
      state.lastCheckedAt = Date.now();
      cacheWeather(record.locationName, record.weather, record.updatedAt);
      renderWeather(record);
      setStatus(payload.cached ? 'Showing a recent provider-cached reading.' : `Updated from Open-Meteo · ${new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
    } catch (error) {
      const message = error.name === 'AbortError' ? 'Weather request timed out. Check your connection and retry.' : error.message || 'Weather is unavailable. Please retry.';
      if (state.lastGood) {
        renderWeather(state.lastGood, { stale: true });
        setStatus(`${message} Showing saved conditions for ${state.lastGood.locationName} (stale).`, 'error');
      } else {
        setStatus(message, 'error');
        $('#pet-weather-label').textContent = 'Weather unavailable';
      }
    } finally {
      state.lastCheckedAt = Date.now();
      setLoading(false);
    }
  }

  function renderLocations(locations) {
    resultsEl.replaceChildren();
    if (!locations.length) {
      resultsEl.hidden = true;
      setStatus('No matching places found. Try a city and country.');
      return;
    }
    locations.forEach((location) => {
      const button = document.createElement('button');
      button.type = 'button';
      const title = document.createElement('span');
      title.textContent = formatLocation(location);
      const detail = document.createElement('small');
      detail.textContent = `${location.timezone || 'Local time zone'} · ${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°`;
      button.append(title, detail);
      button.addEventListener('click', () => {
        state.location = {
          name: formatLocation(location),
          latitude: location.latitude,
          longitude: location.longitude,
          timezone: location.timezone,
        };
        resultsEl.hidden = true;
        $('#pet-city').value = location.name;
        $('#pet-refresh').disabled = false;
        loadWeather();
      });
      resultsEl.appendChild(button);
    });
    resultsEl.hidden = false;
    setStatus(`${locations.length} matching locations. Choose one to load its current weather.`);
  }

  async function searchLocations(event) {
    event.preventDefault();
    const query = $('#pet-city').value.trim();
    if (query.length < 2) {
      setStatus('Enter at least two characters to search for a place.', 'error');
      return;
    }
    setLoading(true);
    setStatus('Searching Open-Meteo locations…');
    try {
      const payload = await requestJson(`/api/weather/search?q=${encodeURIComponent(query)}`);
      renderLocations(Array.isArray(payload.results) ? payload.results : []);
    } catch (error) {
      setStatus(error.name === 'AbortError' ? 'Location search timed out. Please retry.' : error.message || 'Location search failed. Please retry.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function requestGeolocation() {
    if (!navigator.geolocation) {
      setStatus('This browser does not provide location access. Search for a city instead.', 'error');
      return;
    }
    setStatus('Waiting for your location permission…');
    navigator.geolocation.getCurrentPosition((position) => {
      state.location = {
        name: `Your location · ${position.coords.latitude.toFixed(2)}°, ${position.coords.longitude.toFixed(2)}°`,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      $('#pet-refresh').disabled = false;
      loadWeather();
    }, (error) => {
      const message = error.code === error.PERMISSION_DENIED
        ? 'Location permission was not granted. Search for a city instead.'
        : error.code === error.TIMEOUT
          ? 'Location lookup timed out. Search for a city instead.'
          : 'Location is unavailable. Search for a city instead.';
      setStatus(message, 'error');
    }, { enableHighAccuracy: false, maximumAge: 300000, timeout: 12000 });
  }

  function playSoftNote() {
    if (!state.sound) return;
    try {
      const AudioContextType = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextType) return;
      const context = new AudioContextType();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 520;
      gain.gain.setValueAtTime(0.035, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.12);
      oscillator.addEventListener('ended', () => context.close(), { once: true });
    } catch {
      setStatus('Sound is unavailable in this browser; the pet is still ready to play.');
    }
  }

  function petMessage() {
    const current = state.lastGood?.weather?.current;
    const condition = current ? getCondition(current.weather_code).kind : '';
    const phase = current ? getDayPhase(current, state.lastGood.weather.timezone || 'UTC') : '';
    const contextLine = condition === 'rain' || condition === 'storm' ? weatherLines[condition]
      : condition === 'snow' ? weatherLines.snow
        : phase === 'night' ? weatherLines.night
          : current && current.temperature_2m >= 30 ? weatherLines.hot
            : '';
    const lines = petLines[state.pet];
    const line = contextLine || lines[state.petLineIndex % lines.length];
    state.petLineIndex += 1;
    $('#pet-speech').textContent = line;
    $('#pet-speech').hidden = false;
    petCharacter.classList.remove('is-excited');
    void petCharacter.offsetWidth;
    petCharacter.classList.add('is-excited');
    clearTimeout(state.speechTimer);
    state.speechTimer = setTimeout(() => {
      $('#pet-speech').hidden = true;
      petCharacter.classList.remove('is-excited');
    }, 2800);
    playSoftNote();
  }

  function setPet(value) {
    state.pet = petNames[value] ? value : 'cat';
    petCharacter.dataset.pet = state.pet;
    petCharacter.setAttribute('aria-label', `${petNames[state.pet]}. Click for a message.`);
    petCharacter.setAttribute('title', petNames[state.pet]);
    $('#pet-speech').hidden = true;
  }

  function setPaused(paused) {
    state.paused = paused;
    windowEl.classList.toggle('is-paused', paused);
    $('#pet-pause').setAttribute('aria-pressed', String(paused));
    $('#pet-pause').textContent = paused ? 'Resume motion' : 'Pause motion';
  }

  function setSound(enabled) {
    state.sound = enabled;
    $('#pet-sound').setAttribute('aria-pressed', String(enabled));
    $('#pet-sound').textContent = enabled ? 'Sound on' : 'Sound off';
  }

  function closeWidget() {
    windowEl.hidden = true;
    $('#pet-reopen').hidden = false;
    $('#pet-reopen').focus();
  }

  function openWidget() {
    windowEl.hidden = false;
    $('#pet-reopen').hidden = true;
    $('#pet-city').focus();
    if (state.location && Date.now() - state.lastCheckedAt >= REFRESH_INTERVAL) loadWeather();
  }

  function refreshIfDue() {
    if (document.visibilityState === 'visible' && !windowEl.hidden && state.location && !state.requestController && Date.now() - state.lastCheckedAt >= REFRESH_INTERVAL) {
      loadWeather();
    }
  }

  function init() {
    if (!windowEl || !scene || !petCharacter) return;
    setPet($('#pet-select').value);
    restoreWeatherCache();
    $('#pet-search-form').addEventListener('submit', searchLocations);
    $('#pet-geolocate').addEventListener('click', requestGeolocation);
    $('#pet-refresh').addEventListener('click', loadWeather);
    $('#pet-select').addEventListener('change', (event) => setPet(event.currentTarget.value));
    $('#pet-pause').addEventListener('click', () => setPaused(!state.paused));
    $('#pet-sound').addEventListener('click', () => setSound(!state.sound));
    petCharacter.addEventListener('click', petMessage);
    $('#pet-close').addEventListener('click', closeWidget);
    $('#pet-minimize').addEventListener('click', (event) => {
      const minimized = windowEl.classList.toggle('is-minimized');
      event.currentTarget.setAttribute('aria-expanded', String(!minimized));
      event.currentTarget.setAttribute('aria-label', minimized ? 'Restore Anant Pets' : 'Minimize Anant Pets');
    });
    $('#pet-reopen').addEventListener('click', openWidget);
    document.addEventListener('visibilitychange', refreshIfDue);
    state.refreshTimer = setInterval(refreshIfDue, 60000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
