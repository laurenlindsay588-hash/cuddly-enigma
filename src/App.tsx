import { useEffect, useState, type FormEvent } from 'react';
import { Icon, PlatformIcon } from './components/Icons';
import { Omnibox } from './components/Omnibox';
import { SettingsPanel } from './components/SettingsPanel';
import { History } from './components/History';
import {
  readHistory,
  recordOpening,
  saveHistory,
  type HistoryEntry,
} from './lib/history';
import { Tools } from './components/Tools';
import { appVersion } from './lib/version';
import { NextUp } from './components/NextUp';
import {
  discoverSites,
  readQueue,
  saveQueue,
  toggleQueued,
  updateQueueNote,
  resolveQueue,
  type QueueEntry,
} from './lib/discovery';
import { Favorites } from './components/Favorites';
import { readSavedSites, normalizeUrl, type Site } from './lib/sites';
import { bundledCatalog, fetchCatalog, readCatalog } from './lib/catalog';
import { destinationHint, isNative, updateNativeTheme } from './lib/native';

import {
  moveFavorite,
  readPreferences,
  savePreferences,
  type Preferences,
} from './lib/preferences';

const categories = [
  'All websites',
  'Social',
  'Entertainment',
  'Work',
  'Learn',
  'Create',
  'Everyday',
  'My links',
] as const;
type Category = (typeof categories)[number];
type View = 'websites' | 'history' | 'queue' | 'tools';
const pages = [
  ['websites', 'Explore', 'globe'],
  ['history', 'History', 'history'],
  ['queue', 'Next up', 'check'],
  ['tools', 'Tools', 'spark'],
] as const;

function App() {
  const [catalog, setCatalog] = useState(() =>
    isNative ? readCatalog() : bundledCatalog,
  );
  const [catalogStatus, setCatalogStatus] = useState<
    'loading' | 'online' | 'offline'
  >('loading');
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const trails = catalog.trails;
  const [preferences, setPreferences] = useState(readPreferences);
  const [showSettings, setShowSettings] = useState(false);
  const [navigation, setNavigation] = useState<{
    entries: View[];
    index: number;
  }>({
    entries: ['websites'],
    index: 0,
  });
  const view = navigation.entries[navigation.index];
  function setView(next: View) {
    window.scrollTo({ top: 0 });
    setNavigation((current) =>
      current.entries[current.index] === next
        ? current
        : {
            entries: [...current.entries.slice(0, current.index + 1), next],
            index: current.index + 1,
          },
    );
  }
  function goHome() {
    setView('websites');
    setSearch('');
    setCategory('All websites');
    setTrailId('');
    setShowSettings(false);
    window.scrollTo({ top: 0 });
  }
  function goBackOrForward(direction: -1 | 1) {
    setNavigation((current) => ({
      ...current,
      index: Math.max(
        0,
        Math.min(current.entries.length - 1, current.index + direction),
      ),
    }));
    setShowSettings(false);
    window.scrollTo({ top: 0 });
  }
  const [queue, setQueue] = useState(readQueue);
  const [trailId, setTrailId] = useState('');
  const [history, setHistory] = useState(readHistory);
  const [editingFavorites, setEditingFavorites] = useState(false);
  const [savedSites, setSavedSites] = useState<Site[]>(readSavedSites);
  const [category, setCategory] = useState<Category>('All websites');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const sites = [...catalog.sites, ...savedSites];
  const favoriteSites = preferences.favorites.flatMap((id) => {
    const site = sites.find((item) => item.id === id);
    return site ? [site] : [];
  });
  const favoriteIds = favoriteSites.map((site) => site.id);

  useEffect(() => {
    if (!isNative) return;
    let active = true;
    void fetchCatalog(
      import.meta.env.VITE_API_BASE_URL ??
        'https://hushpaid.netlify.app/api/v1',
    )
      .then((next) => {
        if (!active) return;
        setCatalog(next);
        setCatalogStatus('online');
      })
      .catch(() => {
        if (active) setCatalogStatus('offline');
      });
    return () => {
      active = false;
    };
  }, [catalogAttempt]);

  useEffect(() => {
    if (!isNative) return;
    const failed = () =>
      setNotice('This website could not open. Please try again.');
    window.addEventListener('hush:link-error', failed);
    return () => window.removeEventListener('hush:link-error', failed);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      document.documentElement.dataset.theme =
        preferences.mode === 'system'
          ? media.matches
            ? 'dark'
            : 'light'
          : preferences.mode;
      updateNativeTheme(document.documentElement.dataset.theme === 'dark');
    };
    applyTheme();
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [preferences.mode]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', preferences.accent);
  }, [preferences.accent]);

  function updatePreferences(next: Preferences, message: string) {
    setPreferences(next);
    const persisted = savePreferences(next);
    setNotice(
      persisted
        ? message
        : `${message} For this visit only; your browser could not save the change.`,
    );
  }

  function openSite(site: Pick<HistoryEntry, 'name' | 'url'>) {
    if (!preferences.rememberHistory) return;
    const next = recordOpening(history, site);
    setHistory(next);
    if (!saveHistory(next)) {
      setNotice(
        'History updated for this visit only; your browser could not save it.',
      );
    }
  }

  function clearHistory() {
    setHistory([]);
    setNotice(
      saveHistory([])
        ? 'History cleared.'
        : 'History cleared for this visit. Your browser could not remove saved history; it may return next time.',
    );
  }

  function toggleFavorite(site: Site) {
    const isFavorite = preferences.favorites.includes(site.id);
    updatePreferences(
      {
        ...preferences,
        favorites: isFavorite
          ? favoriteIds.filter((id) => id !== site.id)
          : [...favoriteIds, site.id],
      },
      `${site.name} ${isFavorite ? 'removed from' : 'added to'} favorites.`,
    );
  }

  function reorderFavorite(site: Site, direction: -1 | 1) {
    const favorites = moveFavorite(favoriteIds, site.id, direction);
    updatePreferences(
      { ...preferences, favorites },
      `${site.name} moved to position ${favorites.indexOf(site.id) + 1} of ${favorites.length}.`,
    );
  }

  const visibleSites = discoverSites(sites, category, search, trailId, trails);
  const queuedSites = resolveQueue(queue, sites);

  function updateQueue(next: QueueEntry[], message: string) {
    setQueue(next);
    const persisted = saveQueue(next);
    setNotice(
      persisted
        ? message
        : 'Next up updated for this visit only; your browser could not save it.',
    );
  }

  function toggleNextUp(site: Site) {
    const exists = queue.some((entry) => entry.siteId === site.id);
    updateQueue(
      toggleQueued(queue, site.id),
      `${site.name} ${exists ? 'removed from' : 'added to'} Next up.`,
    );
  }

  function updateSavedSites(next: Site[]) {
    setSavedSites(next);
    try {
      localStorage.setItem('launchpad-links', JSON.stringify(next));
      return true;
    } catch {
      return false;
    }
  }

  function addSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const destination = normalizeUrl(url);
    if (!destination) {
      setError(
        'Enter a valid website address, such as https://example.com. Only HTTP and HTTPS links are supported.',
      );
      return;
    }
    if (!name.trim()) {
      setError('Give your website a name.');
      return;
    }
    const persisted = updateSavedSites([
      ...savedSites,
      {
        id:
          crypto.randomUUID?.() ??
          Array.from(crypto.getRandomValues(new Uint32Array(4)), (part) =>
            part.toString(16),
          ).join('-'),
        name: name.trim(),
        url: destination,
        description: 'Your own little corner of the internet.',
        category: 'My links',
        icon: 'globe',
      },
    ]);
    setName('');
    setUrl('');
    setShowForm(false);
    setCategory('My links');
    setTrailId('');
    setSearch('');
    setNotice(
      persisted
        ? 'Website added. Saved in this browser for next time.'
        : 'Website added for this visit. Your browser could not save it for next time.',
    );
  }

  function removeSite(site: Site) {
    const persisted = updateSavedSites(
      savedSites.filter((saved) => saved.id !== site.id),
    );
    const nextPreferences = {
      ...preferences,
      favorites: preferences.favorites.filter((id) => id !== site.id),
    };
    const favoritesPersisted = savePreferences(nextPreferences);
    setPreferences(nextPreferences);
    const nextQueue = queue.filter((entry) => entry.siteId !== site.id);
    setQueue(nextQueue);
    const queuePersisted = saveQueue(nextQueue);
    setNotice(
      persisted && favoritesPersisted && queuePersisted
        ? `${site.name} removed.`
        : `${site.name} removed for this visit. Your browser could not save the change.`,
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="main-shell">
        <header className="workspace-header">
          <div className="browser-tabstrip">
            <nav className="browser-pages" aria-label="Browser pages">
              {pages.map(([page, label, icon]) => (
                <button
                  key={page}
                  className={`browser-tab ${view === page ? 'is-active' : ''}`}
                  aria-current={view === page ? 'page' : undefined}
                  onClick={() => {
                    setView(page);
                    setShowSettings(false);
                  }}
                >
                  <Icon name={icon} />
                  <span>{label}</span>
                  {page === 'queue' && (
                    <span className="tab-count">{queuedSites.length}</span>
                  )}
                </button>
              ))}
            </nav>
            <span className="browser-wordmark">
              <img src="/app-icon.svg" alt="" width="20" height="20" /> hush
              <span className="version-badge">{appVersion}</span>
            </span>
          </div>
          <div className="workspace-toolbar">
            <div
              className="browser-navigation"
              role="group"
              aria-label="Page navigation"
            >
              <button
                className="browser-control"
                aria-label="Back"
                title="Back"
                disabled={navigation.index === 0}
                onClick={() => goBackOrForward(-1)}
              >
                <Icon name="back" />
              </button>
              <button
                className="browser-control"
                aria-label="Forward"
                title="Forward"
                disabled={navigation.index === navigation.entries.length - 1}
                onClick={() => goBackOrForward(1)}
              >
                <Icon name="arrow" />
              </button>
              <button
                className="browser-control"
                aria-label="Home"
                title="Home"
                onClick={goHome}
              >
                <Icon name="home" />
              </button>
            </div>
            <Omnibox onOpen={openSite} />
            <button
              className="browser-control customize-control"
              aria-label="Customize hush"
              title="Customize hush"
              onClick={() => {
                setShowSettings(!showSettings);
                if (!showSettings)
                  requestAnimationFrame(() =>
                    document
                      .getElementById('settings-panel')
                      ?.scrollIntoView({ block: 'start' }),
                  );
              }}
              aria-expanded={showSettings}
              aria-controls="settings-panel"
            >
              <Icon name="settings" />
            </button>
          </div>
          <nav className="bookmarks-bar" aria-label="Website collections">
            {categories.map((item, index) => (
              <button
                key={item}
                className={
                  view === 'websites' && category === item
                    ? 'bookmark-item selected'
                    : 'bookmark-item'
                }
                aria-pressed={view === 'websites' && category === item}
                onClick={() => {
                  setCategory(item);
                  setTrailId('');
                  setSearch('');
                  setView('websites');
                  setShowSettings(false);
                  requestAnimationFrame(() =>
                    document
                      .getElementById('websites')
                      ?.scrollIntoView({ block: 'start' }),
                  );
                }}
              >
                <Icon
                  name={
                    [
                      'grid',
                      'people',
                      'play',
                      'briefcase',
                      'globe',
                      'palette',
                      'monitor',
                      'link',
                    ][index]
                  }
                />
                {item === 'All websites' ? 'All bookmarks' : item}
              </button>
            ))}
          </nav>
        </header>
        <main id="main">
          {showSettings && (
            <SettingsPanel
              preferences={preferences}
              updatePreferences={updatePreferences}
              onClose={() => setShowSettings(false)}
              onViewHistory={() => {
                setView('history');
                setShowSettings(false);
              }}
            />
          )}
          <p className="notice" role="status">
            {notice}
          </p>
          {isNative && (
            <div className="mobile-catalog" role="status">
              <span>
                {catalogStatus === 'loading'
                  ? 'Checking for catalog updates…'
                  : catalogStatus === 'online'
                    ? 'Catalog up to date. Your personal data stays on this device.'
                    : 'Using the on-device catalog. Your links and settings are available.'}
              </span>
              {catalogStatus === 'offline' && (
                <button
                  className="add-button"
                  onClick={() => {
                    setCatalogStatus('loading');
                    setCatalogAttempt((value) => value + 1);
                  }}
                >
                  Retry update
                </button>
              )}
            </div>
          )}
          <Tools visible={view === 'tools'} />
          {view === 'tools' ? null : view === 'queue' ? (
            <NextUp
              entries={queuedSites}
              onOpen={openSite}
              onNote={(id, note) =>
                updateQueue(
                  updateQueueNote(queue, id, note),
                  'Next step saved.',
                )
              }
              onFinish={(site) =>
                updateQueue(
                  queue.filter((entry) => entry.siteId !== site.id),
                  `${site.name} marked done. Removed from Next up.`,
                )
              }
              onExplore={() => {
                setView('websites');
                setCategory('All websites');
                setTrailId('');
                setSearch('');
              }}
            />
          ) : view === 'history' ? (
            <History
              entries={history}
              recording={preferences.rememberHistory}
              onOpen={openSite}
              onClear={clearHistory}
              onSettings={() => setShowSettings(true)}
            />
          ) : (
            <>
              <section className="hero" aria-labelledby="start-title">
                <p className="start-eyebrow">
                  YOUR EVERYDAY, A LITTLE LIGHTER
                </p>
                <h1 id="start-title" className="start-wordmark">
                  hush<span>.</span>
                </h1>
                <p className="hero-description">
                  Less noise. More of the web you love.
                </p>
                <Omnibox prominent onOpen={openSite} />
                <p className="start-caption">
                  Search with Google · Your links, always within reach
                </p>
                <button
                  className="hero-tools-link"
                  onClick={() => setView('tools')}
                >
                  <Icon name="spark" /> Make room for focus <Icon name="arrow" />
                </button>
                <div
                  className="start-shortcuts"
                  role="group"
                  aria-label="Quick access"
                >
                  {(preferences.showFavorites ? favoriteSites : [])
                    .slice(0, 5)
                    .map((site) => (
                      <a
                        key={site.id}
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${site.name} (${destinationHint})`}
                        onClick={() => openSite(site)}
                        onAuxClick={(event) => {
                          if (event.button === 1) openSite(site);
                        }}
                      >
                        <span className={`shortcut-icon platform-${site.icon}`}>
                          <PlatformIcon name={site.icon} />
                        </span>
                        <span>{site.name}</span>
                      </a>
                    ))}
                  <button
                    onClick={() => {
                      setShowForm(true);
                      setError('');
                      requestAnimationFrame(() =>
                        document
                          .getElementById('add-website')
                          ?.scrollIntoView({ block: 'center' }),
                      );
                    }}
                  >
                    <span className="shortcut-icon">
                      <Icon name="plus" />
                    </span>
                    <span>Add shortcut</span>
                  </button>
                </div>
              </section>

              <section
                className="trails-section"
                aria-labelledby="trails-title"
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow section-eyebrow">
                      START WITH A PURPOSE
                    </p>
                    <h2 id="trails-title">What do you want to do?</h2>
                  </div>
                  <button
                    className="add-button"
                    onClick={() => {
                      setView('queue');
                      requestAnimationFrame(() =>
                        document.getElementById('next-up-title')?.focus(),
                      );
                    }}
                  >
                    Next up <span>{queuedSites.length}</span>
                    <Icon name="arrow" />
                  </button>
                </div>
                <div className="trails-grid">
                  {trails.map((trail, index) => (
                    <button
                      className={`trail-card ${trailId === trail.id ? 'selected' : ''}`}
                      key={trail.id}
                      aria-pressed={trailId === trail.id}
                      onClick={() => {
                        setTrailId(trail.id);
                        setCategory('All websites');
                        setSearch('');
                        requestAnimationFrame(() =>
                          document.getElementById('websites-title')?.focus(),
                        );
                      }}
                    >
                      <span className="trail-number">
                        0{index + 1} <Icon name="arrow" />
                      </span>
                      <strong>{trail.name}</strong>
                      <small>{trail.sites.length} steps to explore</small>
                    </button>
                  ))}
                </div>
              </section>
              {preferences.showFavorites && (
                <Favorites
                  favoriteSites={favoriteSites}
                  onOpen={openSite}
                  editingFavorites={editingFavorites}
                  onToggleEditing={() => setEditingFavorites(!editingFavorites)}
                  toggleFavorite={toggleFavorite}
                  reorderFavorite={reorderFavorite}
                />
              )}
              <section
                className="websites-section"
                id="websites"
                aria-labelledby="websites-title"
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow section-eyebrow">
                      PICK A DESTINATION
                    </p>
                    <h2 id="websites-title" tabIndex={-1}>
                      {trailId
                        ? trails.find((trail) => trail.id === trailId)?.name
                        : category === 'All websites'
                          ? 'Your everyday internet'
                          : category}
                      <span className="site-count">{visibleSites.length}</span>
                    </h2>
                  </div>
                  <button
                    className="add-button"
                    onClick={() => {
                      setShowForm(!showForm);
                      setError('');
                    }}
                    aria-expanded={showForm}
                    aria-controls="add-website"
                  >
                    <Icon name="plus" /> Add a website
                  </button>
                </div>
                {trailId && (
                  <div className="trail-detail">
                    <p>
                      {
                        trails.find((trail) => trail.id === trailId)
                          ?.description
                      }
                    </p>
                    <button
                      className="add-button"
                      onClick={() => setTrailId('')}
                    >
                      Exit trail <Icon name="close" />
                    </button>
                  </div>
                )}
                {showForm && (
                  <form
                    className="add-form"
                    id="add-website"
                    onSubmit={addSite}
                  >
                    <div className="form-heading">
                      <h3>Make room for a favorite</h3>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Close add website form"
                        onClick={() => setShowForm(false)}
                      >
                        <Icon name="close" />
                      </button>
                    </div>
                    <p>
                      Add any website. Your links are saved in this browser.
                    </p>
                    <div className="form-fields">
                      <label>
                        Website name
                        <input
                          autoFocus
                          required
                          maxLength={60}
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          placeholder="e.g. My favorite blog"
                        />
                      </label>
                      <label>
                        Website address
                        <input
                          required
                          value={url}
                          onChange={(event) => setUrl(event.target.value)}
                          placeholder="https://example.com"
                          aria-describedby={error ? 'url-error' : undefined}
                          aria-invalid={Boolean(error)}
                        />
                      </label>
                      <button className="save-button" type="submit">
                        Save website <Icon name="plus" />
                      </button>
                    </div>
                    {error && (
                      <p className="form-error" id="url-error" role="alert">
                        {error}
                      </p>
                    )}
                  </form>
                )}
                <label className="catalog-search">
                  <Icon name="search" />
                  <input
                    aria-label="Filter your websites"
                    placeholder="Find a bookmark, topic, or task"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setTrailId('');
                    }}
                  />
                  {search && (
                    <button
                      className="browser-control"
                      aria-label="Clear bookmark filter"
                      onClick={() => setSearch('')}
                    >
                      <Icon name="close" />
                    </button>
                  )}
                </label>
                <div className="filter-row">
                  <div
                    className="filter-tabs"
                    role="group"
                    aria-label="Filter websites"
                  >
                    {categories.map((item) => (
                      <button
                        key={item}
                        className={
                          category === item
                            ? 'filter-tab selected'
                            : 'filter-tab'
                        }
                        onClick={() => {
                          setCategory(item as Category);
                          setTrailId('');
                        }}
                        aria-pressed={view === 'websites' && category === item}
                      >
                        {item === 'All websites' ? 'All' : item}
                      </button>
                    ))}
                  </div>
                  <span className="filter-summary" role="status">
                    {visibleSites.length}{' '}
                    {visibleSites.length === 1 ? 'website' : 'websites'}
                    {search ? ` matching “${search}”` : ' to explore'}
                  </span>
                </div>
                <div className="website-grid">
                  {visibleSites.map((site) => (
                    <article
                      className={`website-card card-${site.icon}`}
                      key={site.id}
                    >
                      <a
                        className="website-link"
                        onClick={() => openSite(site)}
                        onAuxClick={(event) => {
                          if (event.button === 1) openSite(site);
                        }}
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${site.name} (${destinationHint})`}
                      >
                        <div className="card-top">
                          <span
                            className={`platform-icon platform-${site.icon}`}
                          >
                            <PlatformIcon name={site.icon} />
                          </span>
                          <span className="card-arrow">
                            <Icon name="external" />
                          </span>
                        </div>
                        <h3>{site.name}</h3>
                        <p>{site.description}</p>
                        <div className="card-bottom">
                          <span>
                            {new URL(site.url).hostname.replace(/^www\./, '')}
                          </span>
                          <span className="category-label">
                            {site.category === 'My links'
                              ? 'Personal'
                              : site.category}
                          </span>
                        </div>
                      </a>
                      <button
                        className="favorite-button"
                        aria-label={`${preferences.favorites.includes(site.id) ? 'Unfavorite' : 'Favorite'} ${site.name}`}
                        aria-pressed={preferences.favorites.includes(site.id)}
                        onClick={() => toggleFavorite(site)}
                      >
                        <Icon name="star" />
                      </button>
                      <button
                        className="queue-button"
                        aria-label={`${queue.some((entry) => entry.siteId === site.id) ? 'Remove' : 'Save'} ${site.name} ${queue.some((entry) => entry.siteId === site.id) ? 'from' : 'to'} Next up`}
                        aria-pressed={queue.some(
                          (entry) => entry.siteId === site.id,
                        )}
                        onClick={() => toggleNextUp(site)}
                      >
                        <Icon
                          name={
                            queue.some((entry) => entry.siteId === site.id)
                              ? 'check'
                              : 'plus'
                          }
                        />{' '}
                        Next up
                      </button>
                      {site.category === 'My links' && (
                        <button
                          className="remove-button"
                          aria-label={`Remove ${site.name}`}
                          onClick={() => removeSite(site)}
                        >
                          <Icon name="close" />
                        </button>
                      )}
                    </article>
                  ))}
                </div>
                {visibleSites.length === 0 && (
                  <div className="empty-state">
                    <Icon name="globe" />
                    <h3>
                      {search
                        ? 'No websites found'
                        : 'Your next favorite belongs here'}
                    </h3>
                    <p>
                      {search
                        ? 'Try a topic like coding, maps, or books. Exit the trail or choose All to broaden your search.'
                        : 'Use “Add a website” to save a place you love.'}
                    </p>
                  </div>
                )}
                <div className="destination-note">
                  <Icon name="external" />
                  <p>
                    Real websites. A fresh tab.{' '}
                    <span>
                      Every link takes you directly to its destination.
                    </span>
                  </p>
                </div>
              </section>
            </>
          )}
          <footer className="page-footer">
            <span>Less looking. More living.</span>
            <span>
              hush {appVersion} · Made for your everyday internet{' '}
              <span className="footer-spark">✳</span>
            </span>
          </footer>
        </main>
      </div>
      <nav className="mobile-navigation" aria-label="App pages">
        {pages.map(([page, label, icon]) => (
          <button
            key={page}
            aria-current={view === page ? 'page' : undefined}
            onClick={() => {
              setView(page);
              setShowSettings(false);
            }}
          >
            <Icon name={icon} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
