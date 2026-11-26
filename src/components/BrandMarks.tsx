import React from 'react';

interface MarkProps {
  className?: string;
  height?: number;
  accentColor?: string;
}

/** Direction 01 (Recommended Primary Wordmark): Swiss-Inspired Typographic Wordmark */
export const SwissWordmark: React.FC<MarkProps> = ({
  className,
  height = 20,
  accentColor = '#B49A70',
}) => (
  <svg
    className={className}
    height={height}
    viewBox="0 0 264 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="KEYFORM"
  >
    <g fill="currentColor">
      <path d="M2 4H5.2V13.4L14.4 4H18.6L9.7 13.1L19.4 24H15.1L7.3 15.1L5.2 17.2V24H2V4Z" />
      <path d="M36 4H52.5V6.9H39.2V12.4H50.8V15.3H39.2V21.1H52.8V24H36V4Z" />
      <path d="M68 4H71.7L78.4 13.8L85.1 4H88.8L80 16.6V24H76.8V16.6L68 4Z" />
      <path d="M105 4H121.2V6.9H108.2V12.7H119.5V15.6H108.2V24H105V4Z" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M144.8 3.6H153.2C157.8 3.6 161 6.8 161 11.4V16.6C161 21.2 157.8 24.4 153.2 24.4H144.8C140.2 24.4 137 21.2 137 16.6V11.4C137 6.8 140.2 3.6 144.8 3.6ZM145 6.6C142 6.6 140.2 8.4 140.2 11.5V16.5C140.2 19.6 142 21.4 145 21.4H153C156 21.4 157.8 19.6 157.8 16.5V11.5C157.8 8.4 156 6.6 153 6.6H145Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M179 4H191.2C195.4 4 198 6.4 198 10.2C198 13.4 196.1 15.6 192.8 16.2L198.6 24H194.8L189.4 16.6H182.2V24H179V4ZM182.2 6.9V13.8H190.9C193.4 13.8 194.8 12.4 194.8 10.3C194.8 8.2 193.4 6.9 190.9 6.9H182.2Z"
      />
      <path d="M216 4H220.2L228.5 18.2L236.8 4H241V24H237.8V9.2L229.8 22.8H227.2L219.2 9.2V24H216V4Z" />
    </g>
    <rect x="254" y="21" width="8" height="3" fill={accentColor} />
  </svg>
);

/** Direction 02 (Alternate for Review): Geometric KF Monogram */
export const KFMonogram: React.FC<MarkProps> = ({ className, height = 36 }) => (
  <svg
    className={className}
    width={height}
    height={height}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="KF Monogram"
  >
    <path d="M4 4H37L44 11V44H4V4Z" stroke="currentColor" strokeWidth="2.5" />
    <g fill="currentColor">
      <rect x="11" y="13" width="3.2" height="22" />
      <path d="M14.2 23.2L23.5 13H27.4L18.2 23.1L27.6 35H23.6L16 25.3L14.2 27.2V23.2Z" />
      <rect x="28.5" y="13" width="9.5" height="3" />
      <rect x="28.5" y="13" width="3.2" height="22" />
      <rect x="28.5" y="22.5" width="7.5" height="3" />
    </g>
  </svg>
);

/** Direction 03 (Recommended Supporting Symbol): Machined Key Datum Symbol */
export const MachinedSymbol: React.FC<MarkProps> = ({
  className,
  height = 28,
  accentColor = 'currentColor',
}) => (
  <svg
    className={className}
    width={height}
    height={height}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="KEYFORM Key Datum Symbol"
  >
    <rect x="4" y="4" width="40" height="40" rx="4" stroke="currentColor" strokeWidth="2.5" />
    <rect x="10.5" y="9.5" width="27" height="25.5" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
    <path
      d="M24 16V28.5M17.75 22.25H30.25"
      stroke={accentColor}
      strokeWidth="2.5"
      strokeLinecap="square"
    />
    <line x1="10.5" y1="39" x2="37.5" y2="39" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.55" />
  </svg>
);
