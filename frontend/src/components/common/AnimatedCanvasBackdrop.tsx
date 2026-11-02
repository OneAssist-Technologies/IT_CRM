import React from 'react';
import { Box, useComputedColorScheme } from '@mantine/core';

export const AnimatedCanvasBackdrop: React.FC = () => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  return (
    <Box
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {/* Light & Minimal ambient drift animations */}
      <style>
        {`
          @keyframes minimalDrift1 {
            0%, 100% {
              transform: translate3d(0, 0, 0) scale(1);
            }
            50% {
              transform: translate3d(30px, -20px, 0) scale(1.08);
            }
          }

          @keyframes minimalDrift2 {
            0%, 100% {
              transform: translate3d(0, 0, 0) scale(1);
            }
            50% {
              transform: translate3d(-25px, 25px, 0) scale(1.06);
            }
          }

          @keyframes minimalDrift3 {
            0%, 100% {
              transform: translate3d(0, 0, 0) scale(1);
            }
            50% {
              transform: translate3d(20px, 20px, 0) scale(1.05);
            }
          }

          @keyframes minimalTwinkle {
            0%, 100% {
              opacity: 0.15;
              transform: scale(0.85);
            }
            50% {
              opacity: 0.55;
              transform: scale(1.1);
            }
          }
        `}
      </style>

      {/* 1. Ultra-Faint Subtle Micro-Dot Texture (Barely visible, clean & light) */}
      <Box
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: isDark
            ? 'radial-gradient(rgba(56, 189, 248, 0.1) 1px, transparent 1px)'
            : 'radial-gradient(rgba(37, 99, 235, 0.05) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.6,
          maskImage: 'radial-gradient(ellipse 90% 70% at 50% 25%, black 30%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 25%, black 30%, transparent 85%)',
        }}
      />

      {/* 2. Soft Ambient Sky-Blue Orb (Top-Right behind header/actions) */}
      <Box
        style={{
          position: 'absolute',
          top: '-10%',
          right: '5%',
          width: 540,
          height: 440,
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(37, 99, 235, 0.2) 0%, rgba(6, 182, 212, 0.1) 50%, transparent 75%)'
            : 'radial-gradient(circle, rgba(186, 230, 253, 0.45) 0%, rgba(224, 242, 254, 0.25) 45%, transparent 70%)',
          filter: 'blur(100px)',
          animation: 'minimalDrift1 22s ease-in-out infinite',
        }}
      />

      {/* 3. Soft Ambient Lavender Orb (Center-Left behind stats) */}
      <Box
        style={{
          position: 'absolute',
          top: '22%',
          left: '4%',
          width: 480,
          height: 400,
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(129, 140, 248, 0.18) 0%, rgba(192, 132, 252, 0.1) 50%, transparent 75%)'
            : 'radial-gradient(circle, rgba(221, 214, 254, 0.35) 0%, rgba(243, 232, 255, 0.2) 50%, transparent 70%)',
          filter: 'blur(110px)',
          animation: 'minimalDrift2 26s ease-in-out infinite',
        }}
      />

      {/* 4. Soft Ambient Mint/Cyan Orb (Bottom-Right behind meetings/charts) */}
      <Box
        style={{
          position: 'absolute',
          bottom: '5%',
          right: '10%',
          width: 460,
          height: 380,
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(165, 243, 252, 0.3) 0%, rgba(207, 250, 254, 0.15) 50%, transparent 70%)',
          filter: 'blur(110px)',
          animation: 'minimalDrift3 28s ease-in-out infinite',
        }}
      />

      {/* 5. Minimal Delicate Light Twinkles (Very faint & subtle) */}
      <Box
        style={{
          position: 'absolute',
          top: '12%',
          right: '15%',
          width: 14,
          height: 14,
          animation: 'minimalTwinkle 6s ease-in-out infinite',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
            fill={isDark ? '#38BDF8' : '#60A5FA'}
            opacity="0.5"
          />
        </svg>
      </Box>

      <Box
        style={{
          position: 'absolute',
          top: '35%',
          left: '8%',
          width: 12,
          height: 12,
          animation: 'minimalTwinkle 7s ease-in-out infinite 2s',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
            fill={isDark ? '#818CF8' : '#A78BFA'}
            opacity="0.45"
          />
        </svg>
      </Box>
    </Box>
  );
};

export default AnimatedCanvasBackdrop;
