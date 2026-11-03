import React from 'react';
import {
  Box,
  Group,
  Text,
} from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
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
        background: 'radial-gradient(ellipse at 85% 15%, #E1EEFD 0%, #F5F9FE 45%, #EAF2FC 100%)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Keyframe Animations for Floating 3D Cubes & Ambient Lighting */}
      <style>
        {`
          @keyframes floatCubeSlow {
            0%, 100% {
              transform: translateY(0px) rotate(26deg);
            }
            50% {
              transform: translateY(-16px) rotate(28deg);
            }
          }

          @keyframes floatGlass1 {
            0%, 100% {
              transform: translateY(0px) rotate(14deg);
            }
            50% {
              transform: translateY(-12px) rotate(16deg);
            }
          }

          @keyframes floatGlass2 {
            0%, 100% {
              transform: translateY(0px) rotate(-12deg);
            }
            50% {
              transform: translateY(14px) rotate(-10deg);
            }
          }

          @keyframes ambientGlowPulse {
            0%, 100% {
              opacity: 0.5;
              transform: scale(1);
            }
            50% {
              opacity: 0.8;
              transform: scale(1.08);
            }
          }
        `}
      </style>

      {/* Ambient Soft Sky Blue Glows */}
      <Box
        style={{
          position: 'absolute',
          top: '10%',
          right: '8%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 163, 255, 0.18) 0%, rgba(37, 99, 235, 0.06) 50%, transparent 75%)',
          filter: 'blur(80px)',
          animation: 'ambientGlowPulse 9s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <Box
        style={{
          position: 'absolute',
          top: '40%',
          left: '4%',
          width: 440,
          height: 440,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.14) 0%, rgba(0, 210, 255, 0.08) 50%, transparent 75%)',
          filter: 'blur(80px)',
          animation: 'ambientGlowPulse 11s ease-in-out infinite 1.5s',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Concentric Layered Rounded Glass Waves (Bottom Left) - Vibrant Cyan-Blue Gradient */}
      <Box
        style={{
          position: 'absolute',
          bottom: -70,
          left: -50,
          width: 320,
          height: 320,
          borderRadius: 85,
          background: 'linear-gradient(135deg, #0055FF 0%, #0070F3 55%, #00C6FF 100%)',
          boxShadow: '0 15px 40px rgba(0, 112, 243, 0.35)',
          transform: 'rotate(-18deg)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <Box
        style={{
          position: 'absolute',
          bottom: -35,
          left: -20,
          width: 250,
          height: 250,
          borderRadius: 68,
          border: '2px solid rgba(255, 255, 255, 0.85)',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(224, 242, 254, 0.45) 100%)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 12px 30px rgba(0, 112, 243, 0.16)',
          transform: 'rotate(-18deg)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Concentric Layered Rounded Glass Waves (Top Right) */}
      <Box
        style={{
          position: 'absolute',
          top: -90,
          right: -60,
          width: 340,
          height: 340,
          borderRadius: 90,
          border: '2px solid rgba(255, 255, 255, 0.7)',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(219, 234, 254, 0.25) 100%)',
          backdropFilter: 'blur(16px)',
          transform: 'rotate(22deg)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Prominent 3D Floating Blue Cube (Mid-Right) - Vibrant Cyan-Blue Gradient */}
      <Box
        style={{
          position: 'absolute',
          top: '36%',
          right: '18%',
          width: 78,
          height: 78,
          borderRadius: 22,
          background: 'linear-gradient(135deg, #00C6FF 0%, #0070F3 50%, #0055FF 100%)',
          transform: 'rotate(26deg)',
          boxShadow: '0 22px 50px rgba(0, 112, 243, 0.45), inset 0 2px 5px rgba(255, 255, 255, 0.7), inset 0 -4px 10px rgba(0, 50, 150, 0.35)',
          animation: 'floatCubeSlow 7s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      {/* Translucent Glass Cube (Top Right) */}
      <Box
        style={{
          position: 'absolute',
          top: '13%',
          right: '27%',
          width: 52,
          height: 52,
          borderRadius: 16,
          background: 'rgba(255, 255, 255, 0.55)',
          backdropFilter: 'blur(12px)',
          border: '1.5px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 10px 25px rgba(37, 99, 235, 0.08)',
          transform: 'rotate(14deg)',
          animation: 'floatGlass1 8s ease-in-out infinite 1s',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Translucent Glass Cube (Middle Left) */}
      <Box
        style={{
          position: 'absolute',
          top: '30%',
          left: '11%',
          width: 44,
          height: 44,
          borderRadius: 14,
          background: 'rgba(255, 255, 255, 0.55)',
          backdropFilter: 'blur(10px)',
          border: '1.5px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 10px 24px rgba(37, 99, 235, 0.08)',
          transform: 'rotate(-12deg)',
          animation: 'floatGlass2 9s ease-in-out infinite 2s',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Translucent Glass Cube (Lower Left) */}
      <Box
        style={{
          position: 'absolute',
          top: '59%',
          left: '17%',
          width: 66,
          height: 66,
          borderRadius: 20,
          background: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(14px)',
          border: '1.5px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 14px 34px rgba(37, 99, 235, 0.12)',
          transform: 'rotate(10deg)',
          animation: 'floatGlass1 7.5s ease-in-out infinite 0.5s',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Translucent Glass Cube (Bottom Left Accent) */}
      <Box
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '21%',
          width: 48,
          height: 48,
          borderRadius: 15,
          background: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 10px 25px rgba(37, 99, 235, 0.09)',
          transform: 'rotate(-8deg)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />


      {/* Top Header Bar */}
      <Box
        px={{ base: 'md', sm: 'xl', md: 48 }}
        py={{ base: 'md', md: 28 }}
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
              width: 42,
              height: 42,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 55%, #3B82F6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 22px rgba(29, 78, 216, 0.35)',
              color: '#FFFFFF',
            }}
          >
            <IconLock size={22} color="#FFFFFF" stroke={2.4} />
          </Box>
          <Box>
            <Text
              fw={800}
              size="19px"
              style={{
                color: '#071126',
                letterSpacing: '-0.025em',
                lineHeight: 1.15,
              }}
            >
              OneAssist <Text span inherit fw={800} style={{ color: '#2563EB' }}>CRM</Text>
            </Text>
            <Text
              size="9.5px"
              fw={700}
              style={{ color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}
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
