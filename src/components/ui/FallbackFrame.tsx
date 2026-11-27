import React, { useState } from 'react';
import type { ShotId } from '../../assets/kf003bManifest';
import { ResponsiveImage } from './ResponsiveImage';

interface FallbackFrameProps {
  shotId: ShotId;
  sizes?: string;
  alt?: string;
  captionLeft?: string;
  captionRight?: string;
  dark?: boolean;
  aspectRatio?: string;
  imgClassName?: string;
  priority?: boolean;
  simulateLoading?: boolean;
  simulateError?: boolean;
}

export const FallbackFrame: React.FC<FallbackFrameProps> = ({
  shotId,
  sizes = '(min-width: 768px) 50vw, 100vw',
  alt,
  captionLeft,
  captionRight,
  dark = false,
  aspectRatio = '3 / 2',
  imgClassName = '',
  priority = false,
  simulateLoading = false,
  simulateError = false,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const showError = simulateError || errored;
  const showSkeleton = simulateLoading || (!loaded && !showError);

  return (
    <figure style={{ margin: 0 }}>
      <div
        className={`kf-media-frame ${dark ? 'kf-media-frame--dark' : ''}`}
        style={{ aspectRatio }}
      >
        {showSkeleton && <div className="kf-media-frame__skeleton" aria-hidden="true" />}
        {showError ? (
          <div className="kf-media-frame__fallback" role="status">
            <span className="kf-micro">Media Unavailable</span>
            <p className="kf-body" style={{ fontSize: '0.875rem', textAlign: 'center' }}>
              Production render asset could not be loaded. Fallback technical frame active.
            </p>
          </div>
        ) : (
          <ResponsiveImage
            shotId={shotId}
            sizes={sizes}
            alt={alt}
            priority={priority}
            className={`kf-media-frame__img ${imgClassName}`}
            style={{ opacity: showSkeleton ? 0 : 1 }}
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
          />
        )}
      </div>
      {(captionLeft || captionRight) && (
        <figcaption className="kf-media-caption">
          <span>{captionLeft}</span>
          <span>{captionRight}</span>
        </figcaption>
      )}
    </figure>
  );
};
