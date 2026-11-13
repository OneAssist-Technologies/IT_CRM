import React from 'react';
import {
  Paper,
  Timeline,
  Text,
  Badge,
  Stack,
  Group,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconHistory,
  IconCheck,
  IconArrowRight,
  IconUserCheck,
  IconMessageCircle,
  IconClock,
} from '@tabler/icons-react';
import { TicketHistory } from '../../../types/supportTicket';

interface TicketHistoryTimelineProps {
  history: TicketHistory[];
}

export const TicketHistoryTimeline: React.FC<TicketHistoryTimelineProps> = ({ history }) => {
  const computedColorScheme = useComputedColorScheme('light');
  const isDark = computedColorScheme === 'dark';

  const formatTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return timeStr;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATED':
        return <IconCheck size={14} />;
      case 'STATUS_CHANGED':
        return <IconClock size={14} />;
      case 'REASSIGNED':
        return <IconUserCheck size={14} />;
      case 'COMMENTED':
        return <IconMessageCircle size={14} />;
      default:
        return <IconHistory size={14} />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATED':
        return 'teal';
      case 'STATUS_CHANGED':
        return 'blue';
      case 'REASSIGNED':
        return 'indigo';
      case 'COMMENTED':
        return 'cyan';
      default:
        return 'gray';
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
            <IconHistory size={18} color="#64748B" />
            <Text fw={700} size="md">
              Audit & Activity History
            </Text>
          </Group>
          <Badge variant="light" color="gray" size="sm">
            {history.length} event{history.length === 1 ? '' : 's'}
          </Badge>
        </Group>

        {history.length === 0 ? (
          <Text size="xs" c="dimmed">
            No history entries recorded yet.
          </Text>
        ) : (
          <Timeline active={history.length} bulletSize={22} lineWidth={2}>
            {history.map((item) => (
              <Timeline.Item
                key={item.id}
                bullet={getActionIcon(item.action)}
                color={getActionColor(item.action)}
                title={
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Text size="xs" fw={700}>
                      {item.action.replace('_', ' ')}
                    </Text>
                    <Text size="10px" c="dimmed">
                      {formatTime(item.createdAt)}
                    </Text>
                  </Group>
                }
              >
                {item.oldValue && item.newValue ? (
                  <Group gap={6} my={2}>
                    <Badge size="xs" color="gray" variant="light">
                      {item.oldValue}
                    </Badge>
                    <IconArrowRight size={12} color="#94A3B8" />
                    <Badge size="xs" color="blue" variant="filled">
                      {item.newValue}
                    </Badge>
                  </Group>
                ) : null}

                {item.reason && (
                  <Text size="11px" c="dimmed" mt={2}>
                    {item.reason}
                  </Text>
                )}

                <Text size="10px" fw={600} c="dimmed" mt={4}>
                  By: {item.performedBy}
                </Text>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Stack>
    </Paper>
  );
};

export default TicketHistoryTimeline;

