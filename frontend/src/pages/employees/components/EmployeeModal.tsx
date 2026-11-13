import { MeetingDatePicker } from '../../meetings/components/MeetingDatePicker';
import React, { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Select,
  NumberInput,
  Textarea,
  Button,
  Group,
  SimpleGrid,
  TagsInput,
  Stack,
  Text,
} from '@mantine/core';
import { IconUserPlus, IconEdit, IconCheck } from '@tabler/icons-react';
import { Employee, EmployeeStatus, EmploymentType, UserRole } from '../../../types/employee';
import { CRM_COLORS } from '../../../theme/colors';

interface EmployeeModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Employee>) => Promise<boolean>;
  editingEmployee?: Employee | null;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  opened,
  onClose,
  onSubmit,
  editingEmployee,
}) => {
  const isEditing = Boolean(editingEmployee);

  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    email: '',
    phone: '',
    designation: '',
    department: 'Software Engineering',
    role: 'DEVELOPER',
    employmentType: 'FULL_TIME',
    status: 'ACTIVE',
    workLocation: 'Chennai HQ',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: 85000,
    currency: 'USD',
    skills: ['React', 'TypeScript', 'Node.js'],
    experienceYears: 3.5,
    reportingManager: '',
    currentProject: '',
    rating: 4.8,
    github: '',
    linkedin: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingEmployee) {
      setFormData({
        name: editingEmployee.name,
        email: editingEmployee.email,
        phone: editingEmployee.phone || '',
        designation: editingEmployee.designation,
        department: editingEmployee.department,
        role: editingEmployee.role,
        employmentType: editingEmployee.employmentType,
        status: editingEmployee.status,
        workLocation: editingEmployee.workLocation,
        joiningDate: editingEmployee.joiningDate,
        salary: editingEmployee.salary,
        currency: editingEmployee.currency,
        skills: editingEmployee.skills || [],
        experienceYears: editingEmployee.experienceYears,
        reportingManager: editingEmployee.reportingManager || '',
        currentProject: editingEmployee.currentProject || '',
        rating: editingEmployee.rating || 4.8,
        github: editingEmployee.github || '',
        linkedin: editingEmployee.linkedin || '',
        notes: editingEmployee.notes || '',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        designation: '',
        department: 'Software Engineering',
        role: 'DEVELOPER',
        employmentType: 'FULL_TIME',
        status: 'ACTIVE',
        workLocation: 'Chennai HQ',
        joiningDate: new Date().toISOString().split('T')[0],
        salary: 85000,
        currency: 'USD',
        skills: ['React', 'TypeScript', 'Node.js'],
        experienceYears: 3.5,
        reportingManager: '',
        currentProject: '',
        rating: 4.8,
        github: '',
        linkedin: '',
        notes: '',
      });
    }
  }, [editingEmployee, opened]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.designation) return;

    setLoading(true);
    const success = await onSubmit(formData);
    setLoading(false);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          {isEditing ? <IconEdit size={22} color={CRM_COLORS.primary} /> : <IconUserPlus size={22} color={CRM_COLORS.primary} />}
          <Text fw={800} size="lg" style={{ color: CRM_COLORS.textPrimary }}>
            {isEditing ? `Edit Employee (${editingEmployee?.empCode})` : 'Add New Employee'}
          </Text>
        </Group>
      }
      size="lg"
      radius="28px"
      padding="xl"
      styles={{
        content: {
          background: CRM_COLORS.cardBg,
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {/* Section 1: Basic Identity */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="Full Name"
              placeholder="e.g. Santhosh C"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              radius="14px"
              styles={{
                input: { background: CRM_COLORS.backgroundLight },
              }}
            />

            <TextInput
              label="Email"
              placeholder="e.g. santhosh@company.com"
              required
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              radius="14px"
              styles={{
                input: { background: CRM_COLORS.backgroundLight },
              }}
            />

            <TextInput
              label="Phone Number"
              placeholder="+91 98765 43210"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              radius="14px"
              styles={{
                input: { background: CRM_COLORS.backgroundLight },
              }}
            />

            <TextInput
              label="Primary Work Location"
              placeholder="e.g. Chennai HQ / Bangalore / Remote"
              value={formData.workLocation || ''}
              onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
              radius="14px"
              styles={{
                input: { background: CRM_COLORS.backgroundLight },
              }}
            />
          </SimpleGrid>

          {/* Section 2: Role & Department */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="Job Designation"
              placeholder="e.g. Principal Cloud Architect"
              required
              value={formData.designation || ''}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              radius="14px"
              styles={{
                input: { background: CRM_COLORS.backgroundLight },
              }}
            />

            <Select
              label="Department"
              value={formData.department || 'Software Engineering'}
              onChange={(val) => setFormData({ ...formData, department: val || 'Software Engineering' })}
              radius="14px"
              data={[
                'Software Engineering',
                'AI & Machine Learning',
                'Cloud & DevOps Architecture',
                'Mobile App Engineering',
                'UI/UX Product Design',
                'Quality Assurance & Testing',
                'Executive Leadership',
              ]}
              styles={{
                input: { background: CRM_COLORS.backgroundLight },
              }}
            />

            <Select
              label="System Role"
              value={formData.role || 'Employee'}
              onChange={(val) => setFormData({ ...formData, role: (val as UserRole) || 'Employee' })}
              radius="14px"
              data={[
                { value: 'SUPER_ADMIN', label: 'Super Admin / CEO' },
                { value: 'Employee', label: 'Employee' },
                { value: 'PROJECT_MANAGER', label: 'Project / Delivery Manager' },
                { value: 'TECH_LEAD', label: 'Technical Lead' },
                { value: 'DEVELOPER', label: 'Software Engineer' },
              ]}
              styles={{
                input: { background: CRM_COLORS.backgroundLight },
              }}
            />

            <Select
              label="Employment Type"
              value={formData.employmentType || 'FULL_TIME'}
              onChange={(val) => setFormData({ ...formData, employmentType: (val as EmploymentType) || 'FULL_TIME' })}
              radius="14px"
              data={[
                { value: 'FULL_TIME', label: 'Full-Time (Direct)' },
                { value: 'CONTRACT', label: 'Contract Staff' },
                { value: 'PART_TIME', label: 'Part-Time' },
                { value: 'INTERN', label: 'Graduate Intern' },
              ]}
              styles={{
                input: { background: CRM_COLORS.backgroundLight },
              }}
            />

            <Select
              label="Initial Status"
              value={formData.status || 'ACTIVE'}
              onChange={(val) => setFormData({ ...formData, status: (val as EmployeeStatus) || 'ACTIVE' })}
              radius="14px"
              data={[
                { value: 'ACTIVE', label: 'Active 🟢' },
                { value: 'PROBATION', label: 'Probation ⏳' },
                { value: 'ON_LEAVE', label: 'On Leave 🏖️' },
                { value: 'NOTICE_PERIOD', label: 'Notice Period ⚠️' },
              ]}
              styles={{
                input: { background: CRM_COLORS.backgroundLight },
              }}
            />

            <MeetingDatePicker
              label="Joining Date"
              placeholder="DD-MM-YYYY"
              value={formData.joiningDate || ''}
              onChange={(val: string) => setFormData({ ...formData, joiningDate: val })}
              zIndex={3000}
            />
          </SimpleGrid>

          {/* Section 3: Project & Performance */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <NumberInput
              label="Years Experience"
              step={0.5}
              min={0}
              max={40}
              value={formData.experienceYears || 3.0}
              onChange={(val) => setFormData({ ...formData, experienceYears: Number(val) || 0 })}
              radius="14px"
              styles={{
                input: { background: CRM_COLORS.backgroundLight },
              }}
            />

            <NumberInput
              label="Performance Rating (1-5)"
              step={0.1}
              min={1.0}
              max={5.0}
              value={formData.rating || 4.8}
              onChange={(val) => setFormData({ ...formData, rating: Number(val) || 4.8 })}
              radius="14px"
              styles={{
                input: { background: CRM_COLORS.backgroundLight },
              }}
            />

            <TextInput
              label="Current Client Project"
              placeholder="e.g. FinTech Cloud Core"
              value={formData.currentProject || ''}
              onChange={(e) => setFormData({ ...formData, currentProject: e.target.value })}
              radius="14px"
              styles={{
                input: { background: CRM_COLORS.backgroundLight },
              }}
            />
          </SimpleGrid>

          {/* Section 4: Skills Matrix & Socials */}
          <TagsInput
            label="Technical Skills & Competencies"
            placeholder="Type skill & press Enter (e.g. React, Docker, Python)"
            value={formData.skills || []}
            onChange={(val) => setFormData({ ...formData, skills: val })}
            radius="14px"
            styles={{
              input: { background: CRM_COLORS.backgroundLight },
            }}
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="GitHub Username"
              placeholder="e.g. vikramsundaram"
              value={formData.github || ''}
              onChange={(e) => setFormData({ ...formData, github: e.target.value })}
              radius="14px"
              styles={{
                input: { background: CRM_COLORS.backgroundLight },
              }}
            />

            <TextInput
              label="LinkedIn Handle"
              placeholder="e.g. vikram-sundaram"
              value={formData.linkedin || ''}
              onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
              radius="14px"
              styles={{
                input: { background: CRM_COLORS.backgroundLight },
              }}
            />
          </SimpleGrid>

          <Textarea
            label="Internal Performance Notes"
            placeholder="Key strengths, certifications, client praise, or career development notes..."
            rows={2}
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            radius="14px"
            styles={{
              input: { background: CRM_COLORS.backgroundLight },
            }}
          />

          {/* Modal Actions */}
          <Group justify="flex-end" gap="sm" mt="md">
            <Button variant="subtle" color="gray" radius="100px" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              radius="100px"
              leftSection={<IconCheck size={16} />}
              style={{
                background: CRM_COLORS.primary,
                color: CRM_COLORS.textOnPrimary,
                fontWeight: 700,
                padding: '0 24px',
              }}
            >
              {isEditing ? 'Save Changes' : 'Add Employee'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
