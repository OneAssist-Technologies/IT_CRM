import React, { useState, useEffect } from 'react';
import {
  Box,
  Popover,
  TextInput,
  ActionIcon,
  Group,
  Text,
  Badge,
  Divider,
  SimpleGrid,
  Button,
  useComputedColorScheme,
} from '@mantine/core';
import { IconClock } from '@tabler/icons-react';

interface CallDurationPickerProps {
  value: string; // expects MM:SS (e.g. "02:30")
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  zIndex?: number;
  maxWidth?: number | string;
  style?: React.CSSProperties;
}

const PRESET_DURATIONS = [
  { label: '30 sec', value: '00:30' },
  { label: '1 min', value: '01:00' },
  { label: '2 min', value: '02:00' },
  { label: '2m 30s', value: '02:30' },
  { label: '5 min', value: '05:00' },
  { label: '10 min', value: '10:00' },
  { label: '15 min', value: '15:00' },
  { label: '30 min', value: '30:00' },
  { label: '45 min', value: '45:00' },
];

const MINUTE_OPTIONS = ['00', '01', '02', '03', '04', '05', '10', '15', '20', '30', '45', '60'];
const SECOND_OPTIONS = ['00', '15', '30', '45'];

const parseFlexibleDuration = (str: string): { min: number; sec: number; formatted: string } => {
  if (!str) return { min: 2, sec: 30, formatted: '02:30' };
  const trimmed = str.trim();

  // 1. Colon separated: mm:ss or m:ss (e.g. 02:30, 2:30, 15:45)
  const colonMatch = trimmed.match(/^(\d{1,3}):(\d{1,2})$/);
  if (colonMatch) {
    let min = parseInt(colonMatch[1], 10);
    let sec = parseInt(colonMatch[2], 10);
    if (sec >= 60) {
      min += Math.floor(sec / 60);
      sec = sec % 60;
    }
    const mStr = String(min).padStart(2, '0');
    const sStr = String(sec).padStart(2, '0');
    return { min, sec, formatted: `${mStr}:${sStr}` };
  }

  // 2. 3 or 4 raw digits (e.g. '0230' -> 02:30, '230' -> 02:30)
  const rawDigits = trimmed.match(/^(\d{1,2})(\d{2})$/);
  if (rawDigits) {
    const min = parseInt(rawDigits[1], 10);
    const sec = parseInt(rawDigits[2], 10);
    if (sec < 60) {
      const mStr = String(min).padStart(2, '0');
      const sStr = String(sec).padStart(2, '0');
      return { min, sec, formatted: `${mStr}:${sStr}` };
    }
  }

  // 3. Letters like '2m 30s', '2 min', '45s'
  const mMatch = trimmed.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/i);
  const sMatch = trimmed.match(/(\d+)\s*(?:s|sec|secs|second|seconds)/i);
  if (mMatch || sMatch) {
    const min = mMatch ? parseInt(mMatch[1], 10) : 0;
    const sec = sMatch ? parseInt(sMatch[1], 10) : 0;
    const totalSec = min * 60 + sec;
    const finalMin = Math.floor(totalSec / 60);
    const finalSec = totalSec % 60;
    const mStr = String(finalMin).padStart(2, '0');
    const sStr = String(finalSec).padStart(2, '0');
    return { min: finalMin, sec: finalSec, formatted: `${mStr}:${sStr}` };
  }

  // 4. Single number: e.g. '2' -> 02:00, '5' -> 05:00
  const singleNum = trimmed.match(/^(\d{1,2})$/);
  if (singleNum) {
    const num = parseInt(singleNum[1], 10);
    const mStr = String(num).padStart(2, '0');
    return { min: num, sec: 0, formatted: `${mStr}:00` };
  }

  return { min: 2, sec: 30, formatted: '02:30' };
};

export const CallDurationPicker: React.FC<CallDurationPickerProps> = ({
  value,
  onChange,
  label = 'Duration',
  placeholder = 'MM:SS',
  required = true,
  zIndex = 1500,
  maxWidth,
  style,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const [opened, setOpened] = useState(false);
  const [inputText, setInputText] = useState<string>(() => value || '02:30');

  const initialParsed = parseFlexibleDuration(value || '02:30');
  const [min, setMin] = useState<string>(String(initialParsed.min).padStart(2, '0'));
  const [sec, setSec] = useState<string>(String(initialParsed.sec).padStart(2, '0'));

  // Sync internal state when external value changes
  useEffect(() => {
    if (!value) return;
    const parsed = parseFlexibleDuration(value);
    setMin(String(parsed.min).padStart(2, '0'));
    setSec(String(parsed.sec).padStart(2, '0'));
    if (inputText !== value) {
      const inputParsed = parseFlexibleDuration(inputText);
      if (inputParsed.formatted !== parsed.formatted) {
        setInputText(value);
      }
    }
  }, [value]);

  const updateDuration = (mVal: string, sVal: string) => {
    const paddedM = mVal.padStart(2, '0');
    const paddedS = sVal.padStart(2, '0');
    setMin(paddedM);
    setSec(paddedS);
    const formatted = `${paddedM}:${paddedS}`;
    setInputText(formatted);
    onChange(formatted);
  };

  const handlePresetSelect = (presetVal: string) => {
    const parts = presetVal.split(':');
    updateDuration(parts[0], parts[1]);
  };

  const handleMinuteSelect = (mOption: string) => {
    updateDuration(mOption, sec);
  };

  const handleSecondSelect = (sOption: string) => {
    updateDuration(min, sOption);
  };

  const handleReset = () => {
    updateDuration('00', '00');
  };

  const handleDefault = () => {
    updateDuration('02', '30');
  };

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputText(raw);

    const parsed = parseFlexibleDuration(raw);
    setMin(String(parsed.min).padStart(2, '0'));
    setSec(String(parsed.sec).padStart(2, '0'));
    onChange(parsed.formatted);
  };

  const handleBlur = () => {
    const parsed = parseFlexibleDuration(inputText);
    setInputText(parsed.formatted);
    setMin(String(parsed.min).padStart(2, '0'));
    setSec(String(parsed.sec).padStart(2, '0'));
    onChange(parsed.formatted);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
      setOpened(false);
    } else if (e.key === 'Escape') {
      setOpened(false);
    }
  };

  const currentDurationValue = `${min}:${sec}`;

  return (
    <Box style={{ maxWidth, ...style }}>
      <Popover
        opened={opened}
        onChange={setOpened}
        position="bottom-start"
        shadow="xl"
        radius="md"
        width={310}
        withArrow
        withinPortal
        zIndex={zIndex}
      >
        <Popover.Target>
          <TextInput
            label={label}
            placeholder={placeholder}
            required={required}
            withAsterisk={required}
            value={inputText}
            onChange={handleManualChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={() => setOpened(true)}
            radius="md"
            rightSection={
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpened((o) => !o);
                }}
                title="Select Duration"
              >
                <IconClock size={16} />
              </ActionIcon>
            }
          />
        </Popover.Target>

        <Popover.Dropdown p="sm">
          {/* Header */}
          <Group justify="space-between" align="center" mb={8}>
            <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
              DURATION (MM:SS)
            </Text>
            <Badge
              size="md"
              radius="sm"
              variant="outline"
              styles={{
                root: {
                  borderColor: isDark ? '#475569' : '#D1D5DB',
                  color: isDark ? '#F1F5F9' : '#1F2937',
                  fontWeight: 700,
                  backgroundColor: isDark ? '#1E293B' : '#F3F4F6',
                },
              }}
            >
              {currentDurationValue}
            </Badge>
          </Group>
          <Divider mb={8} />

          {/* Quick Select Presets */}
          <Text size="xs" fw={700} c="dimmed" mb={4} style={{ letterSpacing: '0.03em' }}>
            QUICK SELECT
          </Text>
          <SimpleGrid cols={3} spacing={6} mb={10}>
            {PRESET_DURATIONS.map((p) => {
              const isMatch = currentDurationValue === p.value;
              return (
                <Button
                  key={p.value}
                  size="xs"
                  radius="md"
                  onClick={() => handlePresetSelect(p.value)}
                  style={{
                    backgroundColor: isMatch ? '#4B5563' : isDark ? '#1E293B' : '#F3F4F6',
                    color: isMatch ? '#FFFFFF' : isDark ? '#94A3B8' : '#4B5563',
                    fontWeight: 700,
                    height: 28,
                    border: isMatch ? 'none' : isDark ? '1px solid #334155' : '1px solid #E5E7EB',
                    transition: 'all 150ms ease',
                  }}
                >
                  {p.label}
                </Button>
              );
            })}
          </SimpleGrid>

          {/* Minutes Selector */}
          <Group justify="space-between" align="center" mb={4}>
            <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.03em' }}>
              MINUTES (MM)
            </Text>
            <Text size="xs" c="dimmed" fw={600}>
              {min} min
            </Text>
          </Group>
          <SimpleGrid cols={6} spacing={4} mb={10}>
            {MINUTE_OPTIONS.map((mOption) => {
              const isMatch = min === mOption;
              return (
                <Button
                  key={mOption}
                  size="xs"
                  radius="sm"
                  p={0}
                  onClick={() => handleMinuteSelect(mOption)}
                  style={{
                    backgroundColor: isMatch ? '#4B5563' : isDark ? '#1E293B' : '#FFFFFF',
                    color: isMatch ? '#FFFFFF' : isDark ? '#F1F5F9' : '#1F2937',
                    height: 28,
                    fontSize: 12,
                    fontWeight: isMatch ? 700 : 500,
                    border: isMatch ? 'none' : isDark ? '1px solid #334155' : '1px solid #E5E7EB',
                    transition: 'all 150ms ease',
                  }}
                >
                  {mOption}
                </Button>
              );
            })}
          </SimpleGrid>

          {/* Seconds Selector */}
          <Group justify="space-between" align="center" mb={4}>
            <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.03em' }}>
              SECONDS (SS)
            </Text>
            <Text size="xs" c="dimmed" fw={600}>
              {sec} sec
            </Text>
          </Group>
          <SimpleGrid cols={4} spacing={4} mb={10}>
            {SECOND_OPTIONS.map((sOption) => {
              const isMatch = sec === sOption;
              return (
                <Button
                  key={sOption}
                  size="xs"
                  radius="sm"
                  p={0}
                  onClick={() => handleSecondSelect(sOption)}
                  style={{
                    backgroundColor: isMatch ? '#4B5563' : isDark ? '#1E293B' : '#FFFFFF',
                    color: isMatch ? '#FFFFFF' : isDark ? '#F1F5F9' : '#1F2937',
                    height: 28,
                    fontSize: 12,
                    fontWeight: isMatch ? 700 : 500,
                    border: isMatch ? 'none' : isDark ? '1px solid #334155' : '1px solid #E5E7EB',
                    transition: 'all 150ms ease',
                  }}
                >
                  :{sOption}
                </Button>
              );
            })}
          </SimpleGrid>

          <Divider my={8} />

          {/* Footer */}
          <Group justify="space-between" align="center">
            <Group gap={8}>
              <Button
                variant="subtle"
                size="xs"
                p={0}
                onClick={handleReset}
                style={{
                  color: '#64748B',
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                00:00
              </Button>
              <Text size="xs" c="dimmed">•</Text>
              <Button
                variant="subtle"
                size="xs"
                p={0}
                onClick={handleDefault}
                style={{
                  color: '#0078D4',
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                Default (02:30)
              </Button>
            </Group>

            <Button
              size="xs"
              radius="sm"
              onClick={() => setOpened(false)}
              style={{
                backgroundColor: '#374151',
                color: '#FFFFFF',
                fontWeight: 700,
                height: 26,
                padding: '0 14px',
              }}
            >
              Done
            </Button>
          </Group>
        </Popover.Dropdown>
      </Popover>
    </Box>
  );
};
