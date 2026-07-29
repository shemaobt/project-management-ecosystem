/* coords.js — country→continent mapping, regional coordinators, current user */

window.SHEMA_COUNTRY_CONTINENT = {
  // South America
  'Brazil': 'south-america', 'Peru': 'south-america', 'Colombia': 'south-america',
  // North & Central America
  'Mexico': 'north-america', 'Panama': 'north-america',
  'United States': 'north-america', 'Canada': 'north-america',
  // Africa
  'Egypt': 'africa', 'Mozambique': 'africa', 'South Africa': 'africa',
  'South Sudan': 'africa', 'Sudan': 'africa', 'Guinea-Bissau': 'africa',
  'São Tomé e Príncipe': 'africa', 'Togo': 'africa', 'Uganda': 'africa',
  // Asia
  'India': 'asia', 'China': 'asia', 'Indonesia': 'asia',
  'East Timor': 'asia', 'Nepal': 'asia',
  // Oceania
  'Australia': 'oceania', 'Papua New Guinea': 'oceania',
  'Fiji': 'oceania', 'Micronesia': 'oceania',
};

// Each continent has a regional team of three roles. Karina Marinho is the
// general supervisor (sees all). Names are placeholders — swap for the real team.
window.SHEMA_CONTINENT_TEAMS = {
  'south-america': { coordinator: '', obtLab: '', resourceCircle: '' },
  'north-america':  { coordinator: '', obtLab: '', resourceCircle: '' },
  'africa':         { coordinator: '', obtLab: '', resourceCircle: '' },
  'asia':           { coordinator: '', obtLab: '', resourceCircle: '' },
  'oceania':        { coordinator: '', obtLab: '', resourceCircle: '' },
  'other':          { coordinator: '', obtLab: '', resourceCircle: '' },
};

// Backwards-compatible alias used by the continent filter labels
window.SHEMA_CONTINENT_COORDINATORS = Object.fromEntries(
  Object.entries(window.SHEMA_CONTINENT_TEAMS).map(([k, v]) => [k, v.coordinator])
);

window.SHEMA.getContinent = function(p) {
  const country = (p.location || '').split(',')[0].trim();
  return window.SHEMA_COUNTRY_CONTINENT[country] || 'other';
};

window.SHEMA.getCoordinatorForContinent = function(continent) {
  return (window.SHEMA_CONTINENT_TEAMS[continent] || {}).coordinator || '';
};

window.SHEMA.getTeamForContinent = function(continent) {
  return window.SHEMA_CONTINENT_TEAMS[continent] || { coordinator: '', obtLab: '', resourceCircle: '' };
};

// Persisted overrides for the regional teams (editable in the "Equipe" tab)
(function () {
  // One-time purge of previously-seeded example names.
  try {
    if (!localStorage.getItem('shema-teams-cleared')) {
      localStorage.removeItem('shema-teams');
      localStorage.setItem('shema-teams-cleared', '1');
    }
  } catch (e) {}
  try {
    const saved = JSON.parse(localStorage.getItem('shema-teams') || 'null');
    if (saved) {
      Object.keys(saved).forEach(k => {
        window.SHEMA_CONTINENT_TEAMS[k] = Object.assign({}, window.SHEMA_CONTINENT_TEAMS[k], saved[k]);
      });
    }
  } catch (e) {}
})();
window.SHEMA.saveTeams = function (teams) {
  Object.keys(teams).forEach(k => {
    window.SHEMA_CONTINENT_TEAMS[k] = Object.assign({}, window.SHEMA_CONTINENT_TEAMS[k], teams[k]);
  });
  window.SHEMA_CONTINENT_COORDINATORS = Object.fromEntries(
    Object.entries(window.SHEMA_CONTINENT_TEAMS).map(([k, v]) => [k, v.coordinator])
  );
  try { localStorage.setItem('shema-teams', JSON.stringify(window.SHEMA_CONTINENT_TEAMS)); } catch (e) {}
};

// ---- current user (the general supervisor) ----
window.SHEMA.getCurrentUser = function() {
  try {
    return localStorage.getItem('shema-current-user') || 'Karina Marinho';
  } catch { return 'Karina Marinho'; }
};
window.SHEMA.setCurrentUser = function(name) {
  try { localStorage.setItem('shema-current-user', name || ''); } catch {}
};

// ---- saved views ----
window.SHEMA.loadSavedViews = function() {
  try {
    const raw = localStorage.getItem('shema-saved-views');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};
window.SHEMA.saveSavedViews = function(views) {
  try { localStorage.setItem('shema-saved-views', JSON.stringify(views)); } catch {}
};

// Assign each project's regional team (3 roles) from its continent.
// Respects any manually-set value already on the project.
window.SHEMA.seedRegionalCoordinator = function(projects) {
  return projects.map(p => {
    const cont = window.SHEMA.getContinent(p);
    const team = window.SHEMA_CONTINENT_TEAMS[cont] || {};
    const next = { ...p };
    // Roles are no longer seeded with example names — clear any previously-seeded placeholders.
    next.regionalCoordinator = team.coordinator || '';
    next.obtLabPerson = team.obtLab || '';
    next.resourceCirclePerson = team.resourceCircle || '';
    return next;
  });
};

// Seed a few projects as sensitive countries so the flag is visible from day one.
window.SHEMA.seedSensitive = function (projects) {
  const ids = new Set(['korowai', 'baikeno', 'welaun', 'manombai', 'gavak']);
  return projects.map(p => (p.sensitiveCountry === undefined && ids.has(p.id)) ? { ...p, sensitiveCountry: true } : p);
};
