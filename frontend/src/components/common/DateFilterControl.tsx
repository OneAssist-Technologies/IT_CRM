import { MeetingDatePicker } from '../../pages/meetings/components/MeetingDatePicker';
import React, { useState, useMemo } from 'react';
import {
  Popover,
  Button,
  Group,
  Text,
  ActionIcon,
  SegmentedControl,
  Stack,
  TextInput,
  Box,
  useComputedColorScheme,
  Divider,
} from '@mantine/core';
import {
  IconCalendar,
  IconChevronDown,
  IconX,
  IconClock,
  IconCalendarEvent,
  IconCalendarStats,
} from '@tabler/icons-react';

export type DateFilterType =
  | 'ALL'
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'CUSTOM_DAY'
  | 'CUSTOM_MONTH'
  | 'CUSTOM_RANGE';

export interface DateFilterValue {
  type: DateFilterType;
  customDay?: string; // YYYY-MM-DD
  customMonth?: string; // YYYY-MM
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export const DEFAULT_DATE_FILTER: DateFilterValue = {
  type: 'ALL',
};

/**
 * Safely parse any date string or Date object into a valid Date
 */
export function parseDateSafely(dateVal: any): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? null : dateVal;
  }
  if (typeof dateVal === 'number') {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof dateVal !== 'string') return null;

  const trimmed = dateVal.trim();
  if (!trimmed) return null;

  // Handle standard ISO timestamps (e.g. 2026-10-14T07:15:30Z) with proper timezone handling
  if (trimmed.includes('T') || trimmed.endsWith('Z')) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  // Check pure YYYY-MM-DD or YYYY/MM/DD without time
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split(/[-/]/).map(Number);
    const dateObj = new Date(y, m - 1, d);
    if (!isNaN(dateObj.getTime())) return dateObj;
  }

  // Check pure DD-MM-YYYY or DD/MM/YYYY without time
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split(/[-/]/).map(Number);
    const dateObj = new Date(y, m - 1, d);
    if (!isNaN(dateObj.getTime())) return dateObj;
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Matches an item's date against the current DateFilterValue
 */
export function isDateMatchingFilter(dateVal: any, filter?: DateFilterValue | null): boolean {
  if (!filter || filter.type === 'ALL') return true;

  const targetDate = parseDateSafely(dateVal);
  if (!targetDate) return false;

  const now = new Date();
  const targetY = targetDate.getFullYear();
  const targetM = targetDate.getMonth(); // 0-indexed
  const targetD = targetDate.getDate();

  const nowY = now.getFullYear();
  const nowM = now.getMonth();
  const nowD = now.getDate();

  switch (filter.type) {
    case 'TODAY': {
      return targetY === nowY && targetM === nowM && targetD === nowD;
    }
    case 'YESTERDAY': {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return (
        targetY === yesterday.getFullYear() &&
        targetM === yesterday.getMonth() &&
        targetD === yesterday.getDate()
      );
    }
    case 'THIS_WEEK': {
      const startOfWeek = new Date(now);
      const dayOfWeek = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      return targetDate >= startOfWeek && targetDate <= endOfWeek;
    }
    case 'THIS_MONTH': {
      return targetY === nowY && targetM === nowM;
    }
    case 'LAST_MONTH': {
      const lastMonth = new Date(nowY, nowM - 1, 1);
      return targetY === lastMonth.getFullYear() && targetM === lastMonth.getMonth();
    }
    case 'CUSTOM_DAY': {
      if (!filter.customDay) return true;
      const parsedCustom = parseDateSafely(filter.customDay);
      if (!parsedCustom) return true;
      return (
        targetY === parsedCustom.getFullYear() &&
        targetM === parsedCustom.getMonth() &&
        targetD === parsedCustom.getDate()
      );
    }
    case 'CUSTOM_MONTH': {
      if (!filter.customMonth) return true;
      const parts = filter.customMonth.split('-').map((n) => parseInt(n, 10));
      if (parts.length >= 2) {
        return targetY === parts[0] && targetM === parts[1] - 1;
      }
      return true;
    }
    case 'CUSTOM_RANGE': {
      if (filter.startDate) {
        const start = parseDateSafely(filter.startDate);
        if (start) {
          start.setHours(0, 0, 0, 0);
          if (targetDate < start) return false;
        }
      }
      if (filter.endDate) {
        const end = parseDateSafely(filter.endDate);
        if (end) {
          end.setHours(23, 59, 59, 999);
          if (targetDate > end) return false;
        }
      }
      return true;
    }
    default:
      return true;
  }
}

interface DateFilterControlProps {
  value: DateFilterValue;
  onChange: (val: DateFilterValue) => void;
  width?: number | string;
}

export const DateFilterControl: React.FC<DateFilterControlProps> = ({
  value = DEFAULT_DATE_FILTER,
  onChange,
  width = 150,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const [opened, setOpened] = useState(false);

  // Tab mode in popover: 'DAY' | 'MONTH' | 'RANGE'
  const [mode, setMode] = useState<'DAY' | 'MONTH' | 'RANGE'>(() => {
    if (value.type === 'THIS_MONTH' || value.type === 'LAST_MONTH' || value.type === 'CUSTOM_MONTH') {
      return 'MONTH';
    }
    if (value.type === 'CUSTOM_RANGE') {
      return 'RANGE';
    }
    return 'DAY';
  });

  const now = new Date();
  const todayStr = useMemo(() => {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const currentMonthStr = useMemo(() => {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Format active label for trigger button
  const triggerLabel = useMemo(() => {
    switch (value.type) {
      case 'TODAY':
        return 'Today';
      case 'YESTERDAY':
        return 'Yesterday';
      case 'THIS_WEEK':
        return 'This Week';
      case 'THIS_MONTH':
        return 'This Month';
      case 'LAST_MONTH':
        return 'Last Month';
      case 'CUSTOM_DAY': {
        if (!value.customDay) return 'Day Filter';
        const d = parseDateSafely(value.customDay);
        return d
          ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : value.customDay;
      }
      case 'CUSTOM_MONTH': {
        if (!value.customMonth) return 'Month Filter';
        const [y, m] = value.customMonth.split('-');
        const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
        return d
          ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : value.customMonth;
      }
      case 'CUSTOM_RANGE': {
        if (value.startDate && value.endDate) {
          const s = parseDateSafely(value.startDate);
          const e = parseDateSafely(value.endDate);
          const sStr = s ? s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : value.startDate;
          const eStr = e ? e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : value.endDate;
          return `${sStr} - ${eStr}`;
        }
        return 'Date Range';
      }
      default:
        return 'All Dates';
    }
  }, [value]);

  const isActive = value.type !== 'ALL';

  const handleClear = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    onChange(DEFAULT_DATE_FILTER);
  };

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      withArrow
      shadow="md"
      radius="md"
      offset={8}
      withinPortal
      zIndex={1000}
    >
      <Popover.Target>
        <Button
          variant={isActive ? 'light' : 'default'}
          color={isActive ? 'indigo' : 'gray'}
          size="sm"
          radius="md"
          onClick={() => setOpened((o) => !o)}
          leftSection={
            <IconCalendar
              size={15}
              color={isActive ? (isDark ? '#818CF8' : '#4F46E5') : isDark ? '#94A3B8' : '#64748B'}
            />
          }
          rightSection={
            isActive ? (
              <Box
                component="span"
                onClick={handleClear}
                title="Clear date filter"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: '2px',
                  borderRadius: 4,
                  color: isDark ? '#F87171' : '#EF4444',
                }}
              >
                <IconX size={12} />
              </Box>
            ) : (
              <IconChevronDown size={14} color={isDark ? '#94A3B8' : '#64748B'} />
            )
          }
          style={{
            height: 36,
            minWidth: width,
            fontWeight: isActive ? 600 : 500,
            fontSize: 13,
            backgroundColor: isActive
              ? isDark
                ? 'rgba(79, 70, 229, 0.25)'
                : '#EEF2FF'
              : isDark
              ? '#1E293B'
              : '#F8FAFC',
            borderColor: isActive
              ? isDark
                ? '#6366F1'
                : '#818CF8'
              : isDark
              ? 'rgba(255, 255, 255, 0.12)'
              : '#E2E8F0',
            color: isActive
              ? isDark
                ? '#A5B4FC'
                : '#4F46E5'
              : isDark
              ? '#CBD5E1'
              : '#334155',
            paddingLeft: 10,
            paddingRight: 10,
          }}
        >
          {triggerLabel}
        </Button>
      </Popover.Target>

      <Popover.Dropdown
        style={{
          width: 320,
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? '#334155' : '#E2E8F0',
          padding: '14px 16px',
        }}
      >
        <Stack gap="xs">
          {/* Header */}
          <Group justify="space-between" align="center">
            <Group gap={6} align="center">
              <IconCalendar size={16} color={isDark ? '#818CF8' : '#4F46E5'} />
              <Text size="sm" fw={700} style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                Filter By Date
              </Text>
            </Group>
            {isActive && (
              <Button
                variant="subtle"
                color="red"
                size="compact-xs"
                onClick={() => {
                  handleClear();
                  setOpened(false);
                }}
              >
                Reset All
              </Button>
            )}
          </Group>

          {/* Segmented Mode Selector: Day-wise vs Month-wise vs Custom */}
          <SegmentedControl
            value={mode}
            onChange={(val: any) => setMode(val)}
            data={[
              { label: 'Day-wise', value: 'DAY' },
              { label: 'Month-wise', value: 'MONTH' },
              { label: 'Range', value: 'RANGE' },
            ]}
            size="xs"
            radius="md"
            fullWidth
            styles={{
              root: {
                backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
              },
            }}
          />

          {/* DAY-WISE CONTROLS */}
          {mode === 'DAY' && (
            <Stack gap="xs" mt={4}>
              <Text size="xs" fw={600} c="dimmed">
                Quick Day Presets
              </Text>
              <Group grow gap="xs">
                <Button
                  size="xs"
                  variant={value.type === 'TODAY' ? 'filled' : 'light'}
                  color="indigo"
                  onClick={() => {
                    onChange({ type: 'TODAY' });
                    setOpened(false);
                  }}
                  leftSection={<IconClock size={13} />}
                >
                  Today
                </Button>
                <Button
                  size="xs"
                  variant={value.type === 'YESTERDAY' ? 'filled' : 'light'}
                  color="indigo"
                  onClick={() => {
                    onChange({ type: 'YESTERDAY' });
                    setOpened(false);
                  }}
                >
                  Yesterday
                </Button>
              </Group>

              <Divider my={4} label="Or Specific Date" labelPosition="center" />

              <MeetingDatePicker
                label="Pick Any Day"
                placeholder="DD-MM-YYYY"
                value={value.customDay || (value.type === 'CUSTOM_DAY' ? todayStr : '')}
                onChange={(val: string) => {
                  if (val) {
                    onChange({ type: 'CUSTOM_DAY', customDay: val });
                  }
                }}
                zIndex={3500}
              />
            </Stack>
          )}

          {/* MONTH-WISE CONTROLS */}
          {mode === 'MONTH' && (
            <Stack gap="xs" mt={4}>
              <Text size="xs" fw={600} c="dimmed">
                Quick Month Presets
              </Text>
              <Group grow gap="xs">
                <Button
                  size="xs"
                  variant={value.type === 'THIS_MONTH' ? 'filled' : 'light'}
                  color="indigo"
                  onClick={() => {
                    onChange({ type: 'THIS_MONTH' });
                    setOpened(false);
                  }}
                  leftSection={<IconCalendarEvent size={13} />}
                >
                  This Month
                </Button>
                <Button
                  size="xs"
                  variant={value.type === 'LAST_MONTH' ? 'filled' : 'light'}
                  color="indigo"
                  onClick={() => {
                    onChange({ type: 'LAST_MONTH' });
                    setOpened(false);
                  }}
                >
                  Last Month
                </Button>
              </Group>

              <Divider my={4} label="Or Specific Month" labelPosition="center" />

              <TextInput
                type="month"
                size="xs"
                label="Pick Any Month"
                value={value.customMonth || (value.type === 'CUSTOM_MONTH' ? currentMonthStr : '')}
                onChange={(e) => {
                  const m = e.target.value;
                  if (m) {
                    onChange({ type: 'CUSTOM_MONTH', customMonth: m });
                  }
                }}
                styles={{
                  input: {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                }}
              />
            </Stack>
          )}

          {/* RANGE CONTROLS */}
          {mode === 'RANGE' && (
            <Stack gap="xs" mt={4}>
              <Button
                size="xs"
                variant={value.type === 'THIS_WEEK' ? 'filled' : 'light'}
                color="indigo"
                onClick={() => {
                  onChange({ type: 'THIS_WEEK' });
                  setOpened(false);
                }}
                leftSection={<IconCalendarStats size={13} />}
                fullWidth
              >
                This Week
              </Button>

              <Divider my={4} label="Custom Date Range" labelPosition="center" />

              <Group grow gap="xs">
                <MeetingDatePicker
                  label="From"
                  placeholder="DD-MM-YYYY"
                  value={value.startDate || ''}
                  onChange={(val: string) => {
                    onChange({
                      type: 'CUSTOM_RANGE',
                      startDate: val,
                      endDate: value.endDate || '',
                    });
                  }}
                  zIndex={3500}
                />
                <MeetingDatePicker
                  label="To"
                  placeholder="DD-MM-YYYY"
                  value={value.endDate || ''}
                  onChange={(val: string) => {
                    onChange({
                      type: 'CUSTOM_RANGE',
                      startDate: value.startDate || '',
                      endDate: val,
                    });
                  }}
                  zIndex={3500}
                />
              </Group>
            </Stack>
          )}

          {/* Footer Action to show all */}
          <Divider my={4} />
          <Group justify="space-between" align="center">
            <Button
              variant="subtle"
              size="xs"
              onClick={() => {
                onChange(DEFAULT_DATE_FILTER);
                setOpened(false);
              }}
            >
              Show All Dates
            </Button>
            <Button
              size="xs"
              color="indigo"
              onClick={() => setOpened(false)}
            >
              Done
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};
