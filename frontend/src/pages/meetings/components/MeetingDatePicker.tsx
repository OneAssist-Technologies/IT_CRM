import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Popover,
  TextInput,
  ActionIcon,
  Group,
  Text,
  SimpleGrid,
  UnstyledButton,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconX,
} from '@tabler/icons-react';

export interface MeetingDatePickerProps {
  value: string; // expects YYYY-MM-DD or DD-MM-YYYY
  onChange: (value: string) => void; // outputs YYYY-MM-DD
  label?: string;
  placeholder?: string;
  required?: boolean;
  zIndex?: number;
  styles?: any;
  leftSection?: React.ReactNode;
  rightSection?: React.ReactNode;
  error?: React.ReactNode;
  clearable?: boolean;
  disabled?: boolean;
  minDate?: Date | string;
  maxDate?: Date | string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Week starts on Monday to match exact reference design: M T W T F S S
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const formatToYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatToDMY = (ymdStr: string): string => {
  if (!ymdStr) return '';
  const parts = ymdStr.split(/[-/. ]+/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD -> DD-MM-YYYY
      const d = parts[2].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[0];
      return `${d}-${m}-${y}`;
    } else {
      // DD-MM-YYYY
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${d}-${m}-${y}`;
    }
  }
  return ymdStr;
};

const parseFlexibleDate = (str: string): Date | null => {
  if (!str) return null;
  const trimmed = str.trim();

  // Check 8-digit ddmmyyyy e.g. '13102026'
  const eightDigit = trimmed.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (eightDigit) {
    const day = parseInt(eightDigit[1], 10);
    const month = parseInt(eightDigit[2], 10) - 1;
    const year = parseInt(eightDigit[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 1970 && year <= 2100) {
      const d = new Date(year, month, day);
      if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        return d;
      }
    }
  }

  // Split on -, /, ., or space
  const parts = trimmed.split(/[-/. ]+/);
  if (parts.length === 3) {
    let day: number, month: number, year: number;

    if (parts[0].length === 4) {
      // YYYY-MM-DD format
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      // DD-MM-YYYY format
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      let yr = parseInt(parts[2], 10);
      if (yr < 100) {
        yr = yr < 50 ? 2000 + yr : 1900 + yr;
      }
      year = yr;
    }

    if (
      !isNaN(day) && !isNaN(month) && !isNaN(year) &&
      month >= 0 && month <= 11 &&
      day >= 1 && day <= 31 &&
      year >= 1970 && year <= 2100
    ) {
      const d = new Date(year, month, day);
      if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        return d;
      }
    }
  }
  return null;
};

export const MeetingDatePicker: React.FC<MeetingDatePickerProps> = ({
  value,
  onChange,
  label = 'Meeting Date',
  placeholder = 'dd-mm-yyyy',
  required = true,
  zIndex = 3000,
  styles,
  leftSection,
  rightSection,
  error,
  clearable = true,
  disabled = false,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const [opened, setOpened] = useState(false);

  // Dynamic view mode: 'days' | 'months' | 'years'
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');

  // Local text input state for fluid typing
  const [inputText, setInputText] = useState<string>(() => formatToDMY(value));

  // Calendar navigator state
  const initialDate = parseFlexibleDate(value) || new Date();
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());

  // Decade / 12-year window calculation for years mode
  const yearRangeStart = Math.floor(viewYear / 12) * 12;

  // Synchronize internal state when external value changes
  useEffect(() => {
    const parsedExt = parseFlexibleDate(value);
    if (parsedExt) {
      setViewYear(parsedExt.getFullYear());
      setViewMonth(parsedExt.getMonth());
      const dmy = formatToDMY(value);
      const currentParsed = parseFlexibleDate(inputText);
      if (!currentParsed || currentParsed.getTime() !== parsedExt.getTime()) {
        setInputText(dmy);
      }
    } else if (!value) {
      setInputText('');
    }
  }, [value]);

  // Today reference
  const today = useMemo(() => new Date(), []);
  const todayMidnight = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayYMD = formatToYMD(today);
  const selectedDateObj = parseFlexibleDate(value);
  const selectedYMD = selectedDateObj ? formatToYMD(selectedDateObj) : '';

  // Monday-first offset & days in month
  const firstDay = new Date(viewYear, viewMonth, 1);
  const mondayFirstOffset = (firstDay.getDay() + 6) % 7; // Mon: 0, Tue: 1, ..., Sun: 6
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'days') {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear((y) => y - 1);
      } else {
        setViewMonth((m) => m - 1);
      }
    } else if (viewMode === 'months') {
      setViewYear((y) => y - 1);
    } else if (viewMode === 'years') {
      setViewYear((y) => y - 12);
    }
  };

  const handleNext = () => {
    if (viewMode === 'days') {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear((y) => y + 1);
      } else {
        setViewMonth((m) => m + 1);
      }
    } else if (viewMode === 'months') {
      setViewYear((y) => y + 1);
    } else if (viewMode === 'years') {
      setViewYear((y) => y + 12);
    }
  };

  const handleSelectDay = (dayNum: number) => {
    const chosen = new Date(viewYear, viewMonth, dayNum);
    const ymd = formatToYMD(chosen);
    const dmy = formatToDMY(ymd);
    setInputText(dmy);
    onChange(ymd);
  };

  const handleSelectMonth = (monthIndex: number) => {
    setViewMonth(monthIndex);
    setViewMode('days');
  };

  const handleSelectYear = (year: number) => {
    setViewYear(year);
    setViewMode('months');
  };

  const handleResetToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    const ymd = formatToYMD(now);
    const dmy = formatToDMY(ymd);
    setInputText(dmy);
    onChange(ymd);
    setViewMode('days');
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setInputText('');
    onChange('');
  };

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputText(raw);

    const parsed = parseFlexibleDate(raw);
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
      onChange(formatToYMD(parsed));
    }
  };

  const handleBlur = () => {
    const parsed = parseFlexibleDate(inputText);
    if (parsed) {
      const dmy = formatToDMY(formatToYMD(parsed));
      setInputText(dmy);
      onChange(formatToYMD(parsed));
    } else if (inputText.trim() === '') {
      setInputText('');
      onChange('');
    } else {
      if (value) {
        setInputText(formatToDMY(value));
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

  return (
    <Box>
      <Popover
        opened={opened}
        onChange={(o) => {
          setOpened(o);
          if (!o) setViewMode('days');
        }}
        position="bottom-start"
        shadow="xl"
        radius="xl"
        width={288}
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
            disabled={disabled}
            onChange={handleManualChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={() => {
              if (!disabled) setOpened(true);
            }}
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
                  fontWeight: 500,
                },
              }
            }
            radius="md"
            leftSection={
              leftSection !== undefined ? (
                leftSection
              ) : (
                <IconCalendar size={17} color="#0091FF" />
              )
            }
            error={error}
            rightSection={
              rightSection !== undefined ? (
                rightSection
              ) : (
                <Group gap={4} wrap="nowrap" style={{ paddingRight: 6 }}>
                  {clearable && (value || inputText) && !disabled && (
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      color="gray"
                      onClick={handleClear}
                      title="Clear date"
                    >
                      <IconX size={13} />
                    </ActionIcon>
                  )}
                </Group>
              )
            }
          />
        </Popover.Target>

        <Popover.Dropdown className="crm-calendar-dropdown">
          {/* Header matching reference image: "Month Year" on left, "<" and ">" on right */}
          <Group justify="space-between" align="center" mb={14} px={4}>
            {/* Interactive Header Title */}
            {viewMode === 'days' && (
              <UnstyledButton
                className="crm-calendar-nav-title"
                onClick={() => setViewMode('months')}
                title="Click to choose month"
              >
                <span>{MONTH_NAMES[viewMonth]} {viewYear}</span>
              </UnstyledButton>
            )}

            {viewMode === 'months' && (
              <UnstyledButton
                className="crm-calendar-nav-title"
                onClick={() => setViewMode('years')}
                title="Click to choose year"
              >
                <span>{viewYear}</span>
              </UnstyledButton>
            )}

            {viewMode === 'years' && (
              <UnstyledButton
                className="crm-calendar-nav-title"
                onClick={() => setViewMode('days')}
                title="Click to return to calendar"
              >
                <span>{yearRangeStart} - {yearRangeStart + 11}</span>
              </UnstyledButton>
            )}

            {/* Clean Chevron Arrows */}
            <Group gap={4} wrap="nowrap">
              <ActionIcon
                variant="subtle"
                size="sm"
                className="crm-calendar-nav-arrow"
                onClick={handlePrev}
                title="Previous"
              >
                <IconChevronLeft size={16} strokeWidth={2.4} />
              </ActionIcon>

              <ActionIcon
                variant="subtle"
                size="sm"
                className="crm-calendar-nav-arrow"
                onClick={handleNext}
                title="Next"
              >
                <IconChevronRight size={16} strokeWidth={2.4} />
              </ActionIcon>
            </Group>
          </Group>

          {/* VIEW MODE 1: DAYS (EXACT MATCH TO REFERENCE IMAGE) */}
          {viewMode === 'days' && (
            <Box>
              {/* Weekday headers: M T W T F S S */}
              <SimpleGrid cols={7} spacing={0} mb={10}>
                {DAY_LABELS.map((d, idx) => (
                  <Text key={`weekday-${idx}`} className="crm-calendar-weekday-label">
                    {d}
                  </Text>
                ))}
              </SimpleGrid>

              {/* Days Grid */}
              <SimpleGrid cols={7} spacing={2} mb={12}>
                {/* Blank spaces before 1st of month */}
                {Array.from({ length: mondayFirstOffset }).map((_, i) => (
                  <Box key={`blank-${i}`} style={{ width: 33, height: 33 }} />
                ))}

                {/* Days of current month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateObj = new Date(viewYear, viewMonth, dayNum);
                  const dateYMD = formatToYMD(dateObj);
                  const isSelected = selectedYMD === dateYMD;
                  const isToday = todayYMD === dateYMD;
                  const isPast = dateObj < todayMidnight;

                  const cellClasses = [
                    'crm-calendar-day-circle',
                    isSelected ? 'is-selected' : '',
                    isToday ? 'is-today' : '',
                    !isSelected && isPast ? 'is-past' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <UnstyledButton
                      key={`day-${dayNum}`}
                      className={cellClasses}
                      onClick={() => handleSelectDay(dayNum)}
                    >
                      {dayNum}
                    </UnstyledButton>
                  );
                })}
              </SimpleGrid>
            </Box>
          )}

          {/* VIEW MODE 2: MONTHS SELECTOR GRID */}
          {viewMode === 'months' && (
            <SimpleGrid cols={3} spacing={8} mb={12} mt={4}>
              {MONTH_SHORT.map((mName, mIdx) => {
                const isSelected =
                  selectedDateObj !== null &&
                  selectedDateObj.getFullYear() === viewYear &&
                  selectedDateObj.getMonth() === mIdx;
                const isCurrentMonth =
                  today.getFullYear() === viewYear && today.getMonth() === mIdx;

                const classes = [
                  'crm-calendar-view-cell',
                  isSelected ? 'is-selected' : '',
                  isCurrentMonth ? 'is-current' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <UnstyledButton
                    key={mName}
                    className={classes}
                    onClick={() => handleSelectMonth(mIdx)}
                  >
                    {mName}
                  </UnstyledButton>
                );
              })}
            </SimpleGrid>
          )}

          {/* VIEW MODE 3: YEARS SELECTOR GRID */}
          {viewMode === 'years' && (
            <SimpleGrid cols={3} spacing={8} mb={12} mt={4}>
              {Array.from({ length: 12 }).map((_, i) => {
                const yr = yearRangeStart + i;
                const isSelected =
                  selectedDateObj !== null && selectedDateObj.getFullYear() === yr;
                const isCurrentYear = today.getFullYear() === yr;

                const classes = [
                  'crm-calendar-view-cell',
                  isSelected ? 'is-selected' : '',
                  isCurrentYear ? 'is-current' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <UnstyledButton
                    key={yr}
                    className={classes}
                    onClick={() => handleSelectYear(yr)}
                  >
                    {yr}
                  </UnstyledButton>
                );
              })}
            </SimpleGrid>
          )}

          {/* Minimalist Bottom Actions */}
          <Group justify="space-between" align="center" pt={4} px={4}>
            <UnstyledButton
              onClick={handleResetToday}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#0091FF',
                cursor: 'pointer',
              }}
            >
              Today
            </UnstyledButton>

            <Group gap={8}>
              {value && (
                <UnstyledButton
                  onClick={handleClear}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: isDark ? '#94A3B8' : '#6B7280',
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </UnstyledButton>
              )}

              <UnstyledButton
                onClick={() => setOpened(false)}
                style={{
                  backgroundColor: '#0091FF',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 11,
                  padding: '4px 12px',
                  borderRadius: 9999,
                  boxShadow: '0 2px 8px rgba(0, 145, 255, 0.35)',
                  cursor: 'pointer',
                }}
              >
                Done
              </UnstyledButton>
            </Group>
          </Group>
        </Popover.Dropdown>
      </Popover>
    </Box>
  );
};
