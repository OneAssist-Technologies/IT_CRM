/**
 * ============================================================================
 * ONEASSIST TECHNOLOGIES - CRM GLOBAL DESIGN TOKENS
 * ============================================================================
 * Corporate Identity & Theme for OneAssist Technologies, Coimbatore
 * Official Palette: Signature Indigo, Electric Blue, Cyan, Slate & Clean SaaS
 * ============================================================================
 */

export interface CRMThemeTokens {
  // Brand Primary & Gradients (OneAssist Signature Palette)
  primary: string;           // OneAssist Indigo (#4F46E5)
  primaryHover: string;      // Deep Indigo (#4338CA)
  primaryLight: string;      // Soft Indigo Tint (#EEF2FF)
  primaryDark: string;       // Rich Dark Indigo (#312E81)
  primaryGradient: string;   // Signature OneAssist Multi-stop Gradient

  // Brand Accent Tones
  brandCyan: string;         // Radiant Cyan (#06B6D4)
  brandSky: string;          // Vivid Sky (#0EA5E9)
  brandBlue: string;         // Electric Enterprise Blue (#2563EB)

  // Canvas & Backgrounds
  background: string;        // Ultra-Clean SaaS Canvas (#F8FAFC)
  backgroundLight: string;   // Pure White Surface (#FFFFFF)
  backgroundDark: string;    // Soft Slate Tint (#F1F5F9)

  // Floating Cards & Surfaces
  cardBg: string;            // Pure White Card (#FFFFFF)
  cardBgHover: string;       // Subtle Hover State (#F8FAFC)
  cardBgDark: string;        // Deep Executive Slate (#0F172A)
  border: string;            // Refined Divider Border (#E2E8F0)
  borderLight: string;       // Subtle Indigo Border (rgba(99, 102, 241, 0.08))

  // Professional Typography
  textPrimary: string;       // High-Contrast Slate Navy (#0F172A)
  textSecondary: string;     // Refined Slate Subtitles (#475569)
  textMuted: string;         // Dimmed Metadata (#94A3B8)
  textOnPrimary: string;     // Crisp White (#FFFFFF)

  // Sales Pipeline & Lead Stage Accents (Pastel Pills)
  pastelLime: string;        // Emerald Mint (Won / Closed / Active) (#D1FAE5)
  pastelLimeText: string;    // #065F46
  pastelMint: string;        // Cyan Ice (Meeting Scheduled / Verified) (#CFFAFE)
  pastelMintText: string;    // #0E7490
  pastelCoral: string;       // Soft Rose (Lost / Inactive / Overdue) (#FFE4E6)
  pastelCoralText: string;   // #9F1239
  pastelPurple: string;      // Lavender Indigo (In Negotiation / Assigned) (#EDE9FE)
  pastelPurpleText: string;  // #5B21B6
  pastelBlue: string;        // Sky Blue (New Prospect / In Review) (#E0F2FE)
  pastelBlueText: string;    // #0369A1

  // Functional Status Colors
  success: string;
  warning: string;
  danger: string;
  error: string;
  info: string;
}

export const CRM_COLORS: CRMThemeTokens = {
  // ⚡ ONEASSIST BRAND PALETTE (Refined Royal Sapphire & Midnight Navy)
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  primaryLight: '#EFF6FF',
  primaryDark: '#1E40AF',
  primaryGradient: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 55%, #3B82F6 100%)',

  brandCyan: '#0EA5E9',
  brandSky: '#38BDF8',
  brandBlue: '#2563EB',

  // ❄️ CLEAN ENTERPRISE SAAS CANVAS
  background: '#F0F5FE',
  backgroundLight: '#FFFFFF',
  backgroundDark: '#E8F0FC',

  // 🪟 CRISP WHITE FLOATING CARDS & EXECUTIVE SURFACES
  cardBg: '#FFFFFF',
  cardBgHover: '#F8FAFC',
  cardBgDark: '#071126',
  border: '#E2E8F0',
  borderLight: 'rgba(37, 99, 235, 0.08)',

  // ✍️ SLEEK HIGH-CONTRAST TYPOGRAPHY
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',

  // 🍬 SALES PIPELINE & STATUS ACCENTS
  pastelLime: '#D1FAE5',
  pastelLimeText: '#065F46',
  pastelMint: '#CFFAFE',
  pastelMintText: '#0E7490',
  pastelCoral: '#FFE4E6',
  pastelCoralText: '#9F1239',
  pastelPurple: '#EDE9FE',
  pastelPurpleText: '#5B21B6',
  pastelBlue: '#E0F2FE',
  pastelBlueText: '#0369A1',

  // 🟢 FUNCTIONAL STATUSES
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  error: '#EF4444',
  info: '#06B6D4',
};

export default CRM_COLORS;
