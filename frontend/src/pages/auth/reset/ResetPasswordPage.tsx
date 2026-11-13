import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../config/env';
import {
  Paper,
  PasswordInput,
  Button,
  Stack,
  Text,
  Box,
  Anchor,
  Loader,
  Center,
} from '@mantine/core';
import {
  IconLock,
  IconShieldCheck,
  IconEye,
  IconEyeOff,
  IconCheck,
  IconArrowLeft,
  IconAlertCircle,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { crmApi } from '../../../services/api';
import { useCRM } from '../../../context/CRMContext';
import { FuturisticAuthLayout } from '../components/FuturisticAuthLayout';

interface ResetPasswordPageProps {
  onSuccess?: () => void;
  onBackToLogin?: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  onSuccess,
  onBackToLogin,
}) => {
  const { setActiveNav } = useCRM();

  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token') || '';
    const urlEmail = params.get('email') || '';

    setToken(urlToken);
    setEmail(urlEmail);

    if (!urlToken) {
      setValidating(false);
      setTokenValid(false);
      setErrorMsg('No reset token found in link. Please request a new password reset link.');
      return;
    }

    const validateToken = async () => {
      try {
        let res: any;
        if (crmApi && typeof crmApi.validateResetToken === 'function') {
          res = await crmApi.validateResetToken(urlToken);
        } else {
          const r = await fetch(
            `${API_BASE_URL}/auth/validate-reset-token?token=${encodeURIComponent(urlToken)}`
          );
          res = await r.json();
        }

        if (res && res.success && res.valid) {
          setTokenValid(true);
          if (res.email) setEmail(res.email);
        } else {
          setTokenValid(false);
          setErrorMsg(res?.message || 'This reset link has expired or is invalid.');
        }
      } catch (err: any) {
        setTokenValid(false);
        setErrorMsg(err?.message || 'This reset link has expired or is invalid.');
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, []);

  const handleReturnToLogin = () => {
    if (onBackToLogin) {
      onBackToLogin();
    } else {
      window.history.pushState({}, '', '/login');
      setActiveNav('login');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newPassword) {
      setErrorMsg('Please enter your new password.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      let res: any;
      if (crmApi && typeof crmApi.resetPassword === 'function') {
        res = await crmApi.resetPassword({
          token,
          email,
          newPassword,
          confirmPassword,
        });
      } else {
        const r = await fetch(`${API_BASE_URL}/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email, newPassword, confirmPassword }),
        });
        res = await r.json();
      }

      if (res && res.success) {
        setSuccessMsg(res.message || 'Password has been reset successfully!');
        notifications.show({
          title: 'Password Updated!',
          message: 'Your password has been changed successfully. Redirecting to login...',
          color: 'teal',
          icon: <IconShieldCheck size={18} />,
        });

        // Redirect to login after 1.5 seconds
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            window.history.pushState({}, '', '/login');
            setActiveNav('login');
          }
        }, 1500);
      } else {
        setErrorMsg(res?.message || 'Failed to reset password. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Server error while resetting password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FuturisticAuthLayout onReturnToDashboard={handleReturnToLogin}>
      <Paper
        radius="28px"
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#FFFFFF',
          border: '1px solid rgba(226, 232, 240, 0.85)',
          boxShadow: '0 20px 50px -10px rgba(0, 102, 255, 0.08), 0 10px 30px -5px rgba(15, 23, 42, 0.04), 0 0 1px rgba(0, 0, 0, 0.08)',
          padding: '38px 36px 32px',
          position: 'relative',
          transition: 'all 0.3s ease',
        }}
      >
        {validating ? (
          <Center py={40}>
            <Stack align="center" gap="sm">
              <Loader size="md" color="blue" />
              <Text size="sm" c="#6B7280" fw={600}>
                Verifying password reset link...
              </Text>
            </Stack>
          </Center>
        ) : !tokenValid ? (
          <Box style={{ textAlign: 'center' }}>
            <Box
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <IconAlertCircle size={24} color="#DC2626" />
            </Box>
            <Text fw={800} size="22px" style={{ color: '#111827', letterSpacing: '-0.02em' }}>
              Invalid or Expired Link
            </Text>
            <Text size="13px" mt={8} mb={24} style={{ color: '#6B7280', lineHeight: 1.5 }}>
              {errorMsg || 'This password reset link is invalid or has expired. Please request a new password reset email from the login page.'}
            </Text>
            <Button
              onClick={handleReturnToLogin}
              size="md"
              radius="12px"
              fullWidth
              style={{
                background: 'linear-gradient(90deg, #0055FF 0%, #0070F3 55%, #00C6FF 100%)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 15,
                height: 46,
                boxShadow: '0 6px 18px rgba(0, 112, 243, 0.35)',
              }}
              leftSection={<IconArrowLeft size={16} />}
            >
              Back to Login
            </Button>
          </Box>
        ) : (
          <Box>
            {/* Header */}
            <Box mb={24} style={{ textAlign: 'center' }}>
              <Text
                fw={800}
                size="24px"
                style={{
                  color: '#111827',
                  letterSpacing: '-0.025em',
                  lineHeight: 1.2,
                }}
              >
                Set New Password
              </Text>
              <Text size="13px" mt={6} style={{ color: '#6B7280' }}>
                Enter your new password for{' '}
                <Text span fw={700} style={{ color: '#2563EB' }}>
                  {email || 'your account'}
                </Text>
              </Text>
            </Box>

            {/* Error Banner */}
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

            {/* Success Banner */}
            {successMsg && (
              <Box
                p="12px 14px"
                mb="md"
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '12px',
                }}
              >
                <Text size="xs" fw={700} style={{ color: '#166534' }}>
                  {successMsg}
                </Text>
                <Text size="11px" mt={2} style={{ color: '#15803D' }}>
                  Redirecting to login in a moment...
                </Text>
              </Box>
            )}

            <form onSubmit={handleResetSubmit}>
              <Stack gap="md">
                <Box>
                  <Text size="xs" fw={600} mb={6} style={{ color: '#374151' }}>
                    New Password
                  </Text>
                  <PasswordInput
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.currentTarget.value)}
                    leftSection={<IconLock size={16} color="#9CA3AF" />}
                    visibilityToggleIcon={({ reveal }) =>
                      reveal ? <IconEyeOff size={16} color="#9CA3AF" /> : <IconEye size={16} color="#9CA3AF" />
                    }
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

                <Box>
                  <Text size="xs" fw={600} mb={6} style={{ color: '#374151' }}>
                    Confirm New Password
                  </Text>
                  <PasswordInput
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                    leftSection={<IconLock size={16} color="#9CA3AF" />}
                    visibilityToggleIcon={({ reveal }) =>
                      reveal ? <IconEyeOff size={16} color="#9CA3AF" /> : <IconEye size={16} color="#9CA3AF" />
                    }
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
                  />
                </Box>

                <Button
                  type="submit"
                  loading={loading}
                  disabled={Boolean(successMsg)}
                  size="md"
                  radius="12px"
                  mt={6}
                  rightSection={<IconCheck size={16} />}
                  style={{
                    background: 'linear-gradient(90deg, #0055FF 0%, #0070F3 55%, #00C6FF 100%)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: 15,
                    height: 46,
                    boxShadow: '0 6px 18px rgba(0, 112, 243, 0.35)',
                  }}
                >
                  Change Password
                </Button>
              </Stack>
            </form>

            <Box mt={24} pt={14} style={{ borderTop: '1px solid #F3F4F6', textAlign: 'center' }}>
              <Anchor
                size="xs"
                fw={700}
                style={{ color: '#0066FF', cursor: 'pointer' }}
                onClick={handleReturnToLogin}
              >
                ← Back to Login
              </Anchor>
            </Box>
          </Box>
        )}
      </Paper>
    </FuturisticAuthLayout>
  );
};

export default ResetPasswordPage;

