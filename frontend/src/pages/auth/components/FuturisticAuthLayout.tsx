import React from 'react';
import {
  Box,
  Group,
  Text,
} from '@mantine/core';
import { useCRM } from '../../../context/CRMContext';

interface FuturisticAuthLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onReturnToDashboard?: () => void;
}

export const FuturisticAuthLayout: React.FC<FuturisticAuthLayoutProps> = ({
  children,
  onReturnToDashboard,
}) => {
  const { setActiveNav } = useCRM();

  const handleReturn = () => {
    if (onReturnToDashboard) {
      onReturnToDashboard();
    } else {
      setActiveNav('dashboard');
    }
  };

  return (
    <Box
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: '#040B1E',
        backgroundImage: 'url(/auth-bg.jpg)',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Keyframe Animations for Subtle Ambient Breathing Glow */}
      <style>
        {`
          @keyframes ambientLightPulse {
            0%, 100% {
              opacity: 0.45;
              transform: scale(1);
            }
            50% {
              opacity: 0.75;
              transform: scale(1.08);
            }
          }

          @keyframes floorGlowPulse {
            0%, 100% {
              opacity: 0.55;
              transform: scaleX(1);
            }
            50% {
              opacity: 0.85;
              transform: scaleX(1.15);
            }
          }
        `}
      </style>

      {/* Subtle Dynamic Ambient Lighting on 3D Glass Orbs (Left & Right) */}
      <Box
        style={{
          position: 'absolute',
          top: '25%',
          left: '2%',
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 210, 255, 0.22) 0%, rgba(37, 99, 235, 0.12) 50%, transparent 75%)',
          filter: 'blur(60px)',
          animation: 'ambientLightPulse 8s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      <Box
        style={{
          position: 'absolute',
          top: '35%',
          right: '3%',
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.25) 0%, rgba(0, 210, 255, 0.15) 50%, transparent 75%)',
          filter: 'blur(65px)',
          animation: 'ambientLightPulse 10s ease-in-out infinite 2s',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Bottom Center Floor Spotlight Reflection */}
      <Box
        style={{
          position: 'absolute',
          bottom: '-5%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 140,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at 50% 50%, rgba(0, 210, 255, 0.3) 0%, rgba(37, 99, 235, 0.2) 40%, transparent 75%)',
          filter: 'blur(45px)',
          animation: 'floorGlowPulse 7s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Top Header Bar */}
      <Box
        px={{ base: 'md', sm: 'xl', md: 48 }}
        py={{ base: 'md', md: 24 }}
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
        }}
      >
        {/* Brand Logo (Top Left) */}
        <Group gap="xs" style={{ cursor: 'pointer' }} onClick={handleReturn}>
          <Box
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #00D2FF 0%, #2563EB 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 18px rgba(0, 210, 255, 0.45)',
              color: '#FFFFFF',
            }}
          >
            <Text fw={900} size="20px" c="#FFFFFF" style={{ letterSpacing: '-0.04em', fontFamily: 'system-ui' }}>
              a
            </Text>
          </Box>
          <Box>
            <Text
              fw={800}
              size="18px"
              style={{
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              OneAssist <Text span inherit fw={800} style={{ color: '#00D2FF' }}>CRM</Text>
            </Text>
            <Text
              size="10px"
              fw={700}
              style={{ color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}
            >
              IT Sales & Operations Hub
            </Text>
          </Box>
        </Group>
      </Box>

      {/* Center Stage: Card Centered Perfectly in Viewport */}
      <Box
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 10,
          padding: '16px 16px 40px',
          width: '100%',
        }}
      >
        <Box
          style={{
            width: '100%',
            maxWidth: 440,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default FuturisticAuthLayout;
