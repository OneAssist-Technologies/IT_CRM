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

  const handleReturnToDashboard = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      setActiveNav('dashboard');
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
      setErrorMsg('Please enter your Phone Number.');
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
          border: 'none',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.48), 0 0 50px rgba(0, 180, 255, 0.14)',
          padding: '36px 32px 28px',
          position: 'relative',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Brand Header */}
        <Box mb={24} style={{ textAlign: 'center' }}>
          <Box
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #00D2FF 0%, #2563EB 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 18px rgba(0, 210, 255, 0.45)',
              color: '#FFFFFF',
              marginBottom: 12,
            }}
          >
            <Text fw={900} size="22px" c="#FFFFFF" style={{ letterSpacing: '-0.04em', fontFamily: 'system-ui' }}>
              a
            </Text>
          </Box>
          <Text
            fw={800}
            size="24px"
            style={{
              color: '#111827',
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
            }}
          >
            Create Super Admin Account
          </Text>
          <Text size="13px" mt={4} style={{ color: '#6B7280' }}>
            Get started with your enterprise CRM workspace.
          </Text>
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
                placeholder="Phone Number *"
                value={phone}
                onChange={(e) => setPhone(e.currentTarget.value)}
                leftSection={<IconPhone size={16} color="#9CA3AF" />}
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
              radius="12px"
              mt={8}
              rightSection={<IconArrowRight size={16} />}
              style={{
                background: 'var(--crm-primary-gradient, linear-gradient(135deg, #1D4ED8 0%, #2563EB 55%, #3B82F6 100%))',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 15,
                height: 44,
                boxShadow: 'var(--crm-btn-shadow, 0 4px 14px rgba(37, 99, 235, 0.22))',
                transition: 'all 0.2s ease',
              }}
            >
              Sign Up
            </Button>
          </Stack>
        </form>

        {/* Card Footer Switch to Login */}
        <Box mt={22} pt={14} style={{ borderTop: '1px solid #F3F4F6', textAlign: 'center' }}>
          <Text size="xs" style={{ color: '#6B7280' }}>
            Already have an account?{' '}
            <Anchor
              size="xs"
              fw={700}
              style={{ color: '#1D4ED8', cursor: 'pointer' }}
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
