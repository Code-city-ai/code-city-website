import React from 'react';

export default function Brand({ href = '/', className = '' }) {
  return (
    <a className={`brand ${className}`.trim()} href={href} aria-label="Code City home">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
      <span className="brand-name">CODE CITY</span>
    </a>
  );
}
