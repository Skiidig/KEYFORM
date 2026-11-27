import React, { useEffect, useRef, useState } from 'react';
import { MachinedSymbol, SwissWordmark } from './BrandMarks';

export type ActiveView = 'prototype' | 'design-system';

interface HeaderNavProps {
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
}

const SECTION_LINKS = [
  { href: '#engineering', label: 'Engineering', num: '02' },
  { href: '#anatomy', label: 'Anatomy', num: '03' },
  { href: '#switch-lab', label: 'Switches', num: '04' },
  { href: '#materials', label: 'Materials', num: '05' },
];

export const HeaderNav: React.FC<HeaderNavProps> = ({ activeView, onChangeView }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileOpen(false);
        menuBtnRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const navigateToSection = (href: string) => {
    setMobileOpen(false);
    if (activeView !== 'prototype') {
      onChangeView('prototype');
      window.setTimeout(() => {
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    }
  };

  return (
    <header className="kf-header env-after-hours">
      <div className="kf-container kf-header__inner">
        <a
          href="#hero"
          className="kf-brand-link"
          aria-label="KEYFORM KF—01 Home"
          onClick={(e) => {
            setMobileOpen(false);
            if (activeView !== 'prototype') {
              e.preventDefault();
              onChangeView('prototype');
              window.scrollTo({ top: 0 });
            }
          }}
        >
          <MachinedSymbol height={21} accentColor="#B49A70" />
          <SwissWordmark height={13} accentColor="#B49A70" />
          <span className="kf-brand-link__divider" aria-hidden="true" />
          <span className="kf-brand-link__model">KF—01</span>
        </a>

        <nav className="kf-nav-desktop" aria-label="Primary navigation">
          {SECTION_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="kf-nav-link"
              onClick={() => navigateToSection(link.href)}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="kf-header__actions">
          {activeView === 'design-system' ? (
            <button
              type="button"
              className="kf-nav-cta"
              onClick={() => {
                setMobileOpen(false);
                onChangeView('prototype');
                window.scrollTo({ top: 0 });
              }}
            >
              ← Return to KF—01
            </button>
          ) : (
            <a
              href="#build-studio"
              className="kf-nav-cta kf-nav-cta--desktop"
              onClick={() => navigateToSection('#build-studio')}
            >
              Build Studio
            </a>
          )}

          <button
            ref={menuBtnRef}
            type="button"
            className="kf-mobile-menu-btn"
            aria-expanded={mobileOpen}
            aria-controls="kf-mobile-drawer"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              {mobileOpen ? (
                <path
                  d="M4 4L16 16M16 4L4 16"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="square"
                />
              ) : (
                <path
                  d="M3 6H17M3 10H17M3 14H17"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="square"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="kf-mobile-drawer"
          className="kf-mobile-drawer"
          aria-label="Mobile section navigation"
        >
          <ul className="kf-mobile-drawer__list">
            {SECTION_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="kf-mobile-drawer__link"
                  onClick={() => navigateToSection(link.href)}
                >
                  <span>{link.label}</span>
                  <span className="kf-mobile-drawer__num">{link.num}</span>
                </a>
              </li>
            ))}
            <li>
              <a
                href="#build-studio"
                className="kf-mobile-drawer__link kf-mobile-drawer__link--accent"
                onClick={() => navigateToSection('#build-studio')}
              >
                <span>Build Studio</span>
                <span className="kf-mobile-drawer__num">06</span>
              </a>
            </li>
          </ul>
          {activeView === 'design-system' && (
            <div className="kf-mobile-drawer__dev">
              <button
                type="button"
                className="kf-mobile-drawer__sublink"
                onClick={() => {
                  setMobileOpen(false);
                  onChangeView('prototype');
                  window.scrollTo({ top: 0 });
                }}
              >
                ← Back to KF—01 Showcase
              </button>
            </div>
          )}
        </nav>
      )}
    </header>
  );
};
