import { MeetingDatePicker } from '../meetings/components/MeetingDatePicker';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Text,
  TextInput,
  PasswordInput,
  Autocomplete,
  Textarea,
  Button,
  UnstyledButton,
  Group,
  SimpleGrid,
  Stack,
  Badge,
  Divider,
  ThemeIcon,
  Progress,
  Tooltip,
  Select,
  Switch,
  Modal,
  ActionIcon,
  Avatar,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconUserPlus,
  IconCheck,
  IconMail,
  IconPhone,
  IconUser,
  IconLock,
  IconTrash,
  IconBuilding,
  IconBriefcase,
  IconShield,
  IconMapPin,
  IconCalendar,
  IconUsers,
  IconActivity,
  IconClock,
  IconHome,
  IconGenderBigender,
  IconPlus,
  IconCamera,
} from '@tabler/icons-react';
import { useEmployee } from '../../context/EmployeeContext';
import { useAccessControl } from '../../context/AccessControlContext';
import { Employee } from '../../types/employee';
import { CRM_COLORS } from '../../theme/colors';

export interface AddEmployeePageProps {
  onBack: () => void;
  initialData?: Employee | null;
}

export const AddEmployeePage: React.FC<AddEmployeePageProps> = ({
  onBack,
  initialData,
}) => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';

  const normalInputStyles = {
    label: {
      fontWeight: 600,
      fontSize: '13px',
      marginBottom: '6px',
      color: isDark ? '#E2E8F0' : '#1E293B',
    },
    input: {
      borderRadius: '8px',
      fontSize: '14px',
      height: '42px',
      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
      border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(15, 23, 42, 0.1)',
      color: isDark ? '#F8FAFC' : '#0F172A',
    },
    error: {
      fontSize: '12px',
      marginTop: '4px',
      fontWeight: 500,
    },
  };

  const { employees, fetchEmployees, addEmployee, updateEmployee } = useEmployee();
  const { roles, users, fetchRoles, fetchUsers } = useAccessControl();
  const isEditing = Boolean(
    initialData &&
    initialData.id &&
    (!employees.length || employees.some((e) => e.id === initialData.id))
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRoles();
    fetchUsers();
    fetchEmployees();
  }, [fetchRoles, fetchUsers, fetchEmployees]);

  useEffect(() => {
    if (initialData?.id && employees.length > 0 && !employees.some((e) => e.id === initialData.id)) {
      if (typeof window !== 'undefined') sessionStorage.removeItem('crm_editing_employee');
    }
  }, [initialData, employees]);

  // Helper to load and save custom items from localStorage
  const loadCustomItems = (key: string): string[] => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed.filter((b) => typeof b === 'string' && b.trim());
        }
      } catch (_) {}
    }
    return [];
  };

  const saveCustomItems = (key: string, items: string[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(items));
      } catch (_) {}
    }
  };

  // Admin-Added Custom items (persisted across sessions via localStorage)
  const [customBranches, setCustomBranches] = useState<string[]>(() => loadCustomItems('crm_admin_branches'));
  const [customDepartments, setCustomDepartments] = useState<string[]>(() => loadCustomItems('crm_admin_departments'));
  const [customDesignations, setCustomDesignations] = useState<string[]>(() => loadCustomItems('crm_admin_designations'));
  const [customRoles, setCustomRoles] = useState<string[]>(() => loadCustomItems('crm_admin_roles'));
  const [customEmploymentTypes, setCustomEmploymentTypes] = useState<string[]>(() => loadCustomItems('crm_admin_employment_types'));
  const [customGenders, setCustomGenders] = useState<string[]>(() => loadCustomItems('crm_admin_genders'));

  type CustomFieldKey = 'branch' | 'department' | 'designation' | 'role' | 'employmentType' | 'gender';

  const [customModal, setCustomModal] = useState<{
    opened: boolean;
    field: CustomFieldKey;
    title: string;
    label: string;
    placeholder: string;
  }>({
    opened: false,
    field: 'branch',
    title: '',
    label: '',
    placeholder: '',
  });
  const [customModalInput, setCustomModalInput] = useState('');

  const handleOpenCustomModal = (
    field: CustomFieldKey,
    title: string,
    label: string,
    placeholder: string
  ) => {
    setCustomModal({ opened: true, field, title, label, placeholder });
    setCustomModalInput('');
  };

  const handleCloseCustomModal = () => {
    setCustomModal((prev) => ({ ...prev, opened: false }));
    setCustomModalInput('');
  };

  const getCustomListInfo = (field: CustomFieldKey): {
    list: string[];
    setter: React.Dispatch<React.SetStateAction<string[]>>;
    storageKey: string;
    formProp: 'workLocation' | 'department' | 'designation' | 'role' | 'employmentType' | 'gender';
  } => {
    switch (field) {
      case 'branch':
        return { list: customBranches, setter: setCustomBranches, storageKey: 'crm_admin_branches', formProp: 'workLocation' };
      case 'department':
        return { list: customDepartments, setter: setCustomDepartments, storageKey: 'crm_admin_departments', formProp: 'department' };
      case 'designation':
        return { list: customDesignations, setter: setCustomDesignations, storageKey: 'crm_admin_designations', formProp: 'designation' };
      case 'role':
        return { list: customRoles, setter: setCustomRoles, storageKey: 'crm_admin_roles', formProp: 'role' };
      case 'employmentType':
        return { list: customEmploymentTypes, setter: setCustomEmploymentTypes, storageKey: 'crm_admin_employment_types', formProp: 'employmentType' };
      case 'gender':
        return { list: customGenders, setter: setCustomGenders, storageKey: 'crm_admin_genders', formProp: 'gender' };
    }
  };

  const handleSaveCustomItem = () => {
    const val = customModalInput.trim();
    if (!val) return;
    const { setter, storageKey, formProp } = getCustomListInfo(customModal.field);
    setter((prev) => {
      const updated = prev.includes(val) ? prev : [...prev, val];
      saveCustomItems(storageKey, updated);
      return updated;
    });
    setFormData((prev) => ({ ...prev, [formProp]: val }));
    handleCloseCustomModal();
  };

  const handleRemoveCustomItem = (itemToRemove: string) => {
    const { setter, storageKey, formProp } = getCustomListInfo(customModal.field);
    setter((prev) => {
      const updated = prev.filter((i) => i !== itemToRemove);
      saveCustomItems(storageKey, updated);
      return updated;
    });
    setFormData((prev) => {
      if (prev[formProp] === itemToRemove) {
        return { ...prev, [formProp]: '' };
      }
      return prev;
    });
  };

  const [formData, setFormData] = useState<{
    // 1. Personal & Contact Information
    name: string;
    empCode: string;
    phone: string;
    email: string;
    password: string;
    dob: string;
    gender: string;
    address: string;
    avatar?: string;

    // 2. Job & Organization Details
    department: string;
    designation: string;
    role: string;
    reportingManager: string;
    joiningDate: string;
    employmentType: string;
    workLocation: string;
    status: string;
  }>({
    name: initialData?.name || '',
    empCode: initialData?.empCode || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    password: '',
    dob: initialData?.dob || '',
    gender: initialData?.gender || '',
    address: initialData?.address || '',
    avatar: initialData?.avatar || '',

    department: initialData?.department || '',
    designation: initialData?.designation || '',
    role: initialData?.role || '',
    reportingManager: initialData?.reportingManager || '',
    joiningDate: initialData?.joiningDate || '',
    employmentType: initialData?.employmentType || '',
    workLocation: initialData?.workLocation || '',
    status: initialData?.status || 'Active',
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFormData((prev) => ({ ...prev, avatar: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Auto-fill Employee ID code (Non-editable, sequential)
  useEffect(() => {
    if (!isEditing) {
      const numericCodes = employees
        .map((e) => {
          const match = e.empCode?.match(/EMP-(\d+)/i);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter((n): n is number => n !== null);

      const maxCode = numericCodes.length > 0 ? Math.max(...numericCodes) : 1000;
      const nextCode = `EMP-${maxCode + 1}`;

      if (!formData.empCode || employees.some((emp) => emp.empCode?.toUpperCase() === formData.empCode?.toUpperCase())) {
        setFormData((prev) => ({ ...prev, empCode: nextCode }));

        
      }
    }
  }, [employees, isEditing, formData.empCode]);

  // 100% Dynamic lists derived strictly from active database records, Admin-added custom items, and current form value
  const dynamicDepartments = useMemo(() => {
    const fromDb = employees.map((e) => e.department?.trim()).filter(Boolean) as string[];
    const combined = Array.from(
      new Set([
        ...fromDb,
        ...customDepartments,
        ...(formData.department ? [formData.department.trim()] : []),
      ])
    ).filter(Boolean).sort((a, b) => a.localeCompare(b));
    return combined;
  }, [employees, customDepartments, formData.department]);

  const dynamicDesignations = useMemo(() => {
    const fromDb = employees.map((e) => e.designation?.trim()).filter(Boolean) as string[];
    const combined = Array.from(
      new Set([
        ...fromDb,
        ...customDesignations,
        ...(formData.designation ? [formData.designation.trim()] : []),
      ])
    ).filter(Boolean).sort((a, b) => a.localeCompare(b));
    return combined;
  }, [employees, customDesignations, formData.designation]);

  const dynamicRoles = useMemo(() => {
    const fromAccessControl = roles.map((r) => r.name?.trim()).filter(Boolean) as string[];
    const fromDb = employees.map((e) => e.role?.trim()).filter(Boolean) as string[];
    const combined = Array.from(
      new Set([
        ...fromAccessControl,
        ...fromDb,
        ...customRoles,
        ...(formData.role ? [formData.role.trim()] : []),
      ])
    ).filter(Boolean).sort((a, b) => a.localeCompare(b));
    return combined;
  }, [roles, employees, customRoles, formData.role]);

  // Dynamic Reporting Manager options fetched from active employees and system managers
  const reportingManagerOptions = useMemo(() => {
    // 1. Available active employees (excluding self if editing)
    const availableEmployees = employees.filter((e) => {
      if (isEditing && initialData?.id && e.id === initialData.id) return false;
      return e.status?.toUpperCase() !== 'INACTIVE' && e.status?.toUpperCase() !== 'TERMINATED';
    });

    const list: { value: string; label: string }[] = availableEmployees.map((e) => {
      const code = e.empCode ? ` (${e.empCode})` : '';
      const roleOrDesig = e.designation || e.role || '';
      return {
        value: `${e.name}${code}`,
        label: `${e.name}${code}${roleOrDesig ? ` - ${roleOrDesig}` : ''}`,
      };
    });

    // 2. Also include users from AccessControl (e.g. Super Admin / Admins if not already in employee list)
    users.forEach((u) => {
      if (!u.name) return;
      const alreadyPresent = list.some(
        (item) => item.value.toLowerCase().includes(u.name.toLowerCase()) || item.label.toLowerCase().includes(u.name.toLowerCase())
      );
      if (!alreadyPresent) {
        list.push({
          value: u.name,
          label: `${u.name} (${u.role || 'Admin'})`,
        });
      }
    });

    // 3. Keep current selected reportingManager if not in list
    if (formData.reportingManager && !list.some((item) => item.value === formData.reportingManager)) {
      list.unshift({
        value: formData.reportingManager,
        label: formData.reportingManager,
      });
    }

    return list;
  }, [employees, users, isEditing, initialData, formData.reportingManager]);

  const dynamicEmploymentTypes = useMemo(() => {
    const fromDb = employees.map((e) => e.employmentType?.trim()).filter(Boolean) as string[];
    const combined = Array.from(
      new Set([
        ...fromDb,
        ...customEmploymentTypes,
        ...(formData.employmentType ? [formData.employmentType.trim()] : []),
      ])
    ).filter(Boolean).sort((a, b) => a.localeCompare(b));
    return combined.map((t) => ({ value: t, label: t }));
  }, [employees, customEmploymentTypes, formData.employmentType]);

  const branchOptions = useMemo(() => {
    const fromDb = employees.map((e) => e.workLocation?.trim()).filter(Boolean) as string[];
    const combined = Array.from(
      new Set([
        ...fromDb,
        ...customBranches,
        ...(formData.workLocation ? [formData.workLocation.trim()] : []),
      ])
    ).filter(Boolean).sort((a, b) => a.localeCompare(b));

    return combined.map((b) => ({ value: b, label: b }));
  }, [employees, customBranches, formData.workLocation]);

  const dynamicStatuses = useMemo(() => {
    return Array.from(
      new Set(employees.map((e) => e.status?.trim()).filter(Boolean) as string[])
    ).sort();
  }, [employees]);

  const dynamicGenders = useMemo(() => {
    const fromDb = employees.map((e) => e.gender?.trim()).filter(Boolean) as string[];
    const combined = Array.from(
      new Set([
        ...fromDb,
        ...customGenders,
        ...(formData.gender ? [formData.gender.trim()] : []),
      ])
    ).filter(Boolean).sort((a, b) => a.localeCompare(b));
    return combined;
  }, [employees, customGenders, formData.gender]);

  const [errors, setErrors] = useState<{ [key: string]: string | undefined }>({});
  const [loading, setLoading] = useState(false);


  // Dynamic calculations for Live Preview & Readiness
  const nameValid = formData.name.trim().length >= 3;
  const empCodeDigits = formData.empCode.trim().toUpperCase();
  const isDuplicateEmpCode = employees.some((emp) => {
    if (isEditing && initialData?.id && emp.id === initialData.id) return false;
    return emp.empCode && emp.empCode.toUpperCase() === empCodeDigits;
  });
  const empCodeValid = empCodeDigits.length >= 3 && !isDuplicateEmpCode;

  const phoneDigits = formData.phone.replace(/\D/g, '');
  const isDuplicatePhone = employees.some((emp) => {
    if (isEditing && initialData?.id && emp.id === initialData.id) return false;
    const empDigits = (emp.phone || '').replace(/\D/g, '');
    return empDigits && empDigits === phoneDigits;
  });
  const phoneValid = /^[6-9]\d{9}$/.test(phoneDigits) && !isDuplicatePhone;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanEmail = formData.email.trim().toLowerCase();
  const isDuplicateEmail = employees.some((emp) => {
    if (isEditing && initialData?.id && emp.id === initialData.id) return false;
    return emp.email && emp.email.toLowerCase().trim() === cleanEmail;
  });
  const emailValid = emailRegex.test(formData.email.trim()) && !isDuplicateEmail;

  const hasPassLength = formData.password.length >= 6;
  const hasPassLetter = /[a-zA-Z]/.test(formData.password);
  const hasPassNumber = /\d/.test(formData.password);
  const isPassValid = hasPassLength && hasPassLetter && hasPassNumber;
  const passwordValid = isEditing ? (!formData.password || isPassValid) : isPassValid;

  // Mandatory fields count (Personal & Contact Credentials)
  const mandatoryChecks = [
    nameValid,
    empCodeValid,
    phoneValid,
    emailValid,
    passwordValid,
  ];

  const completedCount = mandatoryChecks.filter(Boolean).length;
  const totalFields = mandatoryChecks.length;
  const completionPercentage = Math.round((completedCount / totalFields) * 100);
  const isReady = completedCount === totalFields;

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(formData.name);

  // Field validator
  const validateField = (field: string, value: string) => {
    let error = '';
    const trimmed = (value || '').trim();

    // Section 1
    if (field === 'name') {
      if (!trimmed) error = 'Full Name is mandatory';
      else if (trimmed.length < 3) error = 'Full Name must be at least 3 characters';
    } else if (field === 'empCode') {
      if (!trimmed) {
        error = 'Employee ID is mandatory';
      } else {
        const dup = employees.some((emp) => {
          if (isEditing && initialData?.id && emp.id === initialData.id) return false;
          return emp.empCode && emp.empCode.toUpperCase() === trimmed.toUpperCase();
        });
        if (dup) error = 'An employee with this ID already exists';
      }
    } else if (field === 'phone') {
      const digits = (value || '').replace(/\D/g, '');
      if (!digits) {
        error = 'Phone Number is mandatory';
      } else if (digits.length !== 10) {
        error = 'Phone number must be exactly 10 digits';
      } else if (!/^[6-9]\d{9}$/.test(digits)) {
        error = 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9';
      } else {
        const dup = employees.some((emp) => {
          if (isEditing && initialData?.id && emp.id === initialData.id) return false;
          const empDigits = (emp.phone || '').replace(/\D/g, '');
          return empDigits && empDigits === digits;
        });
        if (dup) error = 'An employee with this phone number already exists';
      }
    } else if (field === 'email') {
      if (!trimmed) {
        error = 'Email is mandatory';
      } else if (!emailRegex.test(trimmed)) {
        error = 'Please enter a valid email address';
      } else {
        const dup = employees.some((emp) => {
          if (isEditing && initialData?.id && emp.id === initialData.id) return false;
          return emp.email && emp.email.toLowerCase().trim() === trimmed.toLowerCase();
        });
        if (dup) error = 'An employee with this email address already exists';
      }
    } else if (field === 'password') {
      if (!isEditing) {
        if (!value) {
          error = 'Login Password is mandatory';
        } else if (value.length < 6) {
          error = 'Password must be at least 6 characters';
        } else if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
          error = 'Password must contain at least 1 letter and 1 number';
        }
      } else if (value) {
        if (value.length < 6) {
          error = 'Password must be at least 6 characters';
        } else if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
          error = 'Password must contain at least 1 letter and 1 number';
        }
      }
    }

    setErrors((prev) => {
      const updated = { ...prev };
      if (error) {
        updated[field] = error;
      } else {
        delete updated[field];
      }
      return updated;
    });

    return !error;
  };

  const validateAll = () => {
    const newErrors: { [key: string]: string | undefined } = {};

    // 1. Personal & Contact (Mandatory)
    if (!formData.name.trim()) newErrors.name = 'Full Name is mandatory';
    else if (formData.name.trim().length < 3) newErrors.name = 'Full Name must be at least 3 characters';

    let currentEmpCode = formData.empCode.trim();
    if (!currentEmpCode) {
      const numericCodes = employees
        .map((e) => {
          const match = e.empCode?.match(/EMP-(\d+)/i);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter((n): n is number => n !== null);
      const maxCode = numericCodes.length > 0 ? Math.max(...numericCodes) : 1000;
      currentEmpCode = `EMP-${maxCode + 1}`;
      setFormData((prev) => ({ ...prev, empCode: currentEmpCode }));
    }

    const digits = formData.phone.replace(/\D/g, '');
    if (!formData.phone.trim() || !digits) {
      newErrors.phone = 'Phone Number is mandatory';
    } else if (digits.length !== 10) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    } else if (!/^[6-9]\d{9}$/.test(digits)) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9';
    } else {
      const dup = employees.some((emp) => {
        if (isEditing && initialData?.id && emp.id === initialData.id) return false;
        const empDigits = (emp.phone || '').replace(/\D/g, '');
        return empDigits && empDigits === digits;
      });
      if (dup) newErrors.phone = 'An employee with this phone number already exists';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is mandatory';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    } else {
      const dup = employees.some((emp) => {
        if (isEditing && initialData?.id && emp.id === initialData.id) return false;
        return emp.email && emp.email.toLowerCase().trim() === formData.email.trim().toLowerCase();
      });
      if (dup) newErrors.email = 'An employee with this email address already exists';
    }

    if (!isEditing) {
      if (!formData.password) {
        newErrors.password = 'Login Password is mandatory';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      } else if (!/[a-zA-Z]/.test(formData.password) || !/\d/.test(formData.password)) {
        newErrors.password = 'Password must contain at least 1 letter and 1 number';
      }
    } else if (formData.password) {
      if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      } else if (!/[a-zA-Z]/.test(formData.password) || !/\d/.test(formData.password)) {
        newErrors.password = 'Password must contain at least 1 letter and 1 number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) {
      return;
    }

    setLoading(true);
    let success = false;
    if (isEditing && initialData?.id) {
      success = await updateEmployee(initialData.id, formData);
    } else {
      success = await addEmployee(formData);
    }
    setLoading(false);

    if (success) {
      onBack();
    }
  };

  const paperBg = isDark ? '#111827' : '#FFFFFF';
  const paperBorder = isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0';
  const paperShadow = isDark ? '0 12px 36px rgba(0, 0, 0, 0.45)' : '0 2px 8px -2px rgba(0, 0, 0, 0.05)';
  const headingColor = isDark ? '#F8FAFC' : '#0F172A';
  const backBtnColor = isDark ? '#94A3B8' : '#475569';
  const backBtnHover = isDark ? '#F8FAFC' : '#0F172A';

  return (
    <Box>
      {/* 1. Top Navigation */}
      <Group justify="flex-start" align="center" mb="lg">
        <UnstyledButton
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: backBtnColor,
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            padding: '4px 0',
            transition: 'color 0.15s ease, transform 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = backBtnHover;
            e.currentTarget.style.transform = 'translateX(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = backBtnColor;
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          <IconArrowLeft size={18} stroke={2.2} />
          <Text fw={600} size="14px" style={{ color: 'inherit' }}>
            Back to Employee Management
          </Text>
        </UnstyledButton>
      </Group>

      {/* 2. Main Form Layout */}
      <form onSubmit={handleSubmit} noValidate autoComplete="off">
        <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="xl">
          <Box style={{ gridColumn: 'span 2' }}>
            <Stack gap="xl">
            {/* SECTION 1: Personal & Contact Information */}
            <Paper
              p="xl"
              radius="lg"
              style={{
                background: paperBg,
                border: paperBorder,
                boxShadow: paperShadow,
              }}
            >
              <Group gap="sm" mb="xl">
                <ThemeIcon size={40} radius="md" variant="light" color="blue">
                  <IconUserPlus size={22} />
                </ThemeIcon>
                <div>
                  <Text fw={700} size="md" style={{ color: headingColor }}>
                    Personal & Contact Information
                  </Text>
                  <Text size="xs" c="dimmed">
                    Enter basic identity, login access, and contact coordinates
                  </Text>
                </div>
              </Group>

              <Stack gap="lg">
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    {/* 1. Full Name */}
                    <TextInput
                      label="Full Name"
                      placeholder="Enter full name"
                      required
                      withAsterisk
                      autoComplete="off"
                      leftSection={<IconUser size={16} color="#64748B" />}
                      value={formData.name}
                      error={errors.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, name: val });
                        if (errors.name) validateField('name', val);
                      }}
                      onBlur={() => validateField('name', formData.name)}
                      styles={normalInputStyles}
                    />

                    {/* 2. Phone Number */}
                    <TextInput
                      label="Phone Number"
                      placeholder="10-digit mobile number"
                      required
                      withAsterisk
                      maxLength={10}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="off"
                      leftSection={<IconPhone size={16} color="#64748B" />}
                      rightSection={
                        formData.phone ? (
                          <Text
                            size="11px"
                            fw={600}
                            c={formData.phone.length === 10 && /^[6-9]\d{9}$/.test(formData.phone) ? 'teal' : 'dimmed'}
                            pr={10}
                          >
                            {formData.phone.length}/10
                          </Text>
                        ) : null
                      }
                      value={formData.phone}
                      error={errors.phone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({ ...formData, phone: digits });
                        validateField('phone', digits);
                      }}
                      onBlur={() => validateField('phone', formData.phone)}
                      styles={normalInputStyles}
                    />

                    {/* 3. Email */}
                    <TextInput
                      label="Email"
                      placeholder="Enter email"
                      required
                      withAsterisk
                      type="email"
                      autoComplete="off"
                      leftSection={<IconMail size={16} color="#64748B" />}
                      value={formData.email}
                      error={errors.email}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, email: val });
                        validateField('email', val);
                      }}
                      onBlur={() => validateField('email', formData.email)}
                      styles={normalInputStyles}
                    />

                    {/* 5. Login Password */}
                    <PasswordInput
                      label={isEditing ? 'New Password (Optional)' : 'Login Password'}
                      placeholder={isEditing ? 'Leave blank to keep unchanged' : 'Enter password'}
                      required={!isEditing}
                      withAsterisk={!isEditing}
                      autoComplete="new-password"
                      leftSection={<IconLock size={16} color="#64748B" />}
                      value={formData.password}
                      error={errors.password}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, password: val });
                        if (errors.password) validateField('password', val);
                      }}
                      onBlur={() => validateField('password', formData.password)}
                      styles={normalInputStyles}
                    />

                    {/* 6. Date of Birth */}
                    <MeetingDatePicker
                      label="Date of Birth (Optional)"
                      placeholder="DD-MM-YYYY"
                      value={formData.dob}
                      onChange={(val: string) => setFormData({ ...formData, dob: val })}
                      styles={normalInputStyles}
                    />

                    {/* 7. Gender */}
                    <Box>
                      <Group justify="space-between" align="center" mb="6px">
                        <Text
                          component="label"
                          style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            color: isDark ? '#CBD5E1' : '#1E293B',
                          }}
                        >
                          Gender (Optional)
                        </Text>
                        <Button
                          variant="subtle"
                          size="compact-xs"
                          color="blue"
                          leftSection={<IconPlus size={12} />}
                          onClick={() => handleOpenCustomModal('gender', 'Add Gender', 'Gender Option', '')}
                          style={{ fontWeight: 600, fontSize: '11px', height: '22px' }}
                        >
                          + Add Gender
                        </Button>
                      </Group>
                      <Select
                        placeholder=""
                        data={dynamicGenders}
                        leftSection={<IconGenderBigender size={16} color="#64748B" />}
                        value={formData.gender || null}
                        onChange={(val) => setFormData({ ...formData, gender: val || '' })}
                        styles={{
                          ...normalInputStyles,
                          input: {
                            ...normalInputStyles.input,
                            cursor: 'pointer',
                          },
                        }}
                        clearable
                        allowDeselect
                        checkIconPosition="right"
                        comboboxProps={{ transitionProps: { transition: 'pop', duration: 150 } }}
                        maxDropdownHeight={220}
                      />
                    </Box>

                    {/* 8. Address */}
                    <Box style={{ gridColumn: 'span 2' }}>
                      <Textarea
                        label="Address (Optional)"
                        placeholder="Enter residential or permanent address"
                        minRows={2}
                        autosize
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        styles={normalInputStyles}
                      />
                    </Box>
                  </SimpleGrid>
                </Stack>
              </Paper>

              {/* SECTION 2: Job & Organization Details */}
              <Paper
                p="xl"
                radius="lg"
                style={{
                  background: paperBg,
                  border: paperBorder,
                  boxShadow: paperShadow,
                }}
              >
                <Group gap="sm" mb="xl">
                  <ThemeIcon size={40} radius="md" variant="light" color="indigo">
                    <IconBriefcase size={22} />
                  </ThemeIcon>
                  <div>
                    <Text fw={700} size="md" style={{ color: headingColor }}>
                      Job & Organization Details
                    </Text>
                    <Text size="xs" c="dimmed">
                      Configure employee role, organizational alignment, and employment terms
                    </Text>
                  </div>
                </Group>

                <Stack gap="lg">
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    {/* 1. Department */}
                    <Box>
                      <Group justify="space-between" align="center" mb="6px">
                        <Text
                          component="label"
                          style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            color: isDark ? '#CBD5E1' : '#1E293B',
                          }}
                        >
                          Department
                        </Text>
                        <Button
                          variant="subtle"
                          size="compact-xs"
                          color="blue"
                          leftSection={<IconPlus size={12} />}
                          onClick={() => handleOpenCustomModal('department', 'Add Department', 'Department Name', '')}
                          style={{ fontWeight: 600, fontSize: '11px', height: '22px' }}
                        >
                          + Add Department
                        </Button>
                      </Group>
                      <Select
                        placeholder=""
                        data={dynamicDepartments}
                        leftSection={<IconBuilding size={16} color="#64748B" />}
                        value={formData.department || null}
                        onChange={(val) => setFormData({ ...formData, department: val || '' })}
                        styles={{
                          ...normalInputStyles,
                          input: {
                            ...normalInputStyles.input,
                            cursor: 'pointer',
                          },
                        }}
                        clearable
                        allowDeselect
                        checkIconPosition="right"
                        comboboxProps={{ transitionProps: { transition: 'pop', duration: 150 } }}
                        maxDropdownHeight={220}
                      />
                    </Box>

                    {/* 2. Designation */}
                    <Box>
                      <Group justify="space-between" align="center" mb="6px">
                        <Text
                          component="label"
                          style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            color: isDark ? '#CBD5E1' : '#1E293B',
                          }}
                        >
                          Designation
                        </Text>
                        <Button
                          variant="subtle"
                          size="compact-xs"
                          color="blue"
                          leftSection={<IconPlus size={12} />}
                          onClick={() => handleOpenCustomModal('designation', 'Add Designation', 'Designation Name', '')}
                          style={{ fontWeight: 600, fontSize: '11px', height: '22px' }}
                        >
                          + Add Designation
                        </Button>
                      </Group>
                      <Select
                        placeholder=""
                        data={dynamicDesignations}
                        leftSection={<IconBriefcase size={16} color="#64748B" />}
                        value={formData.designation || null}
                        onChange={(val) => setFormData({ ...formData, designation: val || '' })}
                        styles={{
                          ...normalInputStyles,
                          input: {
                            ...normalInputStyles.input,
                            cursor: 'pointer',
                          },
                        }}
                        clearable
                        allowDeselect
                        checkIconPosition="right"
                        comboboxProps={{ transitionProps: { transition: 'pop', duration: 150 } }}
                        maxDropdownHeight={220}
                      />
                    </Box>

                    {/* 3. System Role */}
                    <Box>
                      <Group justify="space-between" align="center" mb="6px">
                        <Text
                          component="label"
                          style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            color: isDark ? '#CBD5E1' : '#1E293B',
                          }}
                        >
                          Role
                        </Text>
                        <Button
                          variant="subtle"
                          size="compact-xs"
                          color="blue"
                          leftSection={<IconPlus size={12} />}
                          onClick={() => handleOpenCustomModal('role', 'Add Role', 'Role Name', '')}
                          style={{ fontWeight: 600, fontSize: '11px', height: '22px' }}
                        >
                          + Add Role
                        </Button>
                      </Group>
                      <Select
                        placeholder=""
                        data={dynamicRoles}
                        searchable
                        leftSection={<IconShield size={16} color="#64748B" />}
                        value={formData.role || null}
                        onChange={(val) => setFormData({ ...formData, role: val || '' })}
                        styles={{
                          ...normalInputStyles,
                          input: {
                            ...normalInputStyles.input,
                            cursor: 'pointer',
                          },
                        }}
                        clearable
                        allowDeselect
                        checkIconPosition="right"
                        comboboxProps={{ transitionProps: { transition: 'pop', duration: 150 } }}
                        nothingFoundMessage="No matching roles found"
                        maxDropdownHeight={220}
                      />
                    </Box>

                    {/* 4. Reporting Manager */}
                    <Select
                      label="Reporting Manager (Optional)"
                      placeholder=""
                      data={reportingManagerOptions}
                      searchable
                      leftSection={<IconUsers size={16} color="#64748B" />}
                      value={formData.reportingManager || null}
                      onChange={(val) => setFormData({ ...formData, reportingManager: val || '' })}
                      styles={{
                        ...normalInputStyles,
                        input: {
                          ...normalInputStyles.input,
                          cursor: 'pointer',
                        },
                      }}
                      clearable
                      allowDeselect
                      checkIconPosition="right"
                      comboboxProps={{ transitionProps: { transition: 'pop', duration: 150 } }}
                      nothingFoundMessage="No matching reporting managers found"
                      maxDropdownHeight={220}
                    />

                    {/* 5. Date of Joining */}
                    <MeetingDatePicker
                      label="Date of Joining"
                      placeholder="DD-MM-YYYY"
                      value={formData.joiningDate}
                      onChange={(val: string) => setFormData({ ...formData, joiningDate: val })}
                      styles={normalInputStyles}
                    />

                    {/* 6. Employment Type (Dropdown) */}
                    <Box>
                      <Group justify="space-between" align="center" mb="6px">
                        <Text
                          component="label"
                          style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            color: isDark ? '#CBD5E1' : '#1E293B',
                          }}
                        >
                          Employment Type
                        </Text>
                        <Button
                          variant="subtle"
                          size="compact-xs"
                          color="blue"
                          leftSection={<IconPlus size={12} />}
                          onClick={() => handleOpenCustomModal('employmentType', 'Add Employment Type', 'Employment Type', '')}
                          style={{ fontWeight: 600, fontSize: '11px', height: '22px' }}
                        >
                          + Add Employment Type
                        </Button>
                      </Group>
                      <Select
                        placeholder=""
                        data={dynamicEmploymentTypes}
                        leftSection={<IconClock size={16} color="#64748B" />}
                        value={formData.employmentType || null}
                        onChange={(val) => setFormData({ ...formData, employmentType: val || '' })}
                        styles={{
                          ...normalInputStyles,
                          input: {
                            ...normalInputStyles.input,
                            cursor: 'pointer',
                          },
                        }}
                        clearable
                        allowDeselect
                        checkIconPosition="right"
                        comboboxProps={{ transitionProps: { transition: 'pop', duration: 150 } }}
                        maxDropdownHeight={220}
                      />
                    </Box>

                    {/* 7. Branch (Formerly Work Location with Custom Branch addition) */}
                    <Box>
                      <Group justify="space-between" align="center" mb="6px">
                        <Text
                          component="label"
                          style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            color: isDark ? '#CBD5E1' : '#1E293B',
                          }}
                        >
                          Branch
                        </Text>
                        <Button
                          variant="subtle"
                          size="compact-xs"
                          color="blue"
                          leftSection={<IconPlus size={12} />}
                          onClick={() => handleOpenCustomModal('branch', 'Add Branch', 'Branch Name', '')}
                          style={{ fontWeight: 600, fontSize: '11px', height: '22px' }}
                        >
                          + Add Branch
                        </Button>
                      </Group>
                      <Select
                        placeholder=""
                        data={branchOptions}
                        leftSection={<IconMapPin size={16} color="#64748B" />}
                        value={formData.workLocation || null}
                        onChange={(val) => setFormData({ ...formData, workLocation: val || '' })}
                        styles={{
                          ...normalInputStyles,
                          input: {
                            ...normalInputStyles.input,
                            cursor: 'pointer',
                          },
                        }}
                        clearable
                        allowDeselect
                        checkIconPosition="right"
                        comboboxProps={{ transitionProps: { transition: 'pop', duration: 150 } }}
                        maxDropdownHeight={220}
                      />
                    </Box>

                    {/* 8. Employee Status (Toggle Button) */}
                    <Box>
                      <Text
                        component="label"
                        style={{
                          display: 'block',
                          fontWeight: 600,
                          fontSize: '13px',
                          marginBottom: '6px',
                          color: '#1E293B',
                        }}
                      >
                        Employee Status
                      </Text>
                      <Paper
                        p="xs"
                        style={{
                          height: '42px',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingLeft: '14px',
                          paddingRight: '14px',
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        <Group gap="xs">
                          <IconActivity
                            size={16}
                            color={
                              (formData.status || '').toLowerCase().includes('inact')
                                ? '#94A3B8'
                                : '#10B981'
                            }
                          />
                          <Badge
                            size="sm"
                            variant="light"
                            color={
                              (formData.status || '').toLowerCase().includes('inact')
                                ? 'gray'
                                : 'teal'
                            }
                          >
                            {(formData.status || '').toLowerCase().includes('inact')
                              ? 'Inactive'
                              : 'Active'}
                          </Badge>
                        </Group>
                        <Switch
                          checked={!(formData.status || '').toLowerCase().includes('inact')}
                          onChange={(event) =>
                            setFormData({
                              ...formData,
                              status: event.currentTarget.checked ? 'Active' : 'Inactive',
                            })
                          }
                          color="teal"
                          size="md"
                          thumbIcon={
                            !(formData.status || '').toLowerCase().includes('inact') ? (
                              <IconCheck size={12} color="#10B981" stroke={3} />
                            ) : undefined
                          }
                        />
                      </Paper>
                    </Box>
                  </SimpleGrid>
                </Stack>
              </Paper>

              {/* Bottom Action Buttons */}
              <Group justify="flex-end" gap="sm" mt="sm">
                <Button
                  variant="default"
                  size="sm"
                  radius="md"
                  onClick={onBack}
                  style={{
                    fontWeight: 600,
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #CBD5E1',
                    color: isDark ? '#CBD5E1' : '#475569',
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  }}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  radius="md"
                  loading={loading}
                  leftSection={<IconCheck size={16} />}
                  style={{
                    background: isDark ? '#3B82F6' : '#0F172A',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    minWidth: 150,
                    boxShadow: isDark ? '0 4px 14px rgba(59, 130, 246, 0.35)' : undefined,
                  }}
                >
                  {isEditing ? 'Save Changes' : 'Add Employee'}
                </Button>
              </Group>
            </Stack>
          </Box>

          {/* Right 1 Column: Clean, Elegant Live Preview & Actions */}
          <Box style={{ position: 'sticky', top: 20 }}>
            <Stack gap="md">
              <Paper
                p="xl"
                radius="lg"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.05)',
                }}
              >
                {/* Header */}
                <Group justify="space-between" align="center" mb="lg">
                  <Text fw={700} size="sm" style={{ color: '#0F172A' }}>
                    Profile Preview
                  </Text>
                  {isEditing ? (
                    <Badge size="sm" variant="light" color="blue">
                      Editing
                    </Badge>
                  ) : isReady ? (
                    <Badge size="sm" color="teal" variant="light" leftSection={<IconCheck size={12} />}>
                      Ready
                    </Badge>
                  ) : (
                    <Badge size="sm" variant="light" color="gray">
                      {completedCount}/{totalFields} Complete
                    </Badge>
                  )}
                </Group>

                {/* Profile Hero Section */}
                <Box style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    style={{ display: 'none' }}
                  />
                  <Tooltip label="Click to upload profile photo" position="top" withArrow>
                    <Box
                      onClick={handleAvatarClick}
                      style={{
                        position: 'relative',
                        cursor: 'pointer',
                        display: 'inline-block',
                        borderRadius: '50%',
                        transition: 'transform 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      <Avatar
                        src={formData.avatar || undefined}
                        size={80}
                        radius="xl"
                        mx="auto"
                        color={formData.name.trim() ? 'dark' : 'gray'}
                        style={{
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                          border: '2px solid #E2E8F0',
                          fontWeight: 700,
                          fontSize: 24,
                          background: formData.avatar ? '#FFFFFF' : formData.name.trim() ? '#0F172A' : '#F8FAFC',
                          color: formData.name.trim() ? '#FFFFFF' : '#64748B',
                        }}
                      >
                        {!formData.avatar && (initials || <IconUser size={34} color="#94A3B8" />)}
                      </Avatar>

                      {/* Camera Icon */}
                      <Box
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          background: '#0F172A',
                          color: '#FFFFFF',
                          borderRadius: '50%',
                          width: 24,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                          border: '2px solid #FFFFFF',
                        }}
                      >
                        <IconCamera size={12} stroke={2.5} />
                      </Box>
                    </Box>
                  </Tooltip>

                  {formData.avatar && (
                    <Box mt={4}>
                      <Button
                        variant="subtle"
                        color="red"
                        size="compact-xs"
                        leftSection={<IconTrash size={12} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData((prev) => ({ ...prev, avatar: '' }));
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      >
                        Remove Photo
                      </Button>
                    </Box>
                  )}

                  <Text fw={700} size="md" mt="xs" style={{ color: formData.name.trim() ? '#0F172A' : '#94A3B8' }}>
                    {formData.name.trim() || 'New Employee'}
                  </Text>

                  <Text size="xs" c="dimmed" mt={2}>
                    {formData.designation.trim() ? `${formData.designation} • ${formData.department}` : formData.department}
                  </Text>

                  <Group justify="center" gap={6} mt="xs">
                    <Badge size="xs" variant="outline" color="gray">
                      {formData.empCode || 'EMP-XXXX'}
                    </Badge>
                    <Badge size="xs" variant="light" color="teal">
                      {formData.status || 'Active'}
                    </Badge>
                    <Badge size="xs" variant="light" color="blue">
                      {formData.employmentType || 'Full Time'}
                    </Badge>
                  </Group>
                </Box>

                <Divider my="sm" />

                {/* Clean Key-Value Attributes */}
                <Stack gap="xs" my="md">
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="xs" c="dimmed">Email:</Text>
                    <Text size="xs" fw={500} c={formData.email ? '#0F172A' : 'dimmed'} truncate style={{ maxWidth: 170 }}>
                      {formData.email.trim() || '—'}
                    </Text>
                  </Group>

                  <Group justify="space-between" wrap="nowrap">
                    <Text size="xs" c="dimmed">Phone:</Text>
                    <Text size="xs" fw={500} c={formData.phone ? '#0F172A' : 'dimmed'}>
                      {formData.phone.trim() || '—'}
                    </Text>
                  </Group>

                  <Group justify="space-between" wrap="nowrap">
                    <Text size="xs" c="dimmed">Branch:</Text>
                    <Text size="xs" fw={500} c={formData.workLocation ? '#0F172A' : 'dimmed'}>
                      {formData.workLocation || '—'}
                    </Text>
                  </Group>

                  <Group justify="space-between" wrap="nowrap">
                    <Text size="xs" c="dimmed">Joining Date:</Text>
                    <Text size="xs" fw={500} c={formData.joiningDate ? '#0F172A' : 'dimmed'}>
                      {formData.joiningDate || '—'}
                    </Text>
                  </Group>

                  <Group justify="space-between" wrap="nowrap">
                    <Text size="xs" c="dimmed">System Role:</Text>
                    <Text size="xs" fw={500} c={formData.role ? '#0F172A' : 'dimmed'}>
                      {formData.role || '—'}
                    </Text>
                  </Group>
                </Stack>

                {/* Form Progress */}
                <Box mt="md" pt="xs" style={{ borderTop: '1px solid #F1F5F9' }}>
                  <Group justify="space-between" mb={6}>
                    <Text size="xs" c="dimmed" fw={600}>
                      Form Completion
                    </Text>
                    <Text size="xs" fw={700} c={isReady ? 'teal' : 'blue'}>
                      {completionPercentage}%
                    </Text>
                  </Group>
                  <Progress
                    value={completionPercentage}
                    color={isReady ? 'teal' : 'blue'}
                    size="sm"
                    radius="xl"
                  />
                </Box>

                <Divider my="md" />

                {/* Action Buttons */}
                <Stack gap="xs">
                  <Button
                    type="submit"
                    size="md"
                    radius="md"
                    loading={loading}
                    leftSection={<IconCheck size={18} />}
                    style={{
                      background: '#0F172A',
                      color: '#FFFFFF',
                      fontWeight: 600,
                    }}
                  >
                    {isEditing ? 'Save Changes' : 'Add Employee'}
                  </Button>

                  <Button
                    variant="subtle"
                    color="gray"
                    radius="md"
                    onClick={onBack}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Paper>
            </Stack>
          </Box>
        </SimpleGrid>
      </form>

      {/* Unified Custom Option Modal for all dropdowns (Branch, Department, Designation, Role, Employment Type, Gender) */}
      <Modal
        opened={customModal.opened}
        onClose={handleCloseCustomModal}
        title={<Text fw={700} size="md">{customModal.title}</Text>}
        centered
        radius="md"
        size="sm"
      >
        <Stack gap="md">
          <TextInput
            label={customModal.label}
            placeholder={customModal.placeholder}
            value={customModalInput}
            onChange={(e) => setCustomModalInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveCustomItem();
              }
            }}
            autoFocus
            required
          />

          {getCustomListInfo(customModal.field).list.length > 0 && (
            <Box>
              <Text size="xs" fw={600} c="dimmed" mb="xs">
                Admin-Added {customModal.title.replace('Add ', '')}s:
              </Text>
              <Group gap={6}>
                {getCustomListInfo(customModal.field).list.map((item) => (
                  <Badge
                    key={item}
                    variant="light"
                    color="blue"
                    size="sm"
                    rightSection={
                      <ActionIcon
                        size={14}
                        radius="xl"
                        variant="transparent"
                        color="blue"
                        onClick={() => handleRemoveCustomItem(item)}
                        style={{ cursor: 'pointer' }}
                      >
                        <IconTrash size={10} />
                      </ActionIcon>
                    }
                  >
                    {item}
                  </Badge>
                ))}
              </Group>
            </Box>
          )}

          <Group justify="flex-end" gap="xs">
            <Button
              variant="default"
              onClick={handleCloseCustomModal}
            >
              Cancel
            </Button>
            <Button
              color="blue"
              onClick={handleSaveCustomItem}
              disabled={!customModalInput.trim()}
            >
              Add & Select
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};

export default AddEmployeePage;
