import React, { useState, useEffect } from 'react';
import {
  Paper,
  Stack,
  SimpleGrid,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  Text,
  useComputedColorScheme,
} from '@mantine/core';
import { IconDeviceFloppy, IconBug } from '@tabler/icons-react';
import { SupportTicket, TicketEnvironment } from '../../../types/supportTicket';
import { useSupportTicket } from '../../../context/SupportTicketContext';

interface TicketInvestigationProps {
  ticket: SupportTicket;
}

export const TicketInvestigation: React.FC<TicketInvestigationProps> = ({ ticket }) => {
  const { updateTicket } = useSupportTicket();
  const computedColorScheme = useComputedColorScheme('light');
  const isDark = computedColorScheme === 'dark';

  const [environment, setEnvironment] = useState<TicketEnvironment>('Production');
  const [browserDevice, setBrowserDevice] = useState<string>('');
  const [stepsToReproduce, setStepsToReproduce] = useState<string>('');
  const [expectedResult, setExpectedResult] = useState<string>('');
  const [actualResult, setActualResult] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [rootCause, setRootCause] = useState<string>('');
  const [workaround, setWorkaround] = useState<string>('');
  const [resolutionDescription, setResolutionDescription] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (ticket) {
      setEnvironment((ticket.environment as TicketEnvironment) || 'Production');
      setBrowserDevice(ticket.browserDevice || '');
      setStepsToReproduce(ticket.stepsToReproduce || '');
      setExpectedResult(ticket.expectedResult || '');
      setActualResult(ticket.actualResult || '');
      setErrorMessage(ticket.errorMessage || '');
      setRootCause(ticket.rootCause || '');
      setWorkaround(ticket.workaround || '');
      setResolutionDescription(ticket.resolutionDescription || '');
    }
  }, [ticket]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTicket(ticket.id, {
        environment,
        browserDevice: browserDevice.trim(),
        stepsToReproduce: stepsToReproduce.trim(),
        expectedResult: expectedResult.trim(),
        actualResult: actualResult.trim(),
        errorMessage: errorMessage.trim(),
        rootCause: rootCause.trim(),
        workaround: workaround.trim(),
        resolutionDescription: resolutionDescription.trim(),
      });
    } catch {
      // notification handled in context
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper
      withBorder
      radius="md"
      p="md"
      style={{
        background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#FFFFFF',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconBug size={18} color="#2563EB" />
            <Text fw={700} size="md">
              Investigation & Technical Diagnostics
            </Text>
          </Group>
          <Button
            size="xs"
            color="blue"
            leftSection={<IconDeviceFloppy size={14} />}
            loading={saving}
            onClick={handleSave}
          >
            Save Diagnostics
          </Button>
        </Group>

        {/* Environment & Device */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Select
            label="Environment"
            data={['Production', 'Staging', 'Development']}
            value={environment}
            onChange={(val) => setEnvironment((val as TicketEnvironment) || 'Production')}
          />
          <TextInput
            label="Browser / Device / Application Version"
            placeholder="e.g. Chrome 122 on Windows 11 / iOS App v2.4.1"
            value={browserDevice}
            onChange={(e) => setBrowserDevice(e.currentTarget.value)}
          />
        </SimpleGrid>

        {/* Steps to Reproduce */}
        <Textarea
          label="Steps to Reproduce"
          placeholder="1. Navigate to screen&#10;2. Click action button&#10;3. Observe crash or failure"
          rows={3}
          value={stepsToReproduce}
          onChange={(e) => setStepsToReproduce(e.currentTarget.value)}
        />

        {/* Expected vs Actual */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Textarea
            label="Expected Result"
            placeholder="What should have occurred..."
            rows={2}
            value={expectedResult}
            onChange={(e) => setExpectedResult(e.currentTarget.value)}
          />
          <Textarea
            label="Actual Result"
            placeholder="What actually occurred..."
            rows={2}
            value={actualResult}
            onChange={(e) => setActualResult(e.currentTarget.value)}
          />
        </SimpleGrid>

        {/* Error message / Stack trace */}
        <Textarea
          label="Error Message / Log Reference / Sentry ID"
          placeholder="e.g. TypeError: Cannot read properties of undefined / Sentry Event #89421"
          rows={2}
          value={errorMessage}
          onChange={(e) => setErrorMessage(e.currentTarget.value)}
        />

        {/* Root Cause & Workaround */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Textarea
            label="Root Cause"
            placeholder="Identified underlying bug, schema mismatch, or configuration..."
            rows={2}
            value={rootCause}
            onChange={(e) => setRootCause(e.currentTarget.value)}
          />
          <Textarea
            label="Workaround"
            placeholder="Temporary workaround provided to the customer..."
            rows={2}
            value={workaround}
            onChange={(e) => setWorkaround(e.currentTarget.value)}
          />
        </SimpleGrid>

        {/* Resolution Description */}
        <Textarea
          label="Resolution Description"
          placeholder="Details of the bug fix, deployment, or configuration change applied..."
          rows={3}
          value={resolutionDescription}
          onChange={(e) => setResolutionDescription(e.currentTarget.value)}
        />
      </Stack>
    </Paper>
  );
};

export default TicketInvestigation;

