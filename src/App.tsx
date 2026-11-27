import React, { Suspense, lazy, useEffect, useLayoutEffect, useState } from 'react';
import { DEFAULT_BUILD_CONFIG, type BuildConfig } from './data/kf01Data';
import { HeaderNav, type ActiveView } from './components/HeaderNav';
import { HeroSection } from './components/sections/HeroSection';
import { EngineeringBento } from './components/sections/EngineeringBento';
import { MechanicalAnatomy } from './components/sections/MechanicalAnatomy';
import { SwitchLab } from './components/sections/SwitchLab';
import { BuildStudio } from './components/sections/BuildStudio';
import { MaterialLibrary } from './components/sections/MaterialLibrary';
import { ClosingStatement } from './components/sections/ClosingStatement';

const DesignSystemPreview = lazy(() =>
  import('./views/DesignSystemPreview').then((mod) => ({
    default: mod.DesignSystemPreview,
  })),
);

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>(() =>
    window.location.hash === '#/design-system' ? 'design-system' : 'prototype',
  );
  const [buildConfig, setBuildConfig] = useState<BuildConfig>(DEFAULT_BUILD_CONFIG);

  useLayoutEffect(() => {
    // The browser can resolve the initial fragment before React has rendered the section.
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' });
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === '#/design-system') {
        setActiveView('design-system');
      } else if (activeView === 'design-system') {
        setActiveView('prototype');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [activeView]);

  const handleChangeView = (view: ActiveView) => {
    setActiveView(view);
    if (view === 'design-system') {
      window.history.replaceState(null, '', '#/design-system');
    } else {
      window.history.replaceState(null, '', '#hero');
    }
  };

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <HeaderNav activeView={activeView} onChangeView={handleChangeView} />

      <main id="main-content">
        {activeView === 'design-system' ? (
          <Suspense
            fallback={
              <section className="kf-section env-after-hours">
                <div className="kf-container">
                  <p className="kf-micro">Loading Design System & Brand Lab…</p>
                </div>
              </section>
            }
          >
            <DesignSystemPreview
              onBackToPrototype={() => {
                handleChangeView('prototype');
                window.scrollTo({ top: 0 });
              }}
            />
          </Suspense>
        ) : (
          <>
            <HeroSection />
            <EngineeringBento />
            <MechanicalAnatomy />
            <SwitchLab
              selectedStudioSwitch={buildConfig.switchProfile}
              onApplyToStudio={(switchProfile) =>
                setBuildConfig((prev) => ({ ...prev, switchProfile }))
              }
            />
            <MaterialLibrary />
            <BuildStudio config={buildConfig} onChangeConfig={setBuildConfig} />
            <ClosingStatement
              config={buildConfig}
              onOpenDesignSystem={() => {
                handleChangeView('design-system');
                window.scrollTo({ top: 0 });
              }}
            />
          </>
        )}
      </main>
    </>
  );
};

export default App;
