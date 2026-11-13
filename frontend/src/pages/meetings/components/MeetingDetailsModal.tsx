import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Box,
  Group,
  Stack,
  Text,
  Badge,
  Button,
  ActionIcon,
  TextInput,
  Textarea,
  Select,
  Paper,
  SimpleGrid,
  Divider,
  Tooltip,
  useComputedColorScheme,
  ThemeIcon,
  Loader,
} from '@mantine/core';
import {
  IconCalendarEvent,
  IconClock,
  IconMapPin,
  IconUser,
  IconBuilding,
  IconUpload,
  IconDownload,
  IconX,
  IconFileDescription,
  IconCheck,
  IconExternalLink,
  IconTarget,
  IconEye,
  IconHistory,
  IconArrowRight,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { ScheduledMeeting, RescheduleRecord } from '../../../types/meeting';
import { updateMeetingApi } from '../../../services/meetingService';
import { MeetingDatePicker } from './MeetingDatePicker';
import { MeetingTimePicker } from './MeetingTimePicker';

const parseTimeToMinutes = (timeStr: string): { minutes: number; isAM: boolean; isPM: boolean; rawHours: number } | null => {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();

  // Match 12-hour: e.g. "10:05 AM", "10:05:00 AM", "10:05am", "2:30 pm"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (match12) {
    const rawHours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridiem = match12[4].toUpperCase();

    let h = rawHours;
    if (h === 12) {
      h = meridiem === 'PM' ? 12 : 0;
    } else if (meridiem === 'PM') {
      h += 12;
    }

    return {
      minutes: h * 60 + minutes,
      isAM: meridiem === 'AM',
      isPM: meridiem === 'PM',
      rawHours,
    };
  }

  // Match 24-hour: e.g. "10:05", "14:30"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);

    return {
      minutes: hours * 60 + minutes,
      isAM: hours < 12,
      isPM: hours >= 12,
      rawHours: hours,
    };
  }

  return null;
};

const calculateMeetingDurationStr = (from: string, to: string): string => {
  const fromParsed = parseTimeToMinutes(from);
  const toParsed = parseTimeToMinutes(to);
  if (!fromParsed || !toParsed) return '';

  let fromMin = fromParsed.minutes;
  let toMin = toParsed.minutes;
  if (toParsed.rawHours === 12 && toParsed.isAM && fromParsed.isAM && fromMin >= 360) {
    toMin = 720;
  }
  let diffMinutes = toMin - fromMin;
  if (diffMinutes < 0) diffMinutes += 24 * 60;
  if (diffMinutes === 0) return '0 Minutes';

  const h = Math.floor(diffMinutes / 60);
  const m = Math.floor(diffMinutes % 60);
  if (h > 0 && m > 0) return `${h} Hour ${m} Minutes`;
  if (h > 0 && m === 0) return `${h} ${h === 1 ? 'Hour' : 'Hours'}`;
  return `${m} Minutes`;
};

const calculateEndTime = (startTimeStr: string, durationStr: string): string => {
  try {
    const trimmed = (startTimeStr || '10:00 AM').trim();
    const parts = trimmed.split(' ');
    const timePart = parts[0] || '10:00';
    const meridiem = (parts[1] || 'AM').toUpperCase();
    const [h, m] = timePart.split(':').map(Number);
    let durMin = 30;
    if (durationStr.includes('15')) durMin = 15;
    else if (durationStr.includes('45')) durMin = 45;
    else if (durationStr.includes('1.5')) durMin = 90;
    else if (durationStr.includes('2')) durMin = 120;
    else if (durationStr.includes('1 Hour') || durationStr.includes('60')) durMin = 60;
    else durMin = 30;

    const baseH = (h % 12) + (meridiem === 'PM' ? 12 : 0);
    const totalMin = baseH * 60 + (isNaN(m) ? 0 : m) + durMin;
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;
    const endMeridiem = endH >= 12 ? 'PM' : 'AM';
    const displayEndH = (endH % 12) || 12;
    return `${displayEndH}:${endM.toString().padStart(2, '0')} ${endMeridiem}`;
  } catch (_) {
    return '10:30 AM';
  }
};

const shouldShowEndTime = (statusVal?: string): boolean => {
  if (!statusVal) return false;
  const s = statusVal.toLowerCase().trim();
  const excluded = ['not interested', 'not-interested', 'cancelled', 'rescheduled', 'scheduled', 'schedule', 'pending'];
  return !excluded.includes(s);
};

interface MeetingDetailsModalProps {
  opened: boolean;
  onClose: () => void;
  meeting: ScheduledMeeting | null;
  onMeetingUpdated?: (updated: ScheduledMeeting) => void;
  onNavigateToLead?: (meeting: ScheduledMeeting) => void;
}

export const MeetingDetailsModal: React.FC<MeetingDetailsModalProps> = ({
  opened,
  onClose,
  meeting,
  onMeetingUpdated,
  onNavigateToLead,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const [title, setTitle] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [hostName, setHostName] = useState<string>('');
  const [initialMeetingDate, setInitialMeetingDate] = useState<string>('');
  const [initialStartTime, setInitialStartTime] = useState<string>('');
  const [meetingDate, setMeetingDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [newMeetingDate, setNewMeetingDate] = useState<string>('');
  const [newMeetingTime, setNewMeetingTime] = useState<string>('');
  const [duration, setDuration] = useState<string>('30 Minutes');
  const [meetingType, setMeetingType] = useState<string>('Virtual');
  const [location, setLocation] = useState<string>('');
  const [status, setStatus] = useState<string>('Scheduled');
  const [rescheduleReason, setRescheduleReason] = useState<string>('');
  const [rescheduleHistory, setRescheduleHistory] = useState<RescheduleRecord[]>([]);
  const [requirements, setRequirements] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileUrl, setFileUrl] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Convert Base64 data URL to Blob URL to safely view or open in a new tab without browser security blocks
  const getSafeBlobUrl = (dataUrlOrUrl: string): string => {
    if (!dataUrlOrUrl || !dataUrlOrUrl.startsWith('data:')) return dataUrlOrUrl;
    try {
      const arr = dataUrlOrUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      return URL.createObjectURL(blob);
    } catch (err) {
      return dataUrlOrUrl;
    }
  };

  const handleOpenInNewWindow = () => {
    if (!fileUrl) return;
    const safeUrl = getSafeBlobUrl(fileUrl);
    window.open(safeUrl, '_blank');
  };

  const isImageFile = (name: string, url: string) => {
    const n = (name || '').toLowerCase();
    return (
      n.endsWith('.png') ||
      n.endsWith('.jpg') ||
      n.endsWith('.jpeg') ||
      n.endsWith('.webp') ||
      n.endsWith('.gif') ||
      n.endsWith('.svg') ||
      url.startsWith('data:image/')
    );
  };

  const isPdfFile = (name: string, url: string) => {
    const n = (name || '').toLowerCase();
    return n.endsWith('.pdf') || url.startsWith('data:application/pdf');
  };

  const isTextFile = (name: string, url: string) => {
    const n = (name || '').toLowerCase();
    return (
      n.endsWith('.txt') ||
      n.endsWith('.csv') ||
      n.endsWith('.json') ||
      url.startsWith('data:text/')
    );
  };

  const getStatusColor = (val?: string) => {
    switch (val?.toLowerCase()) {
      case 'scheduled':
      case 'pending':
        return 'yellow';
      case 'in progress':
      case 'interested / progressing':
        return 'blue';
      case 'proposal requested':
        return 'indigo';
      case 'demo completed':
        return 'teal';
      case 'requirements gathered':
        return 'cyan';
      case 'under consideration':
        return 'violet';
      case 'completed':
        return 'green';
      case 'rescheduled':
        return 'orange';
      case 'not interested':
      case 'cancelled':
        return 'red';
      default:
        return 'gray';
    }
  };

  // Sync state whenever selected meeting changes
  useEffect(() => {
    if (meeting) {
      const initDate = meeting.meetingDate || meeting.date || '';
      const initTime = meeting.startTime || meeting.meetingTime || meeting.time || '10:00 AM';
      setInitialMeetingDate(initDate);
      setInitialStartTime(initTime);
      setTitle(meeting.title || meeting.meetingTitle || meeting.purpose || '');
      setPurpose(meeting.purpose || meeting.title || '');
      const lName = meeting.leadName || meeting.clientName || '';
      const cName = meeting.companyName && !lName.includes(meeting.companyName) ? ` (${meeting.companyName})` : '';
      setClientName(lName ? `${lName}${cName}` : 'Lead Contact');
      setHostName(meeting.employeeName || meeting.hostName || meeting.assignedTo || 'Kavin');
      const initEndTime = meeting.endTime || '';
      setMeetingDate(initDate);
      setStartTime(initTime);
      setEndTime(initEndTime);
      setNewMeetingDate('');
      setNewMeetingTime('');
      let currentDur = meeting.duration || '30 Minutes';
      if (shouldShowEndTime(meeting.status || meeting.meetingStatus)) {
        if (initEndTime && initTime) {
          const calc = calculateMeetingDurationStr(initTime, initEndTime);
          if (calc) currentDur = calc;
        } else if (initTime && !initEndTime) {
          const computed = calculateEndTime(initTime, currentDur);
          setEndTime(computed);
        }
      }
      setDuration(currentDur);
      setMeetingType(meeting.meetingType?.toLowerCase().includes('in-person') ? 'In-person' : 'Virtual');
      setLocation(meeting.location || meeting.meetingLocation || meeting.meetingLink || '');
      setStatus(meeting.status || meeting.meetingStatus || 'Scheduled');
      setRescheduleReason(meeting.rescheduleReason || '');
      setRescheduleHistory(meeting.rescheduleHistory || []);
      setRequirements(meeting.requirements || '');
      setFileName(meeting.requirementFileName || '');
      setFileUrl(meeting.requirementFileUrl || '');
      setFileSize(meeting.requirementFileSize || '');
    }
  }, [meeting]);

  if (!meeting) return null;

  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    if (shouldShowEndTime(status) && val && endTime) {
      const calcDur = calculateMeetingDurationStr(val, endTime);
      if (calcDur) setDuration(calcDur);
    }
  };

  const handleEndTimeChange = (val: string) => {
    setEndTime(val);
    if (startTime && val) {
      const calcDur = calculateMeetingDurationStr(startTime, val);
      if (calcDur) setDuration(calcDur);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      notifications.show({
        title: 'File Too Large',
        message: 'Please upload a file smaller than 10MB.',
        color: 'red',
      });
      return;
    }

    const sizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setFileName(file.name);
      setFileUrl(dataUrl);
      setFileSize(sizeFormatted);
      notifications.show({
        title: 'File Ready to Save',
        message: `${file.name} (${sizeFormatted}) uploaded. Click "Update" to persist.`,
        color: 'teal',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setFileName('');
    setFileUrl('');
    setFileSize('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!meeting) return;

    // Validate new date and time when status is Rescheduled
    if (status === 'Rescheduled') {
      if (!newMeetingDate || !newMeetingDate.trim()) {
        notifications.show({
          title: 'Validation Error',
          message: 'Please select a new meeting date.',
          color: 'red',
        });
        return;
      }
      if (!newMeetingTime || !newMeetingTime.trim()) {
        notifications.show({
          title: 'Validation Error',
          message: 'Please provide a new meeting time.',
          color: 'red',
        });
        return;
      }
    }

    setSaving(true);
    try {
      const effectiveDate = status === 'Rescheduled' && newMeetingDate ? newMeetingDate.trim() : meetingDate.trim();
      const effectiveTime = status === 'Rescheduled' && newMeetingTime ? newMeetingTime.trim() : startTime.trim();

      // Record in meeting history if status is Rescheduled
      let updatedHistory = [...(rescheduleHistory || [])];
      if (status === 'Rescheduled' && newMeetingDate && newMeetingTime) {
        const isChanged = (newMeetingDate !== initialMeetingDate) || (newMeetingTime !== initialStartTime);
        if (isChanged || initialMeetingDate) {
          const newRecord: RescheduleRecord = {
            previousDate: initialMeetingDate || meetingDate,
            previousTime: initialStartTime || startTime,
            newDate: newMeetingDate.trim(),
            newTime: newMeetingTime.trim(),
            reason: rescheduleReason.trim() || undefined,
            rescheduledAt: new Date().toISOString(),
            rescheduledBy: hostName || 'User',
          };
          const last = updatedHistory[updatedHistory.length - 1];
          if (!last || last.newDate !== newRecord.newDate || last.newTime !== newRecord.newTime || last.reason !== newRecord.reason) {
            updatedHistory.push(newRecord);
          }
        }
      }

      const payload: Partial<ScheduledMeeting> & { rescheduleReason?: string; rescheduleHistory?: RescheduleRecord[] } = {
        title: title.trim(),
        meetingTitle: title.trim(),
        purpose: purpose.trim() || title.trim(),
        meetingDate: effectiveDate,
        date: effectiveDate,
        startTime: effectiveTime,
        time: effectiveTime,
        meetingTime: effectiveTime,
        endTime: shouldShowEndTime(status) && endTime ? endTime.trim() : (meeting.endTime || undefined),
        duration: duration.trim(),
        meetingType: meetingType,
        location: location.trim(),
        meetingLocation: location.trim(),
        meetingLink: location.trim(),
        employeeName: hostName.trim(),
        hostName: hostName.trim(),
        clientName: clientName.trim(),
        status: status as any,
        meetingStatus: status as any,
        meetingOutcome: status,
        outcome: status,
        rescheduleReason: rescheduleReason.trim() || undefined,
        rescheduleHistory: updatedHistory,
        notes: rescheduleReason.trim()
          ? `[Rescheduled from ${initialMeetingDate} ${initialStartTime} to ${effectiveDate} ${effectiveTime}. Reason: ${rescheduleReason.trim()}]${meeting.notes && !meeting.notes.startsWith('[Rescheduled') ? `\n${meeting.notes}` : ''}`
          : meeting.notes,
        requirements: requirements.trim(),
        requirementFileName: fileName.trim() || undefined,
        requirementFileUrl: fileUrl || undefined,
        requirementFileSize: fileSize.trim() || undefined,
      };

      let updated: ScheduledMeeting = {
        ...meeting,
        ...payload,
      } as ScheduledMeeting;

      try {
        const apiRes = await updateMeetingApi(meeting.id, payload);
        if (apiRes) {
          updated = {
            ...updated,
            ...apiRes,
            rescheduleReason: payload.rescheduleReason,
            rescheduleHistory: payload.rescheduleHistory,
          };
        }
      } catch (apiErr) {
        console.warn('Backend update failed, persisting locally:', apiErr);
      }

      notifications.show({
        title: status === 'Rescheduled' ? 'Meeting Rescheduled' : 'Meeting Details Saved',
        message: status === 'Rescheduled'
          ? `Meeting rescheduled to ${effectiveDate} at ${effectiveTime}. Assigned host (${hostName}) and participants notified.`
          : 'Meeting details and requirements updated successfully.',
        color: 'teal',
        icon: <IconCheck size={16} />,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('crm:meeting-updated', { detail: updated }));
        window.dispatchEvent(new CustomEvent('crm_meetings_updated'));
        window.dispatchEvent(new CustomEvent('crm_leads_updated'));
        window.dispatchEvent(new CustomEvent('crm_activities_updated'));
        if (status === 'Rescheduled') {
          window.dispatchEvent(
            new CustomEvent('crm:notification', {
              detail: {
                id: `notif-${Date.now()}`,
                title: 'Meeting Rescheduled',
                message: `Meeting with ${clientName} rescheduled to ${meetingDate} at ${startTime}. Reason: ${rescheduleReason || 'Schedule adjustment'}`,
                type: 'meeting',
                recipient: hostName,
                timestamp: new Date().toISOString(),
              },
            })
          );
        }
      }

      if (onMeetingUpdated && updated) {
        onMeetingUpdated(updated);
      }
      onClose();
    } catch (err: any) {
      notifications.show({
        title: 'Save Failed',
        message: err.message || 'Could not save meeting details.',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const isVirtual = meeting.meetingType?.toLowerCase().includes('virtual') || meeting.location?.startsWith('http');
  const leadName = meeting.leadName || meeting.clientName || 'Lead Client';
  const companyName = meeting.companyName || 'Company / Organization';

  return (
    <>
      <Modal
      opened={opened}
      onClose={onClose}
      size="860px"
      radius="lg"
      centered
      styles={{
        content: {
          maxHeight: '92vh',
        },
        body: {
          maxHeight: 'calc(92vh - 80px)',
          overflowY: 'auto',
          paddingBottom: 24,
        },
      }}
      title={
        <Group gap="xs" align="center">
          <ThemeIcon color="teal" variant="light" size="md" radius="md">
            <IconCalendarEvent size={18} />
          </ThemeIcon>
          <Text fw={700} size="md">
            Meeting Details & Requirements
          </Text>
        </Group>
      }
    >
      <Stack gap="md" mt="xs">
        {/* ========================================================= */}
        {/* SECTION 1: MEETING DETAILS FORM FIELDS                    */}
        {/* ========================================================= */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            label="Meeting Title"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            placeholder="Meeting Title"
            radius="md"
            leftSection={<IconCalendarEvent size={16} />}
          />
          <TextInput
            label="Purpose / Agenda"
            value={purpose}
            onChange={(e) => setPurpose(e.currentTarget.value)}
            placeholder="Purpose / Agenda"
            radius="md"
            leftSection={<IconTarget size={16} />}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            label="Client / Lead Name"
            value={clientName}
            onChange={(e) => setClientName(e.currentTarget.value)}
            placeholder="Client Name"
            radius="md"
            leftSection={<IconUser size={16} />}
          />
          <TextInput
            label="Assigned Host / Employee"
            value={hostName}
            onChange={(e) => setHostName(e.currentTarget.value)}
            placeholder="Host Name"
            radius="md"
            leftSection={<IconUser size={16} />}
          />
        </SimpleGrid>

        {status !== 'Rescheduled' ? (
          shouldShowEndTime(status) ? (
            <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="sm">
              <MeetingDatePicker
                label="Meeting Date"
                value={meetingDate}
                onChange={(val) => setMeetingDate(val)}
                placeholder="dd-mm-yyyy"
                zIndex={3000}
              />
              <MeetingTimePicker
                label="Meeting Time"
                value={startTime}
                onChange={handleStartTimeChange}
                placeholder="hh:mm A"
                zIndex={3000}
              />
              <MeetingTimePicker
                label="Meeting End Time"
                value={endTime}
                onChange={handleEndTimeChange}
                placeholder="hh:mm A"
                zIndex={3000}
              />
              <TextInput
                label="Duration"
                value={duration}
                onChange={(e) => setDuration(e.currentTarget.value)}
                placeholder="Auto-calculated (e.g. 45 Minutes)"
                radius="md"
                leftSection={<IconClock size={16} />}
              />
            </SimpleGrid>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              <MeetingDatePicker
                label="Meeting Date"
                value={meetingDate}
                onChange={(val) => setMeetingDate(val)}
                placeholder="dd-mm-yyyy"
                zIndex={3000}
              />
              <MeetingTimePicker
                label="Meeting Time"
                value={startTime}
                onChange={handleStartTimeChange}
                placeholder="hh:mm A"
                zIndex={3000}
              />
              <Select
                label="Duration"
                value={duration}
                onChange={(val) => setDuration(val || '30 Minutes')}
                data={['15 Minutes', '30 Minutes', '45 Minutes', '1 Hour', '1.5 Hours', '2 Hours']}
                radius="md"
              />
            </SimpleGrid>
          )
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Select
              label="Duration"
              value={duration}
              onChange={(val) => setDuration(val || '30 Minutes')}
              data={['15 Minutes', '30 Minutes', '45 Minutes', '1 Hour', '1.5 Hours', '2 Hours']}
              radius="md"
            />
            <Select
              label="Meeting Type"
              value={meetingType}
              onChange={(val) => setMeetingType(val || 'Virtual')}
              data={[
                { value: 'Virtual', label: 'Virtual (Google Meet / Zoom)' },
                { value: 'In-person', label: 'In-person' },
              ]}
              radius="md"
            />
          </SimpleGrid>
        )}

        {status !== 'Rescheduled' ? (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Select
              label="Meeting Type"
              value={meetingType}
              onChange={(val) => setMeetingType(val || 'Virtual')}
              data={[
                { value: 'Virtual', label: 'Virtual (Google Meet / Zoom)' },
                { value: 'In-person', label: 'In-person' },
              ]}
              radius="md"
            />
            <TextInput
              label={meetingType?.toLowerCase().includes('in-person') ? 'Meeting Location / Venue' : 'Meeting Link (URL)'}
              value={location}
              onChange={(e) => setLocation(e.currentTarget.value)}
              placeholder={
                meetingType?.toLowerCase().includes('in-person')
                  ? 'Client Office Address or Office Room'
                  : 'https://meet.google.com/xyz or Zoom URL'
              }
              radius="md"
              leftSection={<IconMapPin size={16} />}
              rightSection={
                location && location.startsWith('http') ? (
                  <Tooltip label="Open Meeting Link">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="blue"
                      component="a"
                      href={location}
                      target="_blank"
                    >
                      <IconExternalLink size={14} />
                    </ActionIcon>
                  </Tooltip>
                ) : null
              }
            />
          </SimpleGrid>
        ) : (
          <TextInput
            label={meetingType?.toLowerCase().includes('in-person') ? 'Meeting Location / Venue' : 'Meeting Link (URL)'}
            value={location}
            onChange={(e) => setLocation(e.currentTarget.value)}
            placeholder={
              meetingType?.toLowerCase().includes('in-person')
                ? 'Client Office Address or Office Room'
                : 'https://meet.google.com/xyz or Zoom URL'
            }
            radius="md"
            leftSection={<IconMapPin size={16} />}
            rightSection={
              location && location.startsWith('http') ? (
                <Tooltip label="Open Meeting Link">
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="blue"
                    component="a"
                    href={location}
                    target="_blank"
                  >
                    <IconExternalLink size={14} />
                  </ActionIcon>
                </Tooltip>
              ) : null
            }
          />
        )}

        {/* ========================================================= */}
        {/* SECTION 2: MEETING STATUS UPDATE FIELD                   */}
        {/* ========================================================= */}
        <Box>
          <Group justify="space-between" align="center" mb={6}>
            <Text fw={700} size="sm" style={{ color: isDark ? '#F1F5F9' : '#1E293B' }}>
              Meeting Status *
            </Text>
            <Badge
              variant="light"
              color={getStatusColor(status)}
              size="sm"
              radius="sm"
            >
              Current: {status}
            </Badge>
          </Group>
          <Select
            placeholder="Select Status"
            value={status}
            onChange={(val) => {
              const next = val || 'Scheduled';
              setStatus(next);
              if (next === 'Rescheduled') {
                setNewMeetingDate('');
                setNewMeetingTime('');
              }
              if (shouldShowEndTime(next)) {
                if (!endTime && startTime) {
                  const computedEnd = calculateEndTime(startTime, duration || '30 Minutes');
                  setEndTime(computedEnd);
                  const calc = calculateMeetingDurationStr(startTime, computedEnd);
                  if (calc) setDuration(calc);
                } else if (endTime && startTime) {
                  const calc = calculateMeetingDurationStr(startTime, endTime);
                  if (calc) setDuration(calc);
                }
              }
            }}
            allowDeselect={false}
            data={[
              { value: 'Scheduled', label: 'Scheduled' },
              { value: 'Interested / Progressing', label: 'Interested / Progressing' },
              { value: 'Proposal Requested', label: 'Proposal Requested' },
              { value: 'Demo Completed', label: 'Demo Completed' },
              { value: 'Requirements Gathered', label: 'Requirements Gathered' },
              { value: 'Under Consideration', label: 'Under Consideration' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Rescheduled', label: 'Rescheduled' },
              { value: 'Not Interested', label: 'Not Interested' },
              { value: 'Cancelled', label: 'Cancelled' },
            ]}
            styles={{
              input: {
                borderRadius: 10,
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderColor: isDark ? '#334155' : '#D1D5DB',
                fontSize: 13,
                fontWeight: 600,
                color: isDark ? '#F8FAFC' : '#0F172A',
              },
            }}
          />
        </Box>

        {/* ========================================================= */}
        {/* RESCHEDULE DETAILS SECTION (Visible when Rescheduled)    */}
        {/* ========================================================= */}
        {status === 'Rescheduled' && (
          <Paper
            p="md"
            radius="md"
            style={{
              backgroundColor: isDark ? 'rgba(249, 115, 22, 0.08)' : '#FFFBF5',
              border: isDark ? '1px solid rgba(249, 115, 22, 0.4)' : '1px solid #FED7AA',
            }}
          >
            <Stack gap="sm">
              <Group justify="space-between" align="center" wrap="wrap">
                <Group gap="xs">
                  <ThemeIcon color="orange" variant="light" size="sm" radius="md">
                    <IconClock size={16} />
                  </ThemeIcon>
                  <Text fw={700} size="sm" style={{ color: isDark ? '#FB923C' : '#C2410C' }}>
                    Reschedule Details
                  </Text>
                </Group>
                {(initialMeetingDate || initialStartTime) && (
                  <Badge variant="outline" color="orange" size="sm" radius="sm">
                    Previous Schedule: {initialMeetingDate || 'Not set'} • {initialStartTime || 'Not set'}
                  </Badge>
                )}
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <MeetingDatePicker
                  label="New Meeting Date"
                  required
                  value={newMeetingDate}
                  onChange={(val) => setNewMeetingDate(val)}
                  placeholder="dd-mm-yyyy"
                  zIndex={3000}
                />
                <MeetingTimePicker
                  label="New Meeting Time"
                  required
                  value={newMeetingTime}
                  onChange={(val) => setNewMeetingTime(val)}
                  placeholder="hh:mm"
                  zIndex={3000}
                />
              </SimpleGrid>

              <Textarea
                label="Reschedule Reason (Optional)"
                placeholder="e.g. Client requested time change due to urgent internal review / conflict..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.currentTarget.value)}
                minRows={2}
                maxRows={4}
                autosize
                radius="md"
              />

              {/* Previous Reschedule History */}
              {rescheduleHistory && rescheduleHistory.length > 0 && (
                <Box mt={4}>
                  <Group gap={6} mb={6} align="center">
                    <IconHistory size={14} color="#EA580C" />
                    <Text size="xs" fw={700} c="dimmed">
                      Reschedule History ({rescheduleHistory.length})
                    </Text>
                  </Group>
                  <Stack gap={6}>
                    {rescheduleHistory.map((item, idx) => (
                      <Paper
                        key={idx}
                        p="xs"
                        radius="sm"
                        style={{
                          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                          border: isDark ? '1px solid #334155' : '1px solid #E2E8F0',
                          fontSize: 12,
                        }}
                      >
                        <Group justify="space-between" align="center" wrap="nowrap">
                          <Group gap="xs" wrap="nowrap">
                            <IconCalendarEvent size={13} color="#EA580C" />
                            <Text size="xs" fw={600}>
                              {item.previousDate} {item.previousTime} ➔ {item.newDate} {item.newTime}
                            </Text>
                          </Group>
                          <Text size="11px" c="dimmed">
                            {item.rescheduledAt ? new Date(item.rescheduledAt).toLocaleDateString() : ''}
                          </Text>
                        </Group>
                        {item.reason && (
                          <Text size="xs" c="dimmed" mt={2} style={{ fontStyle: 'italic' }}>
                            Reason: {item.reason}
                          </Text>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Paper>
        )}

        {/* ========================================================= */}
        {/* SECTION 3: REQUIREMENT ENTRY FIELD                        */}
        {/* ========================================================= */}
        <Box>
          <Text fw={700} size="sm" mb={6} style={{ color: isDark ? '#F1F5F9' : '#1E293B' }}>
            Client Requirements / Scope of Work *
          </Text>
          <Textarea
            placeholder="e.g. Client needs custom CRM with WhatsApp integration, Lead pipeline, Role-based permissions, and Mobile App for 25 sales reps..."
            value={requirements}
            onChange={(e) => setRequirements(e.currentTarget.value)}
            minRows={4}
            maxRows={8}
            autosize
            styles={{
              input: {
                borderRadius: 10,
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderColor: isDark ? '#334155' : '#D1D5DB',
                fontSize: 13,
              },
            }}
          />
        </Box>

        {/* ========================================================= */}
        {/* SECTION 3: REQUIREMENT FILE UPLOAD FIELD                  */}
        {/* ========================================================= */}
        <Box>
          <Text fw={700} size="sm" mb={4} style={{ color: isDark ? '#F1F5F9' : '#1E293B' }}>
            Requirement Document / Attachment
          </Text>
          <Text size="xs" c="dimmed" mb={8}>
            Upload requirement specification (PDF, Word DOCX, text file, wireframes, or images).
          </Text>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
          />

          {fileName && fileUrl ? (
            /* Uploaded File Preview Card */
            <Paper
              p="sm"
              radius="md"
              style={{
                background: isDark ? '#064E3B' : '#ECFDF5',
                border: isDark ? '1px solid #059669' : '1px solid #A7F3D0',
              }}
            >
              <Group justify="space-between" align="center" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ overflow: 'hidden' }}>
                  <ThemeIcon color="teal" variant="light" size="lg" radius="md">
                    <IconFileDescription size={20} />
                  </ThemeIcon>
                  <div style={{ overflow: 'hidden' }}>
                    <Text fw={600} size="sm" truncate style={{ color: isDark ? '#ECFDF5' : '#065F46' }}>
                      {fileName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {fileSize || 'Attached'} • Ready to view
                    </Text>
                  </div>
                </Group>

                <Group gap="xs" wrap="nowrap">
                  {/* View Document Button */}
                  <Button
                    size="xs"
                    variant="filled"
                    color="teal"
                    radius="md"
                    leftSection={<IconEye size={14} />}
                    onClick={() => setPreviewModalOpen(true)}
                  >
                    View Document
                  </Button>

                  {/* Open in New Window */}
                  <Tooltip label="Open in New Tab" withArrow>
                    <ActionIcon
                      variant="light"
                      color="teal"
                      radius="md"
                      onClick={handleOpenInNewWindow}
                    >
                      <IconExternalLink size={16} />
                    </ActionIcon>
                  </Tooltip>

                  {/* Download / Save File */}
                  <Tooltip label="Download File" withArrow>
                    <ActionIcon
                      variant="light"
                      color="teal"
                      radius="md"
                      component="a"
                      href={fileUrl}
                      download={fileName}
                    >
                      <IconDownload size={16} />
                    </ActionIcon>
                  </Tooltip>

                  {/* Remove File */}
                  <Tooltip label="Remove Attachment" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      radius="md"
                      onClick={handleRemoveFile}
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            </Paper>
          ) : (
            /* Dropzone / Upload Trigger Button */
            <Paper
              p="lg"
              radius="md"
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: isDark ? '2px dashed #475569' : '2px dashed #CBD5E1',
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <Stack align="center" gap={6}>
                <ThemeIcon size="lg" radius="xl" variant="light" color="blue">
                  <IconUpload size={20} />
                </ThemeIcon>
                <Text size="sm" fw={600} style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                  Click to upload Requirement File
                </Text>
                <Text size="xs" c="dimmed">
                  Supports PDF, Word DOCX, TXT, Excel or Images (Max: 10MB)
                </Text>
              </Stack>
            </Paper>
          )}
        </Box>

        {/* ========================================================= */}
        {/* FOOTER ACTION BUTTONS                                     */}
        {/* ========================================================= */}
        <Group justify="space-between" mt="md">
          {onNavigateToLead ? (
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconTarget size={14} />}
              onClick={() => {
                onClose();
                onNavigateToLead(meeting);
              }}
            >
              Go to Lead Activity Pipeline
            </Button>
          ) : (
            <div />
          )}

          <Group gap="sm">
            <Button variant="default" radius="md" onClick={onClose} disabled={saving}>
              Close
            </Button>

            <Button
              radius="md"
              loading={saving}
              onClick={handleSave}
              leftSection={<IconCheck size={16} />}
              style={{
                background: isDark ? '#22c55e' : '#0F172A',
                color: '#FFFFFF',
                fontWeight: 600,
                minWidth: 100,
              }}
            >
              {status === 'Rescheduled' ? 'Update Meeting' : 'Update'}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>

    {/* ========================================================= */}
    {/* DOCUMENT PREVIEW MODAL                                   */}
    {/* ========================================================= */}
    <Modal
      opened={previewModalOpen}
      onClose={() => setPreviewModalOpen(false)}
      size="85%"
      radius="lg"
      centered
      zIndex={1200}
      title={
        <Group justify="space-between" align="center" style={{ width: '100%' }} pr="md">
          <Group gap="xs" align="center" style={{ overflow: 'hidden' }}>
            <ThemeIcon color="teal" variant="light" size="md" radius="md">
              <IconFileDescription size={18} />
            </ThemeIcon>
            <div>
              <Text fw={700} size="sm" truncate style={{ maxWidth: 450 }}>
                {fileName || 'Document Preview'}
              </Text>
              <Text size="xs" c="dimmed">
                {fileSize || 'Requirement Document'}
              </Text>
            </div>
          </Group>

          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              color="blue"
              leftSection={<IconExternalLink size={14} />}
              onClick={handleOpenInNewWindow}
            >
              Open in New Tab
            </Button>
            <Button
              size="xs"
              variant="light"
              color="teal"
              component="a"
              href={fileUrl}
              download={fileName}
              leftSection={<IconDownload size={14} />}
            >
              Download
            </Button>
          </Group>
        </Group>
      }
      styles={{
        content: {
          maxHeight: '92vh',
        },
        body: {
          padding: 16,
          maxHeight: 'calc(92vh - 80px)',
          overflowY: 'auto',
        },
      }}
    >
      {isImageFile(fileName, fileUrl) ? (
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            borderRadius: 8,
            padding: 16,
            minHeight: '400px',
          }}
        >
          <img
            src={fileUrl}
            alt={fileName}
            style={{
              maxWidth: '100%',
              maxHeight: '70vh',
              borderRadius: 8,
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              objectFit: 'contain',
            }}
          />
        </Box>
      ) : isPdfFile(fileName, fileUrl) || isTextFile(fileName, fileUrl) ? (
        <Box
          style={{
            width: '100%',
            height: '75vh',
            borderRadius: 8,
            overflow: 'hidden',
            border: isDark ? '1px solid #334155' : '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
          }}
        >
          <iframe
            src={getSafeBlobUrl(fileUrl)}
            title={fileName}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
        </Box>
      ) : (
        <Paper
          p="xl"
          radius="md"
          style={{
            textAlign: 'center',
            background: isDark ? '#1E293B' : '#F8FAFC',
            border: isDark ? '1px solid #334155' : '1px solid #E2E8F0',
          }}
        >
          <ThemeIcon size={56} radius="xl" color="blue" variant="light" mx="auto" mb="md">
            <IconFileDescription size={32} />
          </ThemeIcon>
          <Text fw={700} size="md">
            {fileName}
          </Text>
          <Text size="sm" c="dimmed" mt={4} mb="lg">
            {fileSize || 'Attached'} • Direct in-browser preview is not supported for Word/Excel files. You can open in a new tab or download to view with your local application.
          </Text>
          <Group justify="center" gap="sm">
            <Button
              component="a"
              href={fileUrl}
              download={fileName}
              leftSection={<IconDownload size={16} />}
              color="teal"
              radius="md"
            >
              Download Document
            </Button>
            <Button
              variant="default"
              leftSection={<IconExternalLink size={16} />}
              onClick={handleOpenInNewWindow}
              radius="md"
            >
              Open in New Tab
            </Button>
          </Group>
        </Paper>
      )}
    </Modal>
  </>
  );
};
