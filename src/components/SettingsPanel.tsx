import { useRef, useState } from 'react';
import { Icon } from './Icons';
import { createBackup, restoreBackup } from '../lib/backup';
import {
  accentColors,
  defaultPreferences,
  type Preferences,
  type ThemeMode,
} from '../lib/preferences';
import { appVersion } from '../lib/version';

type SettingsPanelProps = {
  preferences: Preferences;
  updatePreferences: (next: Preferences, message: string) => void;
  onClose: () => void;
  onViewHistory: () => void;
};

const sections = [
  ['appearance', 'Appearance', 'sun'],
  ['privacy', 'Privacy and history', 'history'],
  ['backup', 'Backup and restore', 'note'],
  ['about', 'About hush', 'spark'],
] as const;

type SectionId = (typeof sections)[number][0];

export function SettingsPanel({
  preferences,
  updatePreferences,
  onClose,
  onViewHistory,
}: SettingsPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [backupStatus, setBackupStatus] = useState('');
  const [section, setSection] = useState<SectionId>('appearance');

  function exportBackup() {
    const url = URL.createObjectURL(
      new Blob([createBackup(localStorage)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hush-backup.json';
    link.click();
    URL.revokeObjectURL(url);
    setBackupStatus('Backup downloaded.');
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    if (restoreBackup(await file.text(), localStorage) === null) {
      setBackupStatus(
        'That file is not a valid hush backup. Nothing was changed.',
      );
      return;
    }
    window.location.reload();
  }

  const label = (value: string) => value[0].toUpperCase() + value.slice(1);

  return (
    <section
      className="appearance-panel settings-chrome"
      id="settings-panel"
      aria-labelledby="settings-title"
    >
      <div className="settings-topbar">
        <h2 id="settings-title">Settings</h2>
        <button
          className="icon-button"
          aria-label="Close settings"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {sections.map(([id, title, icon]) => (
            <button
              key={id}
              aria-current={section === id ? 'page' : undefined}
              className={section === id ? 'selected' : undefined}
              onClick={() => setSection(id)}
            >
              <Icon name={icon} /> {title}
            </button>
          ))}
        </nav>
        <div className="settings-content">
          {section === 'appearance' && (
            <div className="settings-card">
              <h3>Appearance</h3>
              <div className="settings-row">
                <span>
                  <strong>Theme</strong>
                  <small>System follows your device.</small>
                </span>
                <div className="mode-options" role="group" aria-label="Theme">
                  {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                    <button
                      key={mode}
                      className={
                        preferences.mode === mode
                          ? 'mode-button selected'
                          : 'mode-button'
                      }
                      aria-pressed={preferences.mode === mode}
                      onClick={() =>
                        updatePreferences(
                          { ...preferences, mode },
                          `${label(mode)} appearance selected.`,
                        )
                      }
                    >
                      <Icon
                        name={
                          mode === 'light'
                            ? 'sun'
                            : mode === 'dark'
                              ? 'moon'
                              : 'monitor'
                        }
                      />
                      {label(mode)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-row">
                <span>
                  <strong>Accent color</strong>
                  <small>Choose a preset or pick your own.</small>
                </span>
                <div
                  className="color-options"
                  role="group"
                  aria-label="Accent color"
                >
                  {accentColors.map((color) => (
                    <button
                      key={color.name}
                      className="color-swatch"
                      style={{ background: color.value }}
                      aria-label={`${color.name} accent`}
                      aria-pressed={
                        preferences.accent.toLowerCase() === color.value
                      }
                      onClick={() =>
                        updatePreferences(
                          { ...preferences, accent: color.value },
                          `${color.name} accent selected.`,
                        )
                      }
                    >
                      {preferences.accent.toLowerCase() === color.value && (
                        <Icon name="check" />
                      )}
                    </button>
                  ))}
                  <label className="custom-color">
                    <input
                      type="color"
                      aria-label="Custom accent color"
                      value={preferences.accent}
                      onChange={(event) =>
                        updatePreferences(
                          { ...preferences, accent: event.target.value },
                          'Custom accent selected.',
                        )
                      }
                    />
                    <span>Custom</span>
                  </label>
                </div>
              </div>
              <label className="settings-row clickable">
                <span>
                  <strong>Show favorites</strong>
                  <small>
                    Hiding favorites keeps their contents and order.
                  </small>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={preferences.showFavorites}
                  onChange={(event) =>
                    updatePreferences(
                      { ...preferences, showFavorites: event.target.checked },
                      event.target.checked
                        ? 'Favorites shown.'
                        : 'Favorites hidden.',
                    )
                  }
                />
              </label>
              <div className="settings-row">
                <span>
                  <strong>Reset appearance</strong>
                  <small>Restore the default theme and accent color.</small>
                </span>
                <button
                  className="add-button"
                  onClick={() =>
                    updatePreferences(
                      {
                        ...preferences,
                        mode: defaultPreferences.mode,
                        accent: defaultPreferences.accent,
                      },
                      'Appearance reset to defaults.',
                    )
                  }
                >
                  Reset
                </button>
              </div>
            </div>
          )}
          {section === 'privacy' && (
            <div className="settings-card">
              <h3>Privacy and history</h3>
              <label className="settings-row clickable">
                <span>
                  <strong>Remember recently opened websites</strong>
                  <small>
                    Save the last 50 destinations opened from hush in this
                    browser only. Turning this off keeps existing history.
                  </small>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={preferences.rememberHistory}
                  onChange={(event) =>
                    updatePreferences(
                      { ...preferences, rememberHistory: event.target.checked },
                      event.target.checked
                        ? 'History recording turned on.'
                        : 'History recording paused.',
                    )
                  }
                />
              </label>
              <div className="settings-row">
                <span>
                  <strong>View or clear history</strong>
                  <small>Only hush activity, not your browser history.</small>
                </span>
                <button className="add-button" onClick={onViewHistory}>
                  <Icon name="history" /> Open history
                </button>
              </div>
            </div>
          )}
          {section === 'backup' && (
            <div className="settings-card">
              <h3>Backup and restore</h3>
              <div className="settings-row">
                <span>
                  <strong>Export backup</strong>
                  <small>
                    Links, favorites, Next up, history, settings, and notes in
                    one file. Backups are plain text.
                  </small>
                </span>
                <button className="add-button" onClick={exportBackup}>
                  Export
                </button>
              </div>
              <div className="settings-row">
                <span>
                  <strong>Import backup</strong>
                  <small>Replaces the data currently in this browser.</small>
                </span>
                <button
                  className="add-button"
                  onClick={() => fileInput.current?.click()}
                >
                  Import
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={(event) => {
                    void importBackup(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
              </div>
              <p className="settings-status" role="status">
                {backupStatus}
              </p>
            </div>
          )}
          {section === 'about' && (
            <div className="settings-card">
              <h3>About hush</h3>
              <div className="settings-row">
                <span>
                  <strong>hush</strong>
                  <small>Version {appVersion}</small>
                </span>
              </div>
              <div className="settings-row">
                <span>
                  <strong>Your data</strong>
                  <small>
                    Everything is saved only in this browser. No account or
                    backend.
                  </small>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
