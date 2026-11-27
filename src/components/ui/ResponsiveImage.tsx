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
 * sourced from the production image registry.
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
