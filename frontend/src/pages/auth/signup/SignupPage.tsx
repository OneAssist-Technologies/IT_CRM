import React, { useState } from 'react';
import {
  Paper,
  TextInput,
  PasswordInput,
  Checkbox,
  Button,
  Stack,
  Text,
  Box,
  Anchor,
  SimpleGrid,
} from '@mantine/core';
import {
  IconUser,
  IconMail,
  IconPhone,
  IconLock,
  IconShieldCheck,
  IconArrowRight,
  IconBuilding,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useCRM } from '../../../context/CRMContext';
import { crmApi } from '../../../services/api';
import { FuturisticAuthLayout } from '../components/FuturisticAuthLayout';

interface SignupPageProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSuccess, onSwitchToLogin }) => {
  const { setActiveNav } = useCRM();

  const [loading, setLoading] = useState(false);

  // Form States
  const [organisationName, setOrganisationName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Error State
  const [errorMsg, setErrorMsg] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Indian Mobile Number Validator & Input Formatter
  const handlePhoneChange = (raw: string) => {
    let val = raw.trim();
    // Clean if user pasted with +91 or +
    if (val.startsWith('+91')) {
      val = val.slice(3);
    } else if (val.startsWith('+')) {
      val = val.slice(1);
    }
    // Extract only digits
    let digits = val.replace(/\D/g, '');
    // If pasted without + but has 91 country code (12 digits)
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    }
    // If pasted with leading 0 (11 digits)
    if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    // Restrict strictly to 10 digits
    if (digits.length > 10) {
      digits = digits.slice(0, 10);
    }

    setPhone(digits);

    // Live validation feedback
    if (!digits) {
      setPhoneError('');
    } else if (!/^[6-9]/.test(digits)) {
      setPhoneError('Indian mobile number must start with 6, 7, 8, or 9');
    } else if (digits.length < 10) {
      setPhoneError(`10 digits required (${digits.length}/10)`);
    } else {
      setPhoneError('');
    }
  };

  const handleReturnToDashboard = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      setActiveNav('login');
    }
  };

  const handleGoToLogin = () => {
    if (onSwitchToLogin) {
      onSwitchToLogin();
    } else {
      setActiveNav('login');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!organisationName.trim()) {
      setErrorMsg('Please enter your Organisation / Company Name.');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Please enter your Full Name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid Work Email Address.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Please enter your Mobile Number.');
      setPhoneTouched(true);
      setPhoneError('Mobile number is required');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      const msg = !/^[6-9]/.test(phone.trim())
        ? 'Indian mobile number must start with 6, 7, 8, or 9.'
        : 'Please enter a valid 10-digit Indian mobile number.';
      setErrorMsg(msg);
      setPhoneTouched(true);
      setPhoneError(msg);
      return;
    }
    if (!password || password.length < 4) {
      setErrorMsg('Password must be at least 4 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }
    if (!agreedToTerms) {
      setErrorMsg('Please accept the Terms of Service & Privacy Policy.');
      return;
    }

    setLoading(true);
    try {
      const res = await crmApi.register({
        organisationName: organisationName.trim(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        confirmPassword,
      });

      if (res.success && res.user) {
        notifications.show({
          title: 'Account Created Successfully!',
          message: `Workspace created for ${res.user.name}. Please sign in.`,
          color: 'teal',
          icon: <IconShieldCheck size={18} />,
        });
        handleGoToLogin();
      } else {
        setErrorMsg(res.message || 'Registration failed. Please check inputs.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FuturisticAuthLayout onReturnToDashboard={handleReturnToDashboard}>
      <Paper
        radius="28px"
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#FFFFFF',
          border: '1px solid rgba(226, 232, 240, 0.85)',
          boxShadow: '0 20px 50px -10px rgba(0, 102, 255, 0.08), 0 10px 30px -5px rgba(15, 23, 42, 0.04), 0 0 1px rgba(0, 0, 0, 0.08)',
          padding: '36px 32px 28px',
          position: 'relative',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Brand Header */}
        <Box mb={24} style={{ textAlign: 'center' }}>
          <Text
            fw={800}
            size="26px"
            style={{
              color: '#0F172A',
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
            }}
          >
            Create Super Admin Account
          </Text>
          <Box
            style={{
              width: 44,
              height: 3.5,
              borderRadius: 3,
              background: 'linear-gradient(90deg, #00C6FF 0%, #0070F3 100%)',
              margin: '8px auto 0',
            }}
          />
        </Box>

        {/* Error Alert Banner */}
        {errorMsg && (
          <Box
            p="10px 14px"
            mb="md"
            style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '12px',
            }}
          >
            <Text size="xs" fw={600} style={{ color: '#B91C1C' }}>
              {errorMsg}
            </Text>
          </Box>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSignup}>
          <Stack gap="sm">
            {/* Organisation / Company Name */}
            <TextInput
              placeholder="Organisation / Company Name *"
              value={organisationName}
              onChange={(e) => setOrganisationName(e.currentTarget.value)}
              leftSection={<IconBuilding size={16} color="#9CA3AF" />}
              radius="12px"
              size="sm"
              styles={{
                input: {
                  background: '#F9FAFB',
                  borderColor: '#E5E7EB',
                  color: '#111827',
                  fontSize: 13,
                  height: 42,
                },
              }}
              required
            />

            {/* Admin Full Name & Phone Number */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                placeholder="Full Name *"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                leftSection={<IconUser size={16} color="#9CA3AF" />}
                radius="12px"
                size="sm"
                styles={{
                  input: {
                    background: '#F9FAFB',
                    borderColor: '#E5E7EB',
                    color: '#111827',
                    fontSize: 13,
                    height: 42,
                  },
                }}
                required
              />

              <TextInput
                placeholder="Mobile Number (10 digits) *"
                value={phone}
                onChange={(e) => handlePhoneChange(e.currentTarget.value)}
                onBlur={() => {
                  setPhoneTouched(true);
                  if (!phone) {
                    setPhoneError('Mobile number is required');
                  } else if (!/^[6-9]\d{9}$/.test(phone)) {
                    setPhoneError(
                      !/^[6-9]/.test(phone)
                        ? 'Must start with 6, 7, 8, or 9'
                        : 'Must be exactly 10 digits'
                    );
                  }
                }}
                leftSection={
                  <Box style={{ display: 'flex', alignItems: 'center', gap: 3, paddingLeft: 2 }}>
                    <IconPhone size={15} color="#9CA3AF" />
                    <Text size="11px" fw={700} style={{ color: '#64748B' }}>
                      +91
                    </Text>
                  </Box>
                }
                leftSectionWidth={60}
                maxLength={10}
                radius="12px"
                size="sm"
                error={phoneTouched && phoneError ? phoneError : undefined}
                styles={{
                  input: {
                    background: '#F9FAFB',
                    borderColor: phoneTouched && phoneError ? '#EF4444' : '#E5E7EB',
                    color: '#111827',
                    fontSize: 13,
                    height: 42,
                  },
                  error: {
                    fontSize: 11,
                    marginTop: 3,
                  },
                }}
                required
              />
            </SimpleGrid>

            {/* Work Email */}
            <TextInput
              placeholder="Work Email Address *"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              leftSection={<IconMail size={16} color="#9CA3AF" />}
              radius="12px"
              size="sm"
              styles={{
                input: {
                  background: '#F9FAFB',
                  borderColor: '#E5E7EB',
                  color: '#111827',
                  fontSize: 13,
                  height: 42,
                },
              }}
              required
            />

            {/* Password & Confirm Password */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <PasswordInput
                placeholder="Password *"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                leftSection={<IconLock size={16} color="#9CA3AF" />}
                visibilityToggleIcon={({ reveal }) =>
                  reveal ? (
                    <IconEyeOff size={15} color="#9CA3AF" />
                  ) : (
                    <IconEye size={15} color="#9CA3AF" />
                  )
                }
                radius="12px"
                size="sm"
                styles={{
                  input: {
                    background: '#F9FAFB',
                    borderColor: '#E5E7EB',
                    color: '#111827',
                    fontSize: 13,
                    height: 42,
                  },
                }}
                required
              />

              <PasswordInput
                placeholder="Confirm Password *"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                leftSection={<IconLock size={16} color="#9CA3AF" />}
                visibilityToggleIcon={({ reveal }) =>
                  reveal ? (
                    <IconEyeOff size={15} color="#9CA3AF" />
                  ) : (
                    <IconEye size={15} color="#9CA3AF" />
                  )
                }
                radius="12px"
                size="sm"
                styles={{
                  input: {
                    background: '#F9FAFB',
                    borderColor: '#E5E7EB',
                    color: '#111827',
                    fontSize: 13,
                    height: 42,
                  },
                }}
                required
              />
            </SimpleGrid>

            {/* Terms Agreement */}
            <Box mt={4}>
              <Checkbox
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.currentTarget.checked)}
                label={
                  <Text size="11.5px" style={{ color: '#6B7280' }}>
                    I agree to the{' '}
                    <Text span fw={700} style={{ color: '#1D4ED8' }}>
                      Enterprise Service Agreement
                    </Text>{' '}
                    and{' '}
                    <Text span fw={700} style={{ color: '#1D4ED8' }}>
                      Privacy Policy
                    </Text>
                    .
                  </Text>
                }
                radius="sm"
                size="xs"
                color="blue"
              />
            </Box>

            {/* Main Action Button */}
            <Button
              type="submit"
              loading={loading}
              size="md"
              radius="14px"
              mt={8}
              rightSection={<IconArrowRight size={16} />}
              style={{
                background: 'linear-gradient(90deg, #0055FF 0%, #0080FF 100%)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 15,
                height: 48,
                boxShadow: '0 10px 25px rgba(0, 85, 255, 0.38)',
                transition: 'all 0.2s ease',
              }}
            >
              Sign Up
            </Button>
          </Stack>
        </form>

        {/* Card Footer Switch to Login */}
        <Box mt={22} pt={14} style={{ borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
          <Text size="13px" style={{ color: '#64748B' }}>
            Already have an account?{' '}
            <Anchor
              size="13px"
              fw={700}
              style={{ color: '#0066FF', cursor: 'pointer' }}
              onClick={handleGoToLogin}
            >
              Login →
            </Anchor>
          </Text>
        </Box>
      </Paper>
    </FuturisticAuthLayout>
  );
};

export default SignupPage;
