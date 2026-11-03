import React from 'react';
import { Box, useComputedColorScheme } from '@mantine/core';

export const SidebarWaveBackdrop: React.FC = () => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  // In light mode, hide the cyber waves to keep navigation text completely clean and uncluttered
  if (!isDark) return null;

  return (
    <Box
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 210,
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 0,
        overflow: 'hidden',
        maskImage: 'linear-gradient(to top, rgba(0, 0, 0, 1) 40%, rgba(0, 0, 0, 0.4) 80%, rgba(0, 0, 0, 0) 100%)',
        WebkitMaskImage: 'linear-gradient(to top, rgba(0, 0, 0, 1) 40%, rgba(0, 0, 0, 0.4) 80%, rgba(0, 0, 0, 0) 100%)',
      }}
    >
      {/* 1. Ultra-subtle Ambient Floor Glow */}
      <Box
        style={{
          position: 'absolute',
          bottom: '-25%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 280,
          height: 120,
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(ellipse at center, rgba(37, 99, 235, 0.16) 0%, rgba(59, 130, 246, 0.06) 50%, transparent 80%)'
            : 'radial-gradient(ellipse at center, rgba(0, 198, 255, 0.22) 0%, rgba(0, 112, 243, 0.08) 50%, transparent 80%)',
          filter: 'blur(32px)',
        }}
      />

      {/* 2. Refined, Minimal Clean Wave (Matching Login Page) */}
      <svg
        viewBox="0 0 400 240"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '100%',
          willChange: 'transform',
        }}
      >
        <defs>
          {/* Ethereal Minimal Wave Fill */}
          <linearGradient id="minimalWaveFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isDark ? '#1D4ED8' : '#0070F3'} stopOpacity={isDark ? 0.12 : 0.07} />
            <stop offset="50%" stopColor={isDark ? '#2563EB' : '#00C6FF'} stopOpacity={isDark ? 0.06 : 0.03} />
            <stop offset="100%" stopColor={isDark ? '#071126' : '#EAF2FC'} stopOpacity={0.0} />
          </linearGradient>

          {/* Minimal Sapphire to Ice-Blue Stroke Gradient */}
          <linearGradient id="minimalCrestGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isDark ? '#1D4ED8' : '#0055FF'} stopOpacity={0.4} />
            <stop offset="40%" stopColor={isDark ? '#3B82F6' : '#0070F3'} stopOpacity={0.7} />
            <stop offset="75%" stopColor={isDark ? '#60A5FA' : '#00C6FF'} stopOpacity={0.65} />
            <stop offset="100%" stopColor={isDark ? '#93C5FD' : '#38BDF8'} stopOpacity={0.4} />
          </linearGradient>

          <linearGradient id="minimalSecGrad" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isDark ? '#60A5FA' : '#00C6FF'} stopOpacity={0.35} />
            <stop offset="60%" stopColor={isDark ? '#3B82F6' : '#0070F3'} stopOpacity={0.2} />
            <stop offset="100%" stopColor={isDark ? '#1E40AF' : '#0055FF'} stopOpacity={0.05} />
          </linearGradient>

          {/* Whispering Subtle Glow Filter */}
          <filter id="minimalCrispGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Minimal Lower Wave Layer */}
        <g style={{ animation: 'sidebarWaveFloat2 20s ease-in-out infinite' }}>
          {/* Ultra-soft translucent fill */}
          <path
            d="M -10 140 C 70 165, 160 125, 240 145 C 310 162, 365 148, 410 135 L 410 250 L -10 250 Z"
            fill="url(#minimalWaveFill)"
          />

          {/* Primary Minimal Line - thin 0.95px */}
          <path
            d="M -10 140 C 70 165, 160 125, 240 145 C 310 162, 365 148, 410 135"
            fill="none"
            stroke="url(#minimalCrestGrad)"
            strokeWidth="0.95"
            filter="url(#minimalCrispGlow)"
          />
        </g>

        {/* Minimal Secondary Hairline Accent (0.7px) */}
        <g style={{ animation: 'sidebarWaveFloat1 24s ease-in-out infinite' }}>
          <path
            d="M -10 160 C 85 185, 175 145, 255 165 C 320 180, 375 168, 410 155"
            fill="none"
            stroke="url(#minimalSecGrad)"
            strokeWidth="0.7"
            strokeDasharray="400"
            strokeDashoffset="0"
          />
        </g>
      </svg>
    </Box>
  );
};

export default SidebarWaveBackdrop;
