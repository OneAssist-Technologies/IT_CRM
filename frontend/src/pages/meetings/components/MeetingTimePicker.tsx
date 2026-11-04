import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Popover,
  TextInput,
  Group,
  Text,
  Badge,
  Divider,
  Button,
  UnstyledButton,
  SegmentedControl,
  useComputedColorScheme,
} from '@mantine/core';
import { IconClock } from '@tabler/icons-react';

export interface MeetingTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  zIndex?: number;
  styles?: any;
  leftSection?: React.ReactNode;
  rightSection?: React.ReactNode;
  error?: React.ReactNode;
  hideQuickSelect?: boolean;
}

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const STANDARD_MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const QUICK_PRESETS = ['09:00 AM', '10:00 AM', '11:30 AM', '02:00 PM', '04:00 PM'];

interface ParsedTimeResult {
  hours: string; // "01" - "12"
  minutes: string; // "00" - "59"
  period: 'AM' | 'PM';
  formatted: string; // "HH:MM AM"
}

const parseFlexibleTime = (str: string, currentPeriod = (new Date().getHours() >= 12 ? 'PM' : 'AM')): ParsedTimeResult | null => {
  if (!str) return null;
  const trimmed = str.trim().toLowerCase();

  // 1. HH:MM or HH.MM with optional AM/PM
  const colonMatch = trimmed.match(/^(\d{1,2})[:.](\d{1,2})(?:\s*(am|pm))?$/i);
  if (colonMatch) {
    let h = parseInt(colonMatch[1], 10);
    const m = parseInt(colonMatch[2], 10);
    const meridiem = colonMatch[3] ? (colonMatch[3].toUpperCase() as 'AM' | 'PM') : null;

    if (m < 0 || m > 59) return null;

    if (meridiem) {
      if (h === 0) h = 12;
      else if (h > 12 && h < 24) h = h - 12;
      else if (h > 12) return null;
      const hStr = String(h).padStart(2, '0');
      const mStr = String(m).padStart(2, '0');
      return { hours: hStr, minutes: mStr, period: meridiem, formatted: `${hStr}:${mStr} ${meridiem}` };
    } else {
      if (h >= 13 && h <= 23) {
        const h12 = h - 12;
        const hStr = String(h12).padStart(2, '0');
        const mStr = String(m).padStart(2, '0');
        return { hours: hStr, minutes: mStr, period: 'PM', formatted: `${hStr}:${mStr} PM` };
      } else if (h === 0) {
        const hStr = '12';
        const mStr = String(m).padStart(2, '0');
        return { hours: hStr, minutes: mStr, period: 'AM', formatted: `${hStr}:${mStr} AM` };
      } else {
        const hStr = String(h > 12 ? h - 12 : h).padStart(2, '0');
        const mStr = String(m).padStart(2, '0');
        const p = (currentPeriod === 'PM' ? 'PM' : 'AM') as 'AM' | 'PM';
        return { hours: hStr, minutes: mStr, period: p, formatted: `${hStr}:${mStr} ${p}` };
      }
    }
  }

  // 2. Hour with AM/PM (e.g. '2pm', '11am', '2 pm')
  const hourAmPmMatch = trimmed.match(/^(\d{1,2})\s*(am|pm)$/i);
  if (hourAmPmMatch) {
    const h = parseInt(hourAmPmMatch[1], 10);
    const meridiem = hourAmPmMatch[2].toUpperCase() as 'AM' | 'PM';
    if (h >= 1 && h <= 12) {
      const hStr = String(h).padStart(2, '0');
      return { hours: hStr, minutes: '00', period: meridiem, formatted: `${hStr}:00 ${meridiem}` };
    }
  }

  // 3. Lone hour (e.g. '2', '14', '9')
  const loneHourMatch = trimmed.match(/^(\d{1,2})$/);
  if (loneHourMatch) {
    const h = parseInt(loneHourMatch[1], 10);
    if (h >= 13 && h <= 23) {
      const hStr = String(h - 12).padStart(2, '0');
      return { hours: hStr, minutes: '00', period: 'PM', formatted: `${hStr}:00 PM` };
    } else if (h >= 1 && h <= 12) {
      const hStr = String(h).padStart(2, '0');
      const p = (currentPeriod || (h >= 8 && h <= 11 ? 'AM' : 'PM')) as 'AM' | 'PM';
      return { hours: hStr, minutes: '00', period: p, formatted: `${hStr}:00 ${p}` };
    } else if (h === 0) {
      return { hours: '12', minutes: '00', period: 'AM', formatted: '12:00 AM' };
    }
  }

  return null;
};

export const MeetingTimePicker: React.FC<MeetingTimePickerProps> = ({
  value,
  onChange,
  label = 'Time',
  placeholder = 'hh:mm a',
  required = false,
  zIndex = 3000,
  styles,
  leftSection,
  rightSection,
  error,
  hideQuickSelect = false,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const [opened, setOpened] = useState(false);
  const [inputText, setInputText] = useState<string>(value || '');
  const [hours, setHours] = useState('10');
  const [minutes, setMinutes] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>(() => (new Date().getHours() >= 12 ? 'PM' : 'AM'));

  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);

  // Sync internal state when external value changes
  useEffect(() => {
    if (!value) {
      setInputText('');
      return;
    }
    const parsed = parseFlexibleTime(value, period);
    if (parsed) {
      setHours(parsed.hours);
      setMinutes(parsed.minutes);
      setPeriod(parsed.period);
      const currentParsed = parseFlexibleTime(inputText, period);
      if (!currentParsed || currentParsed.formatted !== parsed.formatted) {
        setInputText(value);
      }
    }
  }, [value]);

  // Scroll active item into view when popover opens
  useEffect(() => {
    if (opened) {
      const timer = setTimeout(() => {
        const activeHourEl = hourListRef.current?.querySelector('[data-active="true"]');
        if (activeHourEl) {
          activeHourEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
        const activeMinEl = minuteListRef.current?.querySelector('[data-active="true"]');
        if (activeMinEl) {
          activeMinEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [opened]);

  // If current minute is non-standard (e.g. 07, 23), insert it into the list
  const minuteList = useMemo(() => {
    if (minutes && !STANDARD_MINUTES.includes(minutes)) {
      return [...STANDARD_MINUTES, minutes].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    }
    return STANDARD_MINUTES;
  }, [minutes]);

  const updateFromParts = (h: string, m: string, p: 'AM' | 'PM') => {
    const formattedH = h ? (h.length === 1 ? `0${h}` : h) : '10';
    const formattedM = m ? (m.length === 1 ? `0${m}` : m) : '00';
    setHours(formattedH);
    setMinutes(formattedM);
    setPeriod(p);
    const newFormatted = `${formattedH}:${formattedM} ${p}`;
    setInputText(newFormatted);
    onChange(newFormatted);
  };

  const handlePeriodSelect = (p: 'AM' | 'PM') => {
    setPeriod(p);
    updateFromParts(hours, minutes, p);
  };

  const handleHourSelect = (h: string) => {
    setHours(h);
    updateFromParts(h, minutes, period);
  };

  const handleMinuteSelect = (m: string) => {
    setMinutes(m);
    updateFromParts(hours, m, period);
  };

  const handleSetNow = () => {
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes();
    const p: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    const hStr = String(h).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    updateFromParts(hStr, mStr, p);
  };

  const handleClearTime = () => {
    setHours('10');
    setMinutes('00');
    setPeriod('AM');
    setInputText('');
    onChange('');
  };

  const handleSelectPreset = (preset: string) => {
    const parsed = parseFlexibleTime(preset);
    if (parsed) {
      setHours(parsed.hours);
      setMinutes(parsed.minutes);
      setPeriod(parsed.period);
      setInputText(parsed.formatted);
      onChange(parsed.formatted);
    }
  };

  const handleManualTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputText(raw);

    const parsed = parseFlexibleTime(raw, period);
    if (parsed) {
      setHours(parsed.hours);
      setMinutes(parsed.minutes);
      setPeriod(parsed.period);
      onChange(parsed.formatted);
    }
  };

  const handleBlur = () => {
    const parsed = parseFlexibleTime(inputText, period);
    if (parsed) {
      setInputText(parsed.formatted);
      onChange(parsed.formatted);
    } else if (inputText.trim() === '') {
      setInputText('');
      onChange('');
    } else {
      if (value) {
        setInputText(value);
      } else {
        setInputText('');
        onChange('');
      }
    }
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

  const formattedDisplay = `${hours}:${minutes} ${period}`;

  return (
    <Box>
      <Popover
        opened={opened}
        onChange={setOpened}
        position="bottom-start"
        shadow="xl"
        radius="lg"
        width={270}
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
            onChange={handleManualTimeChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={() => setOpened(true)}
            styles={
              styles || {
                label: {
                  fontWeight: 600,
                  fontSize: 13,
                  color: isDark ? '#E2E8F0' : '#374151',
                  marginBottom: 6,
                },
                input: {
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                  fontSize: 14,
                  color: isDark ? '#F8FAFC' : '#1E293B',
                },
              }
            }
            radius="md"
            leftSection={leftSection !== undefined ? leftSection : <IconClock size={16} stroke={1.8} />}
            error={error}
            rightSection={rightSection}
          />
        </Popover.Target>

        <Popover.Dropdown
          p="sm"
          style={{
            backgroundColor: isDark ? 'var(--mantine-color-dark-7)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            borderRadius: 14,
          }}
        >
          {/* Top Bar: Live Time Badge + AM/PM Segmented Pill */}
          <Group
            justify="space-between"
            align="center"
            mb="xs"
            pb={8}
            style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'}` }}
          >
            <Group gap={6} align="center">
              <IconClock size={15} stroke={2} color="#2563EB" />
              <Badge
                size="md"
                radius="md"
                variant="light"
                color="blue"
                styles={{
                  root: {
                    fontWeight: 700,
                    fontSize: 12.5,
                    letterSpacing: '0.02em',
                    padding: '4px 10px',
                    height: 24,
                  },
                }}
              >
                {formattedDisplay}
              </Badge>
            </Group>

            {/* AM / PM Segmented Control */}
            <SegmentedControl
              size="xs"
              radius="xl"
              value={period}
              onChange={(val) => handlePeriodSelect(val as 'AM' | 'PM')}
              data={[
                { label: 'AM', value: 'AM' },
                { label: 'PM', value: 'PM' },
              ]}
              styles={{
                root: {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#EFF6FF',
                  padding: 2,
                },
                indicator: {
                  backgroundColor: '#2563EB',
                },
                label: {
                  fontWeight: 700,
                  fontSize: 11.5,
                  padding: '2px 8px',
                },
              }}
            />
          </Group>

          {/* Quick Presets (Optional) */}
          {!hideQuickSelect && (
            <Box mb="xs" pb={6} style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'}` }}>
              <Group gap={4} wrap="wrap">
                {QUICK_PRESETS.map((slot) => {
                  const isSlotActive = inputText === slot;
                  return (
                    <UnstyledButton
                      key={slot}
                      onClick={() => handleSelectPreset(slot)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: isSlotActive ? 700 : 500,
                        backgroundColor: isSlotActive
                          ? '#2563EB'
                          : isDark
                          ? 'rgba(255, 255, 255, 0.05)'
                          : '#F8FAFC',
                        color: isSlotActive ? '#FFFFFF' : isDark ? '#CBD5E1' : '#475569',
                        border: isSlotActive ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {slot}
                    </UnstyledButton>
                  );
                })}
              </Group>
            </Box>
          )}

          {/* Column Headers */}
          <Group justify="space-between" px={10} pb={4}>
            <Text size="10.5px" fw={700} c="dimmed" style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Hour
            </Text>
            <Text size="10.5px" fw={700} c="dimmed" style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Minute
            </Text>
          </Group>

          {/* Two Sleek Scrollable Columns: Hour & Minute */}
          <Box
            style={{
              display: 'flex',
              gap: 8,
              height: 170,
              position: 'relative',
            }}
          >
            {/* Hours Column */}
            <Box
              ref={hourListRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                paddingRight: 2,
              }}
            >
              {HOURS.map((hr) => {
                const isSelected = hours === hr;
                return (
                  <UnstyledButton
                    key={hr}
                    data-active={isSelected ? 'true' : undefined}
                    onClick={() => handleHourSelect(hr)}
                    style={{
                      width: '100%',
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 8,
                      marginBottom: 2,
                      fontSize: 13,
                      fontWeight: isSelected ? 700 : 500,
                      backgroundColor: isSelected ? '#2563EB' : 'transparent',
                      color: isSelected ? '#FFFFFF' : isDark ? '#E2E8F0' : '#334155',
                      boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.3)' : 'none',
                      transition: 'background-color 0.12s ease, color 0.12s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {hr}
                  </UnstyledButton>
                );
              })}
            </Box>

            {/* Vertical Separator Hairline */}
            <Box
              style={{
                width: 1,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
                margin: '2px 0',
              }}
            />

            {/* Minutes Column */}
            <Box
              ref={minuteListRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                paddingRight: 2,
              }}
            >
              {minuteList.map((min) => {
                const isSelected = minutes === min;
                return (
                  <UnstyledButton
                    key={min}
                    data-active={isSelected ? 'true' : undefined}
                    onClick={() => handleMinuteSelect(min)}
                    style={{
                      width: '100%',
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 8,
                      marginBottom: 2,
                      fontSize: 13,
                      fontWeight: isSelected ? 700 : 500,
                      backgroundColor: isSelected ? '#2563EB' : 'transparent',
                      color: isSelected ? '#FFFFFF' : isDark ? '#E2E8F0' : '#334155',
                      boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.3)' : 'none',
                      transition: 'background-color 0.12s ease, color 0.12s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    :{min}
                  </UnstyledButton>
                );
              })}
            </Box>
          </Box>

          <Divider my={8} style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }} />

          {/* Footer: Now, Clear, Done */}
          <Group justify="space-between" align="center">
            <Group gap={6}>
              <Button
                variant="subtle"
                size="xs"
                color="blue"
                p="xs"
                h={28}
                onClick={handleSetNow}
                style={{ fontSize: 11.5, fontWeight: 600 }}
              >
                Now
              </Button>
              <Button
                variant="subtle"
                size="xs"
                color="gray"
                p="xs"
                h={28}
                onClick={handleClearTime}
                style={{ fontSize: 11.5, fontWeight: 500 }}
              >
                Clear
              </Button>
            </Group>

            <Button
              size="xs"
              radius="md"
              h={28}
              onClick={() => setOpened(false)}
              style={{
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: 12,
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
