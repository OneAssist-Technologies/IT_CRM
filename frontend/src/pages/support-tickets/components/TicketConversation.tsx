import React, { useState } from 'react';
import {
  Paper,
  Tabs,
  Stack,
  Group,
  Text,
  Avatar,
  Badge,
  Textarea,
  Button,
  Box,
  Divider,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconSend,
  IconLock,
  IconMessageCircle,
  IconPaperclip,
} from '@tabler/icons-react';
import { TicketComment } from '../../../types/supportTicket';
import { useSupportTicket } from '../../../context/SupportTicketContext';

interface TicketConversationProps {
  ticketId: string;
  comments: TicketComment[];
}

export const TicketConversation: React.FC<TicketConversationProps> = ({
  ticketId,
  comments,
}) => {
  const { addComment } = useSupportTicket();
  const computedColorScheme = useComputedColorScheme('light');
  const isDark = computedColorScheme === 'dark';

  const [activeTab, setActiveTab] = useState<string | null>('public_reply');
  const [message, setMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const type = activeTab === 'internal_note' ? 'internal_note' : 'public_reply';
      await addComment(ticketId, {
        type,
        message: message.trim(),
      });
      setMessage('');
    } catch {
      // handled in context
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return timeStr;
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
          <Text fw={700} size="md">
            Ticket Conversation & Notes
          </Text>
          <Badge variant="light" color="gray" size="sm">
            {comments.length} message{comments.length === 1 ? '' : 's'}
          </Badge>
        </Group>

        {/* Message Thread Feed */}
        <Box style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
          {comments.length === 0 ? (
            <Box py="xl" style={{ textAlign: 'center' }}>
              <Text size="sm" c="dimmed">
                No messages yet. Send a public reply or record an internal note below.
              </Text>
            </Box>
          ) : (
            <Stack gap="sm">
              {comments.map((c) => {
                const isInternal = c.type === 'internal_note';
                return (
                  <Paper
                    key={c.id}
                    p="sm"
                    radius="md"
                    withBorder
                    style={{
                      background: isInternal
                        ? isDark
                          ? 'rgba(234, 88, 12, 0.12)'
                          : '#FFFBEB'
                        : isDark
                        ? 'rgba(30, 41, 59, 0.6)'
                        : '#F8FAFC',
                      borderColor: isInternal
                        ? isDark
                          ? 'rgba(234, 88, 12, 0.3)'
                          : '#FDE68A'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.06)'
                        : '#E2E8F0',
                    }}
                  >
                    <Group justify="space-between" align="flex-start" mb={6}>
                      <Group gap="xs">
                        <Avatar size={24} radius="xl" color={isInternal ? 'orange' : 'blue'}>
                          {c.authorName ? c.authorName.charAt(0) : 'U'}
                        </Avatar>
                        <Text fw={600} size="xs">
                          {c.authorName}
                        </Text>
                        <Badge
                          size="xs"
                          variant="filled"
                          color={isInternal ? 'orange' : 'blue'}
                          leftSection={isInternal ? <IconLock size={10} /> : <IconMessageCircle size={10} />}
                        >
                          {isInternal ? 'Internal Note' : 'Public Reply'}
                        </Badge>
                      </Group>
                      <Text size="10px" c="dimmed">
                        {formatTime(c.createdAt)}
                      </Text>
                    </Group>

                    <Text size="xs" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {c.message}
                    </Text>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Box>

        <Divider />

        {/* Message Composer */}
        <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="md">
          <Tabs.List mb="xs">
            <Tabs.Tab value="public_reply" leftSection={<IconMessageCircle size={14} />}>
              Public Reply
            </Tabs.Tab>
            <Tabs.Tab value="internal_note" color="orange" leftSection={<IconLock size={14} />}>
              Internal Note
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="public_reply">
            <Text size="11px" c="dimmed" mb={6}>
              Visible to the client, customer contacts, and authorized support personnel.
            </Text>
          </Tabs.Panel>
          <Tabs.Panel value="internal_note">
            <Text size="11px" c="orange" fw={600} mb={6}>
              🔒 Visible ONLY to internal IT CRM employees. Strictly hidden from external customers.
            </Text>
          </Tabs.Panel>
        </Tabs>

        <Textarea
          placeholder={
            activeTab === 'internal_note'
              ? 'Type an internal technical note, investigation progress, or handover remark...'
              : 'Type a message to the customer...'
          }
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
        />

        <Group justify="flex-end">
          <Button
            size="sm"
            color={activeTab === 'internal_note' ? 'orange' : 'blue'}
            leftSection={<IconSend size={15} />}
            loading={sending}
            onClick={handleSend}
            disabled={!message.trim()}
          >
            {activeTab === 'internal_note' ? 'Add Internal Note' : 'Send Public Reply'}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
};

export default TicketConversation;

