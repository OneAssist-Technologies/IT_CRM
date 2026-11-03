import React, { useState } from 'react';
import {
  Paper,
  TextInput,
  PasswordInput,
  Checkbox,
  Button,
  Group,
  Stack,
  Text,
  Box,
  Anchor,
  Modal,
  Badge,
} from '@mantine/core';
import {
  IconMail,
  IconLock,
  IconShieldCheck,
  IconArrowRight,
  IconEye,
  IconEyeOff,
  IconKey,
  IconCheck,
  IconArrowLeft,
  IconAlertCircle,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useCRM } from '../../../context/CRMContext';
import { crmApi } from '../../../services/api';
import { FuturisticAuthLayout } from '../components/FuturisticAuthLayout';

interface LoginPageProps {
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
  defaultEmail?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onSwitchToSignup,
  defaultEmail = '',
}) => {
  const { currentUser, setCurrentUser, setActiveNav } = useCRM();

  const [loading, setLoading] = useState(false);

  // Form States - Dynamic LocalStorage Persistence for Remember Me
  const [identifier, setIdentifier] = useState(() => {
    if (defaultEmail) return defaultEmail;
    try {
      return localStorage.getItem('crm_remembered_email') || 'jaga00627@gmail.com';
    } catch {
      return 'jaga00627@gmail.com';
    }
  });

  const [password, setPassword] = useState('');

  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('crm_remember_me');
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  // Error State
  const [errorMsg, setErrorMsg] = useState('');

  const handleReturnToDashboard = (loggedInRole?: string) => {
    if (onSuccess) {
      onSuccess();
    } else {
      const roleUpper = String(loggedInRole || currentUser?.role || '').toUpperCase();
      const isAdmin = roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPER ADMIN';
      setActiveNav(isAdmin ? 'dashboard' : 'employee-dashboard');
    }
  };

  const handleGoToSignup = () => {
    if (onSwitchToSignup) {
      onSwitchToSignup();
    } else {
      setActiveNav('signup');
    }
  };

  // Dynamic Forgot Password States (Email Request & Magic Link)
  const [forgotOpened, setForgotOpened] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [resetLink, setResetLink] = useState('');
  const [mailPreviewUrl, setMailPreviewUrl] = useState('');

  const handleOpenForgotPassword = () => {
    setForgotEmail(identifier.trim());
    setForgotError('');
    setForgotSuccess(false);
    setResetLink('');
    setMailPreviewUrl('');
    setForgotOpened(true);
  };

  const handleRequestResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (!forgotEmail.trim()) {
      setForgotError('Please enter your Work Email.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await crmApi.forgotPassword(forgotEmail.trim());
      if (res && res.success) {
        setForgotSuccess(true);
        if (res.resetUrl) {
          setResetLink(res.resetUrl);
        }
        if (res.previewUrl) {
          setMailPreviewUrl(res.previewUrl);
        }
        notifications.show({
          title: 'Reset Email Sent',
          message: res.message || 'Password reset link sent to your email.',
          color: 'teal',
          icon: <IconCheck size={18} />,
        });
      } else {
        setForgotError(res?.message || 'Could not find an account with this email.');
      }
    } catch (err: any) {
      setForgotError(err?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identifier.trim()) {
      setErrorMsg('Please enter your Work Email.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await crmApi.login({ email: identifier.trim(), password });
      if (res.success && res.user) {
        // Dynamic Remember Me Persistence
        try {
          if (rememberMe) {
            localStorage.setItem('crm_remembered_email', identifier.trim());
            localStorage.setItem('crm_remember_me', 'true');
          } else {
            localStorage.removeItem('crm_remembered_email');
            localStorage.setItem('crm_remember_me', 'false');
          }
        } catch (err) {
          console.warn('Storage error:', err);
        }

        if (res.token) {
          localStorage.setItem('crm_token', res.token);
        }
        setCurrentUser(res.user);
        window.dispatchEvent(new CustomEvent('crm_permissions_updated'));
        notifications.show({
          title: 'Welcome Back!',
          message: `Signed in as ${res.user.name}.`,
          color: 'teal',
          icon: <IconShieldCheck size={18} />,
        });
        handleReturnToDashboard(res.user?.role);
      } else {
        setErrorMsg(res.message || 'Invalid email or password.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password.');
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
          maxWidth: 430,
          background: '#FFFFFF',
          border: '1px solid rgba(226, 232, 240, 0.85)',
          boxShadow: '0 20px 50px -10px rgba(0, 102, 255, 0.08), 0 10px 30px -5px rgba(15, 23, 42, 0.04), 0 0 1px rgba(0, 0, 0, 0.08)',
          padding: '38px 36px 32px',
          position: 'relative',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Header: Centered Login Title with Gradient Underline Bar */}
        <Box mb={24} style={{ textAlign: 'center' }}>
          <Text
            fw={800}
            size="28px"
            style={{
              color: '#071126',
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
            }}
          >
            Login
          </Text>
          <Box
            style={{
              width: 34,
              height: 3.5,
              borderRadius: 3,
              background: 'linear-gradient(90deg, #0055FF 0%, #0070F3 55%, #00C6FF 100%)',
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

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <Stack gap="md">
            {/* Work Email Field with Label */}
            <Box>
              <Text size="13px" fw={700} mb={6} style={{ color: '#0F172A' }}>
                Work Email
              </Text>
              <TextInput
                placeholder="jaga00627@gmail.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.currentTarget.value)}
                leftSection={<IconMail size={17} color="#2563EB" stroke={2} />}
                radius="14px"
                size="md"
                styles={{
                  input: {
                    background: '#F8FAFC',
                    borderColor: '#E2E8F0',
                    color: '#0F172A',
                    fontSize: 14,
                    height: 48,
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                  },
                }}
                required
              />
            </Box>

            {/* Password Field with Label & Forgot Password Link */}
            <Box>
              <Group justify="space-between" align="center" mb={6}>
                <Text size="13px" fw={700} style={{ color: '#0F172A' }}>
                  Password
                </Text>
                <Anchor
                  size="12px"
                  fw={600}
                  style={{ color: '#0066FF', cursor: 'pointer' }}
                  onClick={handleOpenForgotPassword}
                >
                  Forgot password?
                </Anchor>
              </Group>
              <PasswordInput
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                leftSection={<IconLock size={17} color="#0066FF" stroke={2} />}
                visibilityToggleIcon={({ reveal }) =>
                  reveal ? (
                    <IconEyeOff size={17} color="#64748B" />
                  ) : (
                    <IconEye size={17} color="#64748B" />
                  )
                }
                radius="14px"
                size="md"
                styles={{
                  input: {
                    background: '#F8FAFC',
                    borderColor: '#E2E8F0',
                    color: '#071126',
                    fontSize: 14,
                    height: 48,
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                  },
                }}
                required
              />
            </Box>

            {/* Dynamic Remember Me Checkbox */}
            <Box mt={2}>
              <Checkbox
                checked={rememberMe}
                onChange={(e) => {
                  const val = e.currentTarget.checked;
                  setRememberMe(val);
                  try {
                    localStorage.setItem('crm_remember_me', String(val));
                    if (!val) {
                      localStorage.removeItem('crm_remembered_email');
                    }
                  } catch (err) {
                    console.warn(err);
                  }
                }}
                label={<Text size="13px" fw={500} style={{ color: '#334155' }}>Remember me</Text>}
                color="blue"
                radius="sm"
                size="xs"
              />
            </Box>

            {/* Main Action Button: Login -> */}
            <Button
              type="submit"
              loading={loading}
              size="md"
              radius="14px"
              mt={6}
              rightSection={<IconArrowRight size={16} />}
              style={{
                background: 'linear-gradient(90deg, #0055FF 0%, #0070F3 55%, #00C6FF 100%)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 15,
                height: 48,
                boxShadow: '0 8px 24px rgba(0, 112, 243, 0.42)',
                transition: 'all 0.2s ease',
              }}
            >
              Login
            </Button>
          </Stack>
        </form>

        {/* Card Footer Switch to Signup */}
        <Box mt={26} pt={16} style={{ borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
          <Text size="13px" style={{ color: '#64748B' }}>
            Don't have an account?{' '}
            <Anchor
              size="13px"
              fw={700}
              style={{ color: '#0066FF', cursor: 'pointer' }}
              onClick={handleGoToSignup}
            >
              Register Super Admin →
            </Anchor>
          </Text>
        </Box>
      </Paper>

      {/* Dynamic Forgot Password Email Link Modal */}
      <Modal
        opened={forgotOpened}
        onClose={() => setForgotOpened(false)}
        centered
        radius="24px"
        padding="28px"
        withCloseButton
        styles={{
          content: {
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 210, 255, 0.15)',
            border: '1px solid #E5E7EB',
          },
          header: {
            paddingBottom: 0,
          },
        }}
      >
        {!forgotSuccess ? (
          <Box>
            {/* Request Reset Link Header */}
            <Box mb={20} style={{ textAlign: 'center' }}>
              <Box
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #00D2FF 0%, #2563EB 100%)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 18px rgba(0, 210, 255, 0.4)',
                  color: '#FFFFFF',
                  marginBottom: 10,
                }}
              >
                <IconMail size={22} color="#FFFFFF" />
              </Box>
              <Text fw={800} size="22px" style={{ color: '#111827', letterSpacing: '-0.02em' }}>
                Reset Password
              </Text>
              <Text size="13px" mt={4} style={{ color: '#6B7280', lineHeight: 1.5 }}>
                Enter your registered Work Email. We'll send a password reset link to your email.
              </Text>
            </Box>

            {/* Error Banner */}
            {forgotError && (
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
                  {forgotError}
                </Text>
              </Box>
            )}

            <form onSubmit={handleRequestResetLink}>
              <Stack gap="md">
                <Box>
                  <Text size="xs" fw={600} mb={6} style={{ color: '#374151' }}>
                    Work Email
                  </Text>
                  <TextInput
                    placeholder="name@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.currentTarget.value)}
                    leftSection={<IconMail size={16} color="#9CA3AF" />}
                    radius="12px"
                    size="md"
                    styles={{
                      input: {
                        background: '#F9FAFB',
                        borderColor: '#E5E7EB',
                        fontSize: 14,
                        height: 46,
                      },
                    }}
                    required
                    autoFocus
                  />
                </Box>

                <Button
                  type="submit"
                  loading={forgotLoading}
                  size="md"
                  radius="12px"
                  mt={4}
                  rightSection={<IconArrowRight size={16} />}
                  style={{
                    background: 'linear-gradient(90deg, #0055FF 0%, #0070F3 55%, #00C6FF 100%)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: 14,
                    height: 46,
                    boxShadow: '0 6px 18px rgba(0, 112, 243, 0.35)',
                  }}
                >
                  Send Reset Link to Email
                </Button>
              </Stack>
            </form>
          </Box>
        ) : (
          <Box style={{ textAlign: 'center' }}>
            {/* Success Header */}
            <Box
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #10B981 0%, #2563EB 100%)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 18px rgba(16, 185, 129, 0.4)',
                color: '#FFFFFF',
                marginBottom: 12,
              }}
            >
              <IconCheck size={26} color="#FFFFFF" />
            </Box>
            <Text fw={800} size="22px" style={{ color: '#111827', letterSpacing: '-0.02em' }}>
              Request Email Sent!
            </Text>
            <Text size="13px" mt={8} mb={24} style={{ color: '#6B7280', lineHeight: 1.6 }}>
              A password reset request email has been sent to{' '}
              <Text span fw={700} c="#1E293B">
                {forgotEmail}
              </Text>
              . Please check your inbox and click the <b>Reset Password</b> button in that email to change your password.
            </Text>

            <Button
              variant="light"
              color="blue"
              radius="12px"
              size="md"
              fullWidth
              onClick={() => setForgotOpened(false)}
            >
              Back to Login
            </Button>
          </Box>
        )}
      </Modal>
    </FuturisticAuthLayout>
  );
};

export default LoginPage;
