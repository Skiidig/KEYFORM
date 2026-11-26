import React from 'react';
import {
  KF003B_ASSETS,
  buildSrcSet,
  type ShotId,
} from '../../assets/kf003bManifest';

export interface ResponsiveImageProps {
  shotId: ShotId;
  sizes: string;
  alt?: string;
  className?: string;
  pictureClassName?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  decorative?: boolean;
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
  onError?: React.ReactEventHandler<HTMLImageElement>;
}

/**
 * Renders a responsive <picture> element with AVIF primary and WebP fallback
 * sourced exclusively from verified KF-003B web derivatives.
 */
export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  shotId,
  sizes,
  alt,
  className,
  pictureClassName,
  style,
  priority = false,
  decorative = false,
  onLoad,
  onError,
}) => {
  const asset = KF003B_ASSETS[shotId];
  const resolvedAlt = decorative ? '' : (alt ?? asset.defaultAlt);

  return (
    <picture className={pictureClassName}>
      <source type="image/avif" srcSet={buildSrcSet(asset, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={buildSrcSet(asset, 'webp')} sizes={sizes} />
      <img
        src={asset.fallbackSrc}
        alt={resolvedAlt}
        width={asset.intrinsicWidth}
        height={asset.intrinsicHeight}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : undefined}
        className={className}
        style={style}
        onLoad={onLoad}
        onError={onError}
      />
    </picture>
  );
};

export interface ArtDirectedHeroPictureProps {
  desktopShotId: ShotId;
  mobileShotId: ShotId;
  breakpointPx?: number;
  alt: string;
  className?: string;
  pictureClassName?: string;
}

/**
 * Single-<picture> art-directed hero image.
 * Ensures desktop viewports fetch only A01 (16:9) and mobile viewports fetch
 * only A02 (1:1), eliminating duplicate eager hero downloads.
 */
export const ArtDirectedHeroPicture: React.FC<ArtDirectedHeroPictureProps> = ({
  desktopShotId,
  mobileShotId,
  breakpointPx = 768,
  alt,
  className,
  pictureClassName,
}) => {
  const desktopAsset = KF003B_ASSETS[desktopShotId];
  const mobileAsset = KF003B_ASSETS[mobileShotId];
  const desktopMedia = `(min-width: ${breakpointPx}px)`;
  const mobileMedia = `(max-width: ${breakpointPx - 1}px)`;

  return (
    <picture className={pictureClassName}>
      <source
        media={desktopMedia}
        type="image/avif"
        srcSet={buildSrcSet(desktopAsset, 'avif')}
        sizes="100vw"
      />
      <source
        media={desktopMedia}
        type="image/webp"
        srcSet={buildSrcSet(desktopAsset, 'webp')}
        sizes="100vw"
      />
      <source
        media={mobileMedia}
        type="image/avif"
        srcSet={buildSrcSet(mobileAsset, 'avif')}
        sizes="100vw"
      />
      <source
        media={mobileMedia}
        type="image/webp"
        srcSet={buildSrcSet(mobileAsset, 'webp')}
        sizes="100vw"
      />
      <img
        src={desktopAsset.fallbackSrc}
        alt={alt}
        width={desktopAsset.intrinsicWidth}
        height={desktopAsset.intrinsicHeight}
        loading="eager"
        decoding="sync"
        fetchPriority="high"
        className={className}
      />
    </picture>
  );
};
