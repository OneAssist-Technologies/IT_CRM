import React, { useState, useMemo, useEffect, useRef } from 'react';

import {

  Box,

  Text,

  Title,

  Badge,

  Card,

  Group,

  Stack,

  Grid,

  Button,

  Paper,

  ActionIcon,

  Tooltip,

  Divider,

  TextInput,

  Select,

  Textarea,

  Modal,

  ThemeIcon,

  SimpleGrid,

  Avatar,

  Tabs,

  Menu,

  Table,

  Progress,

  Center,

} from '@mantine/core';

import {

  IconClipboardCheck,

  IconListCheck,

  IconCheck,

  IconEdit,

  IconExternalLink,

  IconCalendar,

  IconBuilding,

  IconPlus,

  IconPaperclip,

  IconTrash,

  IconSend,

  IconFileText,

  IconClock,

  IconArrowRight,

  IconArrowLeft,

  IconBrandGithub,

  IconBrandFigma,

  IconWorld,

  IconBox,

  IconCalendarEvent,

  IconShieldCheck,

  IconCloudUpload,

  IconUpload,

  IconMessageCircle,

  IconChevronRight,

  IconPackage,

  IconUser,

  IconDownload,

  IconX,

  IconFileCheck,

  IconEye,

  IconRocket,

  IconCircleCheckFilled,
  IconReceipt,
  IconCash,
  IconUsers,
  IconPhone,
  IconMail,
} from '@tabler/icons-react';

import { notifications } from '@mantine/notifications';

import {
  Lead,
  LeadHandoverData,
  HandoverAttachment,
  HandoverCommentItem,
  LeadProgressData,
  HandoverDeliverableItem,
  Contract,
} from '../../../../types/lead';
import { leadService } from '../../../../services/leadService';
import { billingService } from '../../../../services/billingService';

import { useProject } from '../../../../context/ProjectContext';

import { useEmployee } from '../../../../context/EmployeeContext';

import dayjs from 'dayjs';



export interface LeadHandoverSectionProps {

  lead: Lead;

  isDark: boolean;

  handover?: LeadHandoverData;

  progress?: LeadProgressData;

  onUpdateHandover: (handover: LeadHandoverData) => void;

  onNavigateSection: (section: string) => void;

}



// Helper to filter out any auto-generated or boilerplate work lines

export const isUnwantedWorkLine = (line?: string): boolean => {

  if (!line) return true;

  const lower = line.toLowerCase();

  return (

    lower.includes('core frontend') ||

    lower.includes('database schema') ||

    lower.includes('staging environment') ||

    lower.includes('production ssl') ||

    lower.includes('client team admin') ||

    lower.includes('3-month post-delivery') ||

    lower.includes('initial milestone') ||

    lower.includes('architecture baseline') ||

    lower.includes('dashboard module') ||

    lower.includes('final production deployment') ||

    lower.includes('client delivery for') ||

    lower.includes('handover record initialized') ||

    (lower.includes('module') && (lower.includes('in progress') || lower.includes('completed 100%')))

  );

};



export const cleanWorkText = (text?: string): string => {

  if (!text) return '';

  return text

    .split('\n')

    .map((l) => l.trim())

    .filter((l) => {

      if (!l) return false;

      const stripped = l.replace(/^•\s*/, '').trim();

      return Boolean(stripped) && !isUnwantedWorkLine(stripped);

    })

    .join('\n')

    .trim();

};



// Helper to filter out legacy hardcoded boilerplate comments

export const isUnwantedLegacyComment = (text?: string): boolean => {

  if (!text) return true;

  const lower = text.toLowerCase();

  return (

    lower.includes('handover package prepared') ||

    lower.includes('module sign-off review') ||

    lower.includes('handover approved and accepted') ||

    lower.includes('handover record initialized') ||

    lower.includes('approval status updated') ||

    lower.includes('handover status updated')

  );

};



export const cleanComments = (comments?: HandoverCommentItem[]): HandoverCommentItem[] => {

  if (!comments || !Array.isArray(comments)) return [];

  return comments.filter((c) => !isUnwantedLegacyComment(c.text));

};



export const LeadHandoverSection: React.FC<LeadHandoverSectionProps> = ({

  lead,

  isDark,

  handover: propHandover,

  progress,

  onUpdateHandover,

  onNavigateSection,

}) => {

  const { projects } = useProject();

  const { employees } = useEmployee();



  // Find linked project dynamically from database

  const linkedProject = useMemo(() => {

    return (

      projects.find(

        (p) =>

          p.contactId === lead.id ||

          p.id === (lead as any).projectId ||

          (p.clientName && lead.name && p.clientName.toLowerCase().includes(lead.name.toLowerCase())) ||

          (p.clientName && lead.companyName && p.clientName.toLowerCase().includes(lead.companyName.toLowerCase()))

      ) || projects[0] || null

    );

  }, [projects, lead]);



  const defaultProjectName = linkedProject?.name || progress?.projectName || 'Project';

  const defaultProjectCode = linkedProject?.projectId || progress?.projectCode || 'P001';

  const defaultPmName = linkedProject?.projectManagerName || 'santhosh';

  const defaultClientName = lead.name ? `${lead.name} (${lead.companyName || 'Client'})` : 'Client';

  const defaultDate = linkedProject?.targetEndDate || dayjs().format('DD-MM-YYYY');

  const projectProgress = linkedProject?.progress ?? progress?.overallPercentage ?? 0;



  // Build real dynamic attachments from project

  const getDynamicDocuments = (project: any): HandoverAttachment[] => {

    const docs: HandoverAttachment[] = [];

    if (project?.liveUrl) {

      docs.push({

        id: 'doc-live',

        name: `${project.name} - Production Environment URL`,

        url: project.liveUrl,

        fileType: 'Live URL',

        fileSize: 'HTTPS Active',

        uploadedAt: dayjs().format('DD-MM-YYYY'),

      });

    }

    if (project?.githubUrl) {

      docs.push({

        id: 'doc-github',

        name: `${project.name} - Source Code Repository`,

        url: project.githubUrl,

        fileType: 'Git Repo',

        fileSize: 'Main Branch',

        uploadedAt: dayjs().format('DD-MM-YYYY'),

      });

    }

    if (project?.figmaUrl) {

      docs.push({

        id: 'doc-figma',

        name: `${project.name} - UI/UX Design System`,

        url: project.figmaUrl,

        fileType: 'Figma Asset',

        fileSize: 'Design Specs',

        uploadedAt: dayjs().format('DD-MM-YYYY'),

      });

    }

    return docs;

  };



  // Initialize handover state strictly with dynamic data without auto-generated clutter

  const [data, setData] = useState<LeadHandoverData>(() => {

    const dynamicDocs = getDynamicDocuments(linkedProject);



    if (propHandover && propHandover.handoverId) {

      return {

        ...propHandover,

        handoverModules: propHandover.handoverModules || (() => {

          try {

            const s = localStorage.getItem(`crm_lead_handover_modules_${lead.id}`);

            return s ? JSON.parse(s) : [];

          } catch { return []; }

        })(),

        completedWork: cleanWorkText(propHandover.completedWork),

        pendingTasks: cleanWorkText(propHandover.pendingTasks),

        documents:

          propHandover.documents &&

          propHandover.documents.some((d) => d.url?.includes('docs.google.com/document/d/'))

            ? dynamicDocs

            : propHandover.documents || dynamicDocs,

        comments: cleanComments(propHandover.comments),

      };

    }



    return {

      // 1. Handover ID

      handoverId: 'HND-1001',



      // 2. Handover Title

      handoverTitle: `${defaultProjectName} - Client Delivery & Transition`,



      // 3. Handover Type

      handoverType: 'Project Delivery',



      // 4. Project / Module

      projectModule: `${defaultProjectName} (${defaultProjectCode}) / Core Platform`,



      // 5. From Employee

      fromEmployee: defaultPmName,



      // 6. To Employee

      toEmployee: defaultClientName,



      // 7. Handover Date

      handoverDate: defaultDate,



      // 8. Completed Work (Clean, only user-entered items)

      completedWork: '',



      // 9. Pending Tasks (Clean, only user-entered items)

      pendingTasks: '',



      // 10. Documents / Attachments (DYNAMIC from project URLs)

      documents: dynamicDocs,



      // 11. Priority

      priority: linkedProject?.priority || 'High',



      // 12. Approval Status

      approvalStatus: propHandover?.approvalStatus || 'Pending Approval',



      // 13. Handover Status

      handoverStatus: propHandover?.handoverStatus || 'In Progress',



      // 14. Comments (Clean, only user-entered remarks)

      comments: [],



      // Transferred deliverables & modules from Progress section

      handoverModules: propHandover?.handoverModules || (() => {

        try {

          const s = localStorage.getItem(`crm_lead_handover_modules_${lead.id}`);

          return s ? JSON.parse(s) : [];

        } catch { return []; }

      })(),



      // Compatibility

      leadId: lead.id,

      projectName: defaultProjectName,

      projectCode: defaultProjectCode,

      status: propHandover?.status || 'In Progress',

    };

  });



  // Automatically clean legacy boilerplate items and sync

  useEffect(() => {

    setData((prev) => {

      const dynamicDocs = linkedProject ? getDynamicDocuments(linkedProject) : prev.documents;

      const updatedDocs =

        prev.documents.length === 0 ||

        prev.documents.some((d) => d.url?.includes('docs.google.com/document/d/'))

          ? dynamicDocs

          : prev.documents;



      const sourceCompleted = propHandover?.completedWork !== undefined ? propHandover.completedWork : prev.completedWork;

      const sourcePending = propHandover?.pendingTasks !== undefined ? propHandover.pendingTasks : prev.pendingTasks;

      const sourceComments = propHandover?.comments !== undefined ? propHandover.comments : prev.comments;



      const cleanedCompleted = cleanWorkText(sourceCompleted);

      const cleanedPending = cleanWorkText(sourcePending);

      const cleanedCommentsList = cleanComments(sourceComments);



      const updated = {

        ...prev,

        ...(propHandover || {}),

        handoverModules: propHandover?.handoverModules || prev.handoverModules,

        projectName: linkedProject?.name || prev.projectName,

        projectCode: linkedProject?.projectId || prev.projectCode,

        handoverDate: linkedProject?.targetEndDate || prev.handoverDate,

        fromEmployee: linkedProject?.projectManagerName || prev.fromEmployee,

        completedWork: cleanedCompleted,

        pendingTasks: cleanedPending,

        documents: updatedDocs,

        comments: cleanedCommentsList,

      };



      if (

        cleanedCompleted !== prev.completedWork ||

        cleanedPending !== prev.pendingTasks ||

        cleanedCommentsList.length !== (prev.comments?.length || 0)

      ) {

        onUpdateHandover(updated);

      }



      return updated;

    });

  }, [linkedProject, propHandover, lead.id]);



  // List of handed-over modules from Progress

  const handedOverModules: HandoverDeliverableItem[] = useMemo(() => {

    if (data.handoverModules && data.handoverModules.length > 0) {

      return data.handoverModules;

    }

    if (propHandover?.handoverModules && propHandover.handoverModules.length > 0) {

      return propHandover.handoverModules;

    }

    try {

      const stored = localStorage.getItem(`crm_lead_handover_modules_${lead.id}`);

      if (stored) {

        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed) && parsed.length > 0) return parsed;

      }

    } catch (_) {}

    return [];

  }, [data.handoverModules, propHandover?.handoverModules, lead.id]);



  // Update handover status of an item (e.g. 'Ready for Handover', 'Accepted')

  const handleUpdateItemHandoverStatus = (itemId: string, newStatus: string) => {

    const updatedModules = handedOverModules.map((item) =>

      item.id === itemId ? { ...item, handoverStatus: newStatus } : item

    );

    const updatedData = { ...data, handoverModules: updatedModules };

    setData(updatedData);

    onUpdateHandover(updatedData);

    try {

      localStorage.setItem(`crm_lead_handover_modules_${lead.id}`, JSON.stringify(updatedModules));

    } catch (_) {}

    notifications.show({

      title: 'Handover Status Updated',

      message: `Status updated to "${newStatus}"`,

      color: 'teal',

      icon: <IconCheck size={16} />,

    });

  };



  // Remove a deliverable from handover

  const handleRemoveHandoverItem = (itemId: string) => {

    const updatedModules = handedOverModules.filter((item) => item.id !== itemId);

    const updatedData = { ...data, handoverModules: updatedModules };

    setData(updatedData);

    onUpdateHandover(updatedData);

    try {

      localStorage.setItem(`crm_lead_handover_modules_${lead.id}`, JSON.stringify(updatedModules));

    } catch (_) {}

    notifications.show({

      title: 'Deliverable Removed',

      message: 'Deliverable removed from handover list',

      color: 'gray',

    });

  };



    // Modal States
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [selectedDeliverableForDetails, setSelectedDeliverableForDetails] = useState<HandoverDeliverableItem | null>(null);

  // Fetch contracts & quotations for dynamic Sales Information
  useEffect(() => {
    if (!lead?.id) return;
    leadService
      .getContracts({ leadId: lead.id })
      .then((res) => {
        if (res && res.data) setContracts(res.data);
      })
      .catch(() => {});
    billingService
      .getQuotations({ leadId: lead.id, flat: true })
      .then((res) => {
        if (res && Array.isArray(res)) setQuotations(res);
      })
      .catch(() => {});
  }, [lead?.id]);

  // Dynamically resolve target project for selected deliverable
  const activeProject = useMemo(() => {
    if (!selectedDeliverableForDetails) return linkedProject;
    return (
      projects.find(
        (p) =>
          p.id === selectedDeliverableForDetails.projectId ||
          (selectedDeliverableForDetails.projectName &&
            p.name?.toLowerCase() === selectedDeliverableForDetails.projectName.toLowerCase()) ||
          (selectedDeliverableForDetails.projectCode &&
            p.projectId?.toLowerCase() === selectedDeliverableForDetails.projectCode.toLowerCase())
      ) || linkedProject
    );
  }, [projects, selectedDeliverableForDetails, linkedProject]);

  // Dynamically resolve target contract for sales info
  const activeContract = useMemo(() => {
    if (!contracts || contracts.length === 0) return null;
    if (selectedDeliverableForDetails) {
      const match = contracts.find(
        (c) =>
          (selectedDeliverableForDetails.projectName &&
            c.projectName?.toLowerCase() === selectedDeliverableForDetails.projectName.toLowerCase()) ||
          c.id === selectedDeliverableForDetails.projectId
      );
      if (match) return match;
    }
    return contracts[0] || null;
  }, [contracts, selectedDeliverableForDetails]);

  // Dynamically resolve quotation for sales info
  const activeQuotation = useMemo(() => {
    if (!quotations || quotations.length === 0) return null;
    if (activeContract) {
      const match = quotations.find(
        (q) =>
          (activeContract.quotationId && q.id === activeContract.quotationId) ||
          (activeContract.quotationNumber && q.quotationNumber === activeContract.quotationNumber)
      );
      if (match) return match;
    }
    return quotations[0] || null;
  }, [quotations, activeContract]);

  const [editModalOpen, setEditModalOpen] = useState(false);

  const [editForm, setEditForm] = useState<LeadHandoverData>(data);



  // Real File Upload States & References

  interface UploadPendingFile {

    file: File;

    name: string;

    size: string;

    type: string;

    dataUrl?: string;

  }



  const [docModalOpen, setDocModalOpen] = useState(false);

  const [selectedUploadFiles, setSelectedUploadFiles] = useState<UploadPendingFile[]>([]);

  const [optionalDriveUrl, setOptionalDriveUrl] = useState('');

  const [isModalDraggingOver, setIsModalDraggingOver] = useState(false);

  const [isCardDraggingOver, setIsCardDraggingOver] = useState(false);

  const [previewDoc, setPreviewDoc] = useState<HandoverAttachment | null>(null);



  const getSafeViewerUrl = (url?: string): string => {

    if (!url) return '';

    if (url.startsWith('data:application/pdf')) {

      try {

        const parts = url.split(',');

        const base64Data = parts[1];

        const binaryString = atob(base64Data);

        const bytes = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {

          bytes[i] = binaryString.charCodeAt(i);

        }

        const blob = new Blob([bytes], { type: 'application/pdf' });

        return URL.createObjectURL(blob);

      } catch {

        return url;

      }

    }

    return url;

  };



  const isPdfDoc = (doc?: HandoverAttachment | null): boolean => {

    if (!doc) return false;

    const name = (doc.name || '').toLowerCase();

    const type = (doc.fileType || '').toLowerCase();

    const url = (doc.url || '').toLowerCase();

    return (

      type.includes('pdf') ||

      name.endsWith('.pdf') ||

      url.endsWith('.pdf') ||

      url.includes('.pdf?') ||

      url.includes('application/pdf') ||

      url.startsWith('data:application/pdf')

    );

  };



  const isImageDoc = (doc?: HandoverAttachment | null): boolean => {

    if (!doc) return false;

    const name = (doc.name || '').toLowerCase();

    const type = (doc.fileType || '').toLowerCase();

    const url = (doc.url || '').toLowerCase();

    return (

      type.includes('image') ||

      /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(name) ||

      url.startsWith('data:image/')

    );

  };



    const modalFileInputRef = useRef<HTMLInputElement | null>(null);
  const cardFileInputRef = useRef<HTMLInputElement | null>(null);
  const detailsModalFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDetailsDraggingOver, setIsDetailsDraggingOver] = useState(false);



  const formatFileSize = (bytes: number): string => {

    if (bytes === 0) return '0 Bytes';

    const k = 1024;

    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;

  };



  const detectFileType = (fileName: string): string => {

    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    if (['pdf'].includes(ext)) return 'PDF Document';

    if (['doc', 'docx'].includes(ext)) return 'Word Document';

    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'Spreadsheet';

    if (['ppt', 'pptx'].includes(ext)) return 'Presentation';

    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'Archive / ZIP';

    if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext)) return 'Image Asset';

    if (['fig'].includes(ext)) return 'Figma Asset';

    return 'Document';

  };



  const getFileIcon = (fileType?: string, fileName?: string) => {

    const type = (fileType || fileName || '').toLowerCase();

    if (type.includes('git')) return <IconBrandGithub size={15} />;

    if (type.includes('figma') || type.endsWith('.fig')) return <IconBrandFigma size={15} />;

    if (type.includes('live') || type.includes('http')) return <IconWorld size={15} />;

    if (type.includes('pdf')) return <IconFileText size={15} color="#EF4444" />;

    if (type.includes('word') || type.includes('doc')) return <IconFileText size={15} color="#2563EB" />;

    if (type.includes('spread') || type.includes('xls') || type.includes('csv')) return <IconFileText size={15} color="#10B981" />;

    if (type.includes('zip') || type.includes('archive')) return <IconPackage size={15} color="#F59E0B" />;

    return <IconFileText size={15} color="#3B82F6" />;

  };



  const [newCommentText, setNewCommentText] = useState('');



  const commentsList = useMemo(() => {

    return cleanComments(data.comments);

  }, [data.comments]);



  // Quick Action: Update Approval Status via Dropdown

  const handleUpdateApprovalStatus = (newApproval: string) => {

    let nextHandoverStatus = data.handoverStatus;

    if (newApproval === 'Approved' && data.handoverStatus !== 'Completed') {

      nextHandoverStatus = 'Completed';

    } else if (newApproval !== 'Approved' && data.handoverStatus === 'Completed') {

      nextHandoverStatus = 'In Progress';

    }

    const updated: LeadHandoverData = {

      ...data,

      approvalStatus: newApproval,

      handoverStatus: nextHandoverStatus,

      status: nextHandoverStatus === 'Completed' ? 'Handover Completed' : 'In Progress',

    };

    setData(updated);

    onUpdateHandover(updated);

    notifications.show({

      title: 'Approval Status Updated',

      message: `Status changed to ${newApproval}`,

      color: getApprovalColor(newApproval),

    });

  };



  // Quick Action: Update Handover Status via Dropdown

  const handleUpdateHandoverStatus = (newStatus: string) => {

    let nextApproval = data.approvalStatus;

    if (newStatus === 'Completed' && data.approvalStatus !== 'Approved') {

      nextApproval = 'Approved';

    } else if (newStatus !== 'Completed' && data.approvalStatus === 'Approved') {

      nextApproval = 'Pending Approval';

    }

    const updated: LeadHandoverData = {

      ...data,

      handoverStatus: newStatus,

      approvalStatus: nextApproval,

      status: newStatus === 'Completed' ? 'Handover Completed' : 'In Progress',

    };

    setData(updated);

    onUpdateHandover(updated);

    notifications.show({

      title: 'Handover Status Updated',

      message: `Status changed to ${newStatus}`,

      color: getHandoverStatusColor(newStatus),

    });

  };



  // Save changes from Edit Modal

  const handleSaveEdit = () => {

    setData(editForm);

    onUpdateHandover(editForm);

    setEditModalOpen(false);

    notifications.show({

      title: 'Handover Updated',

      message: 'Handover details updated successfully.',

      color: 'blue',

    });

  };



  // Handle Files Selected from Modal Dropzone

  const handleModalFilesChange = (files: FileList | File[] | null) => {

    if (!files) return;

    const fileArray = Array.from(files);

    if (fileArray.length === 0) return;



    const newPending: UploadPendingFile[] = [];



    fileArray.forEach((file) => {

      if (file.size > 25 * 1024 * 1024) {

        notifications.show({

          title: 'File Too Large',

          message: `${file.name} exceeds 25MB limit.`,

          color: 'red',

        });

        return;

      }



      const pendingItem: UploadPendingFile = {

        file,

        name: file.name,

        size: formatFileSize(file.size),

        type: detectFileType(file.name),

      };



      const reader = new FileReader();

      reader.onload = () => {

        pendingItem.dataUrl = reader.result as string;

      };

      reader.readAsDataURL(file);



      newPending.push(pendingItem);

    });



    setSelectedUploadFiles((prev) => [...prev, ...newPending]);

    if (modalFileInputRef.current) {

      modalFileInputRef.current.value = '';

    }

  };



  // Remove a pending file from modal list

  const handleRemovePendingFile = (index: number) => {

    setSelectedUploadFiles((prev) => prev.filter((_, i) => i !== index));

  };



  // Confirm and attach uploaded files from modal

  const handleConfirmUpload = () => {

    if (selectedUploadFiles.length === 0 && !optionalDriveUrl.trim()) {

      notifications.show({

        title: 'Validation',

        message: 'Please choose at least one file or enter a drive link.',

        color: 'red',

      });

      return;

    }



    const newAttachments: HandoverAttachment[] = selectedUploadFiles.map((item, idx) => ({

      id: `doc-${Date.now()}-${idx}`,

      name: item.name,

      url: item.dataUrl || optionalDriveUrl.trim() || undefined,

      fileType: item.type,

      fileSize: item.size,

      uploadedAt: dayjs().format('DD-MM-YYYY'),

    }));



    if (selectedUploadFiles.length === 0 && optionalDriveUrl.trim()) {

      const url = optionalDriveUrl.trim();

      const extractedName = url.split('/').pop()?.split('?')[0] || 'Project Resource';

      const isExtPdf = extractedName.toLowerCase().endsWith('.pdf') || url.toLowerCase().includes('.pdf');

      newAttachments.push({

        id: `doc-${Date.now()}`,

        name: isExtPdf ? decodeURIComponent(extractedName) : 'Project Resource Link',

        url: url,

        fileType: isExtPdf ? 'PDF Document' : 'Cloud Resource',

        fileSize: 'Cloud Link',

        uploadedAt: dayjs().format('DD-MM-YYYY'),

      });

    }



    const updated = {

      ...data,

      documents: [...data.documents, ...newAttachments],

    };



    setData(updated);

    onUpdateHandover(updated);

    setSelectedUploadFiles([]);

    setOptionalDriveUrl('');

    setDocModalOpen(false);



    notifications.show({

      title: 'Upload Successful',

      message: `${newAttachments.length} document(s) attached to handover.`,

      color: 'teal',

    });

  };



  // Direct Card Upload Handler

  const handleDirectCardUpload = (files: FileList | File[] | null) => {

    if (!files) return;

    const fileArray = Array.from(files);

    if (fileArray.length === 0) return;



    fileArray.forEach((file, idx) => {

      if (file.size > 25 * 1024 * 1024) {

        notifications.show({

          title: 'File Too Large',

          message: `${file.name} exceeds 25MB limit.`,

          color: 'red',

        });

        return;

      }



      const reader = new FileReader();

      reader.onload = () => {

        const dataUrl = reader.result as string;

        const attachment: HandoverAttachment = {

          id: `doc-${Date.now()}-${idx}`,

          name: file.name,

          url: dataUrl,

          fileType: detectFileType(file.name),

          fileSize: formatFileSize(file.size),

          uploadedAt: dayjs().format('DD-MM-YYYY'),

        };



        setData((prev) => {

          const updatedDocs = [...prev.documents, attachment];

          const updatedData = { ...prev, documents: updatedDocs };

          onUpdateHandover(updatedData);

          return updatedData;

        });

      };

      reader.readAsDataURL(file);

    });



        if (cardFileInputRef.current) {
      cardFileInputRef.current.value = '';
    }
    if (detailsModalFileInputRef.current) {
      detailsModalFileInputRef.current.value = '';
    }



    notifications.show({

      title: 'Files Uploaded',

      message: `${fileArray.length} file(s) attached directly.`,

      color: 'teal',

    });

  };



  // Open or download file handler

  const handleDownloadOrOpenDoc = (doc: HandoverAttachment) => {

    if (!doc.url) return;

    if (doc.url.startsWith('data:') || doc.url.startsWith('blob:')) {

      const link = document.createElement('a');

      link.href = doc.url;

      link.download = doc.name;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

    } else {

      window.open(doc.url, '_blank');

    }

  };



  // Delete Document

  const handleDeleteDocument = (id: string) => {

    const updated = {

      ...data,

      documents: data.documents.filter((d) => d.id !== id),

    };

    setData(updated);

    onUpdateHandover(updated);

    notifications.show({

      title: 'Attachment Removed',

      message: 'Document deleted from handover.',

      color: 'gray',

    });

  };



  // Delete Comment

  const handleDeleteComment = (commentId: string) => {

    const updatedComments = data.comments.filter((c) => c.id !== commentId);

    const updated = {

      ...data,

      comments: updatedComments,

    };

    setData(updated);

    onUpdateHandover(updated);

    notifications.show({

      title: 'Comment Removed',

      message: 'Remark deleted.',

      color: 'gray',

    });

  };



  // Add Comment

  const handleAddComment = () => {

    if (!newCommentText.trim()) return;

    const newComment: HandoverCommentItem = {

      id: `c-${Date.now()}`,

      author: data.fromEmployee || 'User',

      role: 'Team Lead',

      text: newCommentText.trim(),

      createdAt: dayjs().format('DD-MM-YYYY HH:mm'),

    };

    const updated = {

      ...data,

      comments: [...data.comments, newComment],

    };

    setData(updated);

    onUpdateHandover(updated);

    setNewCommentText('');

    notifications.show({

      title: 'Comment Posted',

      message: 'Your comment has been added to the handover record.',

      color: 'blue',

    });

  };



  // Priority badge styling

  const getPriorityColor = (priority: string) => {

    switch (priority?.toLowerCase()) {

      case 'critical':

        return 'red';

      case 'high':

        return 'orange';

      case 'medium':

        return 'blue';

      case 'low':

        return 'gray';

      default:

        return 'blue';

    }

  };



  // Approval Status badge styling

  const getApprovalColor = (status: string) => {

    switch (status) {

      case 'Approved':

        return 'teal';

      case 'Pending Approval':

        return 'yellow';

      case 'Revision Requested':

        return 'orange';

      case 'Rejected':

        return 'red';

      default:

        return 'gray';

    }

  };



  // Handover Status badge styling

  const getHandoverStatusColor = (status: string) => {

    switch (status) {

      case 'Completed':

        return 'teal';

      case 'In Progress':

        return 'blue';

      case 'Submitted':

        return 'indigo';

      case 'Draft':

        return 'gray';

      case 'On Hold':

        return 'red';

      default:

        return 'blue';

    }

  };



  // Employee options for dropdowns

  const employeeOptions = useMemo(() => {

    const list = employees.map((emp) => ({

      value: emp.name,

      label: `${emp.name} (${emp.designation || emp.role || 'Staff'})`,

    }));

    if (!list.some((o) => o.value.toLowerCase().includes('santhosh'))) {

      list.unshift({ value: 'santhosh', label: 'santhosh (Project Manager)' });

    }

    return list;

  }, [employees]);



  const toOptions = useMemo(() => {

    const list = [...employeeOptions];

    if (lead.name) {

      list.unshift({

        value: `${lead.name} (${lead.companyName || 'Client Rep'})`,

        label: `${lead.name} (${lead.companyName || 'Client Rep'})`,

      });

    }

    return list;

  }, [employeeOptions, lead]);



  // Step index resolution helpers

  const getApprovalStepIndex = (status: string) => {

    const s = (status || '').toLowerCase();

    if (s.includes('init') || s.includes('draft') || s.includes('pend')) return 0;

    if (s.includes('review') || s.includes('revis')) return 1;

    if (s.includes('approv') && !s.includes('pend')) return 2;

    if (s.includes('complete') || s.includes('close')) return 3;

    return 0;

  };



  const getHandoverStepIndex = (status: string) => {

    const s = (status || '').toLowerCase();

    if (s.includes('prog') || s.includes('draft')) return 0;

    if (s.includes('test') || s.includes('submit')) return 1;

    if (s.includes('live') || s.includes('deploy')) return 2;

    if (s.includes('close') || s.includes('complet')) return 3;

    return 0;

  };



  const handleApprovalStepClick = (stepName: string) => {

    let mapped = stepName;

    if (stepName === 'Initiated') mapped = 'Pending Approval';

    else if (stepName === 'Review') mapped = 'Revision Requested';

    else if (stepName === 'Approval') mapped = 'Approved';

    else if (stepName === 'Completed') mapped = 'Approved';

    handleUpdateApprovalStatus(mapped);

  };



  const handleHandoverStepClick = (stepName: string) => {

    let mapped = stepName;

    if (stepName === 'Closed') mapped = 'Completed';

    handleUpdateHandoverStatus(mapped);

  };



  // Connected Pipeline Ribbon Stage Definitions

  const approvalPipelineStages = [

    {

      name: 'Initiated',

      label: 'Initiated',

      icon: IconSend,

      desc: 'Package initialized, documents & deliverables attached.',

    },

    {

      name: 'Review',

      label: 'Review',

      icon: IconEye,

      desc: 'Technical & operational assessment in progress.',

    },

    {

      name: 'Approval',

      label: 'Approval',

      icon: IconShieldCheck,

      desc: 'Managerial sign-off & client authorization granted.',

    },

    {

      name: 'Completed',

      label: 'Completed',

      icon: IconCircleCheckFilled,

      desc: 'All approval criteria satisfied and finalized.',

    },

  ];



  const handoverPipelineStages = [

    {

      name: 'In Progress',

      label: 'In Progress',

      icon: IconClock,

      desc: 'Operational checklist & transition activities underway.',

    },

    {

      name: 'Testing',

      label: 'Testing',

      icon: IconFileCheck,

      desc: 'UAT verification, deliverables validation & staging checks.',

    },

    {

      name: 'Go Live',

      label: 'Go Live',

      icon: IconRocket,

      desc: 'Production deployment & live operations handover.',

    },

    {

      name: 'Closed',

      label: 'Closed',

      icon: IconCircleCheckFilled,

      desc: 'Handover complete — client has taken full ownership.',

    },

  ];



  // Modern Salesforce/Linear Connected Pipeline Ribbon Renderer

  const renderPipelineRibbon = (

    stages: Array<{ name: string; label: string; icon: any; desc: string }>,

    activeIdx: number,

    onStepClick: (stepName: string) => void,

    isApproval: boolean = false

  ) => {

    const currentStage = stages[activeIdx] || stages[0];

    const canAdvance = activeIdx < stages.length - 1;

    const nextStage = canAdvance ? stages[activeIdx + 1] : null;



    return (

      <Stack gap={10} mt="xs">

        {/* Connected Chevron Pipeline Ribbon Track */}

        <Box

          style={{

            display: 'flex',

            alignItems: 'stretch',

            width: '100%',

            borderRadius: 10,

            overflow: 'hidden',

            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : '#F1F5F9',

            padding: 3,

            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',

            gap: 3,

          }}

        >

          {stages.map((stage, idx) => {

            const isActive = idx === activeIdx;

            const isCompleted = idx < activeIdx;

            const isFirst = idx === 0;

            const isLast = idx === stages.length - 1;

            const StageIcon = stage.icon;



            const clipPath = isFirst

              ? 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)'

              : isLast

              ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%)'

              : 'polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)';



            let bg = isDark ? '#1E293B' : '#FFFFFF';

            let textColor = isDark ? '#94A3B8' : '#64748B';

            let iconColor = isDark ? '#64748B' : '#94A3B8';

            let fontWeight = 500;

            let shadow = 'none';



            if (isActive) {

              bg = isApproval && data.approvalStatus === 'Revision Requested'

                ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'

                : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)';

              textColor = '#FFFFFF';

              iconColor = '#FFFFFF';

              fontWeight = 700;

              shadow = '0 3px 10px rgba(37, 99, 235, 0.35)';

            } else if (isCompleted) {

              bg = isDark ? 'rgba(16, 185, 129, 0.22)' : '#DCFCE7';

              textColor = isDark ? '#34D399' : '#15803D';

              iconColor = isDark ? '#34D399' : '#16A34A';

              fontWeight = 600;

            }



            return (

              <Box

                key={stage.name}

                onClick={() => onStepClick(stage.name)}

                style={{

                  flex: 1,

                  height: 38,

                  display: 'flex',

                  alignItems: 'center',

                  justifyContent: 'center',

                  padding: isFirst ? '0 14px 0 10px' : isLast ? '0 10px 0 16px' : '0 12px 0 16px',

                  background: bg,

                  clipPath: clipPath,

                  cursor: 'pointer',

                  transition: 'all 0.18s ease',

                  boxShadow: shadow,

                  userSelect: 'none',

                }}

              >

                <Group gap={6} align="center" wrap="nowrap">

                  {isCompleted ? (

                    <Box

                      style={{

                        width: 17,

                        height: 17,

                        borderRadius: '50%',

                        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#BBF7D0',

                        display: 'flex',

                        alignItems: 'center',

                        justifyContent: 'center',

                        color: iconColor,

                        flexShrink: 0,

                      }}

                    >

                      <IconCheck size={11} stroke={3} />

                    </Box>

                  ) : isActive ? (

                    <Box

                      style={{

                        width: 17,

                        height: 17,

                        borderRadius: '50%',

                        backgroundColor: 'rgba(255, 255, 255, 0.25)',

                        display: 'flex',

                        alignItems: 'center',

                        justifyContent: 'center',

                        color: '#FFFFFF',

                        flexShrink: 0,

                      }}

                    >

                      <StageIcon size={11} stroke={2.5} />

                    </Box>

                  ) : (

                    <Box

                      style={{

                        width: 17,

                        height: 17,

                        borderRadius: '50%',

                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',

                        display: 'flex',

                        alignItems: 'center',

                        justifyContent: 'center',

                        color: isDark ? '#94A3B8' : '#64748B',

                        fontSize: 10,

                        fontWeight: 700,

                        flexShrink: 0,

                      }}

                    >

                      {idx + 1}

                    </Box>

                  )}

                  <Text

                    size="11.5px"

                    fw={fontWeight}

                    style={{

                      color: textColor,

                      whiteSpace: 'nowrap',

                      letterSpacing: '-0.01em',

                    }}

                  >

                    {stage.label}

                  </Text>

                </Group>

              </Box>

            );

          })}

        </Box>



        {/* Dynamic Context Micro-Bar with 1-Click Advance */}

        <Paper

          p="xs"

          radius="md"

          style={{

            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',

            border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #E2E8F0',

          }}

        >

          <Group justify="space-between" align="center" wrap="nowrap">

            <Group gap={8} align="center" style={{ minWidth: 0, flex: 1 }}>

              <Box

                style={{

                  width: 8,

                  height: 8,

                  borderRadius: '50%',

                  backgroundColor: activeIdx === 3 ? '#10B981' : '#2563EB',

                  boxShadow: activeIdx === 3

                    ? '0 0 8px rgba(16, 185, 129, 0.6)'

                    : '0 0 8px rgba(37, 99, 235, 0.6)',

                  flexShrink: 0,

                }}

              />

              <Text size="11px" c="dimmed" truncate style={{ flex: 1 }}>

                <Text span fw={700} c={isDark ? '#F1F5F9' : '#0F172A'}>

                  {currentStage.name}:{' '}

                </Text>

                {currentStage.desc}

              </Text>

            </Group>



            {canAdvance && nextStage && (

              <Button

                size="compact-xs"

                variant="light"

                color={isApproval ? 'teal' : 'blue'}

                radius="md"

                rightSection={<IconArrowRight size={11} />}

                onClick={() => onStepClick(nextStage.name)}

                style={{

                  fontWeight: 600,

                  fontSize: 11,

                  height: 24,

                  padding: '0 10px',

                  flexShrink: 0,

                }}

              >

                Advance to {nextStage.name}

              </Button>

            )}



            {!canAdvance && (

              <Badge

                size="sm"

                variant="light"

                color="teal"

                radius="md"

                leftSection={<IconCheck size={11} stroke={3} />}

                style={{ flexShrink: 0, fontWeight: 700 }}

              >

                Finalized

              </Badge>

            )}

          </Group>

        </Paper>

      </Stack>

    );

  };



  return (

    <Box>

      {/* Top Header Summary & Actions */}

      <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="md">

        <div>

          <Group gap="xs" align="center">

            <Text fw={800} size="18px" style={{ color: isDark ? '#F8FAFC' : '#111827' }}>

              Handover

            </Text>

            <Badge size="sm" variant="light" color="teal" radius="sm">

              {handedOverModules.length} {handedOverModules.length === 1 ? 'Deliverable' : 'Deliverables'}

            </Badge>

          </Group>

          <Text size="xs" c="dimmed">

            Manage delivered project modules, completion status, and client sign-off for {lead.name}.

          </Text>

        </div>



        <Group gap="sm" wrap="wrap">

          <Button

            size="sm"

            variant="light"

            color="blue"

            leftSection={<IconArrowLeft size={14} />}

            onClick={() => onNavigateSection('progress')}

            style={{ borderRadius: 10, fontWeight: 700 }}

          >

            Select in Progress

          </Button>

        </Group>

      </Group>



      {/* Main Handover Deliverables Table */}

      {handedOverModules.length === 0 ? (

        <Paper

          p="xl"

          radius="lg"

          style={{

            background: isDark ? '#111827' : '#FFFFFF',

            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',

            textAlign: 'center',

          }}

        >

          <Center py={40}>

            <Stack align="center" gap="xs" style={{ maxWidth: 420 }}>

              <Box

                style={{

                  width: 52,

                  height: 52,

                  borderRadius: 14,

                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',

                  display: 'flex',

                  alignItems: 'center',

                  justifyContent: 'center',

                  color: '#10B981',

                }}

              >

                <IconListCheck size={28} />

              </Box>

              <Text fw={700} size="md" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>

                No Handover Deliverables Yet

              </Text>

              <Text size="xs" c="dimmed">

                Go to the Progress section, select deliverable modules or projects using the select boxes, and click "Proceed to Handover".

              </Text>

              <Group gap="xs" mt="sm">

                <Button

                  size="xs"

                  color="blue"

                  rightSection={<IconArrowRight size={14} />}

                  onClick={() => onNavigateSection('progress')}

                >

                  Go to Progress Section

                </Button>

              </Group>

            </Stack>

          </Center>

        </Paper>

      ) : (

        <Paper

          radius="lg"

          style={{

            background: isDark ? '#111827' : '#FFFFFF',

            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',

            overflow: 'hidden',

          }}

        >

          <Table.ScrollContainer minWidth={920}>

            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>

              <Table.Thead

                style={{

                  background: isDark ? '#0F172A' : '#F8FAFC',

                  borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',

                }}

              >

                <Table.Tr>

                  <Table.Th style={{ width: 44, color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>#</Table.Th>

                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>DELIVERABLE / MODULE</Table.Th>

                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>PROJECT</Table.Th>

                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>ASSIGNED TO</Table.Th>

                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>DEADLINE</Table.Th>

                  <Table.Th style={{ minWidth: 160, color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>PROGRESS</Table.Th>

                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>MODULE STATUS</Table.Th>

                  <Table.Th style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>HANDOVER STATUS</Table.Th>

                  <Table.Th style={{ width: 60, textAlign: 'right', color: isDark ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 700 }}>ACTIONS</Table.Th>

                </Table.Tr>

              </Table.Thead>

              <Table.Tbody>

                {handedOverModules.map((item, index) => {
                  const isAccepted = item.handoverStatus === 'Accepted' || item.handoverStatus === 'Accepted & Signed Off';
                  const isReady = item.handoverStatus === 'Ready for Handover';
                  return (
                    <Table.Tr
                      key={item.id || index}
                      onClick={() => setSelectedDeliverableForDetails(item)}
                      style={{
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* 1. Index */}
                      <Table.Td>
                        <Box
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: isAccepted
                              ? '#10B981'
                              : isDark ? '#1E293B' : '#F1F5F9',
                            color: isAccepted ? '#FFFFFF' : '#64748B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 750,
                            fontSize: 11,
                          }}
                        >
                          {isAccepted ? <IconCheck size={13} stroke={3} /> : index + 1}
                        </Box>
                      </Table.Td>

                      {/* 2. Deliverable / Module Name */}
                      <Table.Td>
                        <Group gap={6} align="center">
                          <Text fw={700} size="xs" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                            {item.name}
                          </Text>
                          {item.projectCode && (
                            <Badge size="xs" variant="filled" color="blue" radius="sm">
                              {item.projectCode}
                            </Badge>
                          )}
                        </Group>
                      </Table.Td>

                      {/* 3. Project Name */}
                      <Table.Td>
                        <Text size="xs" fw={500} style={{ color: isDark ? '#E2E8F0' : '#334155' }}>
                          {item.projectName || '—'}
                        </Text>
                      </Table.Td>

                      {/* 4. Assigned To */}
                      <Table.Td>
                        <Group gap={4} wrap="nowrap">
                          <IconUser size={13} color="#64748B" />
                          <Text size="xs" style={{ color: isDark ? '#E2E8F0' : '#334155' }}>
                            {item.assignedTo || 'Unassigned'}
                          </Text>
                        </Group>
                      </Table.Td>

                      {/* 5. Deadline */}
                      <Table.Td>
                        <Group gap={4} wrap="nowrap">
                          <IconCalendar size={13} color="#64748B" />
                          <Text size="xs" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                            {item.deadline || '—'}
                          </Text>
                        </Group>
                      </Table.Td>

                      {/* 6. Progress Bar */}
                      <Table.Td>
                        <Box style={{ width: '100%', minWidth: 140 }}>
                          <Group justify="space-between" mb={3}>
                            <Text size="11px" fw={700} style={{ color: (item.progress || 0) === 100 ? '#10B981' : isDark ? '#E2E8F0' : '#1E293B' }}>
                              {item.progress || 0}% Completed
                            </Text>
                          </Group>
                          <Progress
                            value={item.progress || 0}
                            size="sm"
                            radius="xl"
                            color={(item.progress || 0) === 100 ? 'teal' : 'blue'}
                          />
                        </Box>
                      </Table.Td>

                      {/* 7. Module Status */}
                      <Table.Td>
                        <Badge
                          size="xs"
                          variant="light"
                          color={(item.status || '').toLowerCase().includes('complete') ? 'teal' : 'blue'}
                          radius="sm"
                          style={{ fontWeight: 650 }}
                        >
                          {item.status || 'In Progress'}
                        </Badge>
                      </Table.Td>

                      {/* 8. Handover Status (Menu dropdown to update status) */}
                      <Table.Td>
                        <Menu shadow="md" width={180} position="bottom-end">
                          <Menu.Target>
                            <Badge
                              size="sm"
                              variant={isAccepted ? 'filled' : 'light'}
                              color={isAccepted ? 'teal' : isReady ? 'blue' : 'orange'}
                              radius="sm"
                              style={{ fontWeight: 700, cursor: 'pointer' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item.handoverStatus || 'Ready for Handover'}
                            </Badge>
                          </Menu.Target>
                          <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                            <Menu.Label>Update Handover Status</Menu.Label>
                            <Menu.Item
                              leftSection={<IconCheck size={14} color="#10B981" />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateItemHandoverStatus(item.id, 'Accepted');
                              }}
                            >
                              Accepted & Signed Off
                            </Menu.Item>
                            <Menu.Item
                              leftSection={<IconClock size={14} color="#3B82F6" />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateItemHandoverStatus(item.id, 'Ready for Handover');
                              }}
                            >
                              Ready for Handover
                            </Menu.Item>
                            <Menu.Item
                              leftSection={<IconFileCheck size={14} color="#F59E0B" />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateItemHandoverStatus(item.id, 'Pending Verification');
                              }}
                            >
                              Pending Verification
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Table.Td>

                      {/* 9. Actions */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <Tooltip label="View Details" withArrow>
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="blue"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDeliverableForDetails(item);
                              }}
                            >
                              <IconEye size={14} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label={isAccepted ? 'Mark as Ready' : 'Mark as Accepted'} withArrow>
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color={isAccepted ? 'teal' : 'gray'}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateItemHandoverStatus(item.id, isAccepted ? 'Ready for Handover' : 'Accepted');
                              }}
                            >
                              <IconCheck size={14} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Remove deliverable" withArrow>
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="red"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveHandoverItem(item.id);
                              }}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>

            </Table>

          </Table.ScrollContainer>

        </Paper>

      )}

      {/* ========================================================================= */}
      {/* HANDOVER DETAILS POPUP MODAL (Sections A to E)                            */}
      {/* ========================================================================= */}
      <Modal
        opened={!!selectedDeliverableForDetails}
        onClose={() => setSelectedDeliverableForDetails(null)}
        size="880px"
        radius="lg"
        centered
        withCloseButton={false}
        styles={{
          content: {
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E2E8F0',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
          },
          body: {
            padding: '24px 28px',
            maxHeight: 'calc(92vh - 20px)',
            overflowY: 'auto',
          },
        }}
      >
        {selectedDeliverableForDetails && (
          <Stack gap="lg">
            {/* Modal Header */}
            <Group justify="space-between" align="flex-start">
              <Group gap="sm">
                <ThemeIcon size="xl" radius="md" color="teal" variant="light">
                  <IconClipboardCheck size={26} />
                </ThemeIcon>
                <div>
                  <Group gap="xs" align="center">
                    <Text fw={800} size="lg" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                      {selectedDeliverableForDetails.name}
                    </Text>
                    {selectedDeliverableForDetails.projectCode && (
                      <Badge size="xs" color="blue" variant="filled">
                        {selectedDeliverableForDetails.projectCode}
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed" mt={2}>
                    Handover Details & Specifications • {selectedDeliverableForDetails.projectName || activeProject?.name || 'CRM'}
                  </Text>
                </div>
              </Group>

              <Group gap="xs" align="center">
                <Badge
                  size="sm"
                  variant="light"
                  color={selectedDeliverableForDetails.progress === 100 ? 'teal' : 'blue'}
                >
                  {selectedDeliverableForDetails.progress || 0}% Completed
                </Badge>
                <Badge
                  size="sm"
                  variant="filled"
                  color={
                    selectedDeliverableForDetails.handoverStatus === 'Accepted'
                      ? 'teal'
                      : selectedDeliverableForDetails.handoverStatus === 'Ready for Handover'
                      ? 'blue'
                      : 'orange'
                  }
                >
                  {selectedDeliverableForDetails.handoverStatus || 'Ready for Handover'}
                </Badge>
                <ActionIcon
                  size="md"
                  variant="subtle"
                  color="gray"
                  onClick={() => setSelectedDeliverableForDetails(null)}
                >
                  <IconX size={18} />
                </ActionIcon>
              </Group>
            </Group>

            <Divider color={isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9'} />

            {/* A. Lead Information */}
            <Paper
              p="md"
              radius="md"
              style={{
                background: isDark ? '#1F2937' : '#F8FAFC',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              }}
            >
              <Group gap="xs" mb="sm">
                <ThemeIcon size="sm" radius="sm" color="blue" variant="light">
                  <IconUser size={14} />
                </ThemeIcon>
                <Text fw={750} size="sm" style={{ color: isDark ? '#F1F5F9' : '#0F172A', letterSpacing: '0.3px' }}>
                  A. Lead Information
                </Text>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Lead Name
                  </Text>
                  <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                    {lead.name || '—'}
                  </Text>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Company Name
                  </Text>
                  <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                    {lead.companyName || lead.displayCompany || '—'}
                  </Text>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Contact Person
                  </Text>
                  <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                    {lead.name || (lead as any).contactPerson || '—'}
                  </Text>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Email
                  </Text>
                  <Group gap={4} mt={2}>
                    <IconMail size={13} color="#64748B" />
                    <Text size="sm" fw={600} style={{ color: isDark ? '#60A5FA' : '#2563EB' }}>
                      {lead.email || '—'}
                    </Text>
                  </Group>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Phone Number
                  </Text>
                  <Group gap={4} mt={2}>
                    <IconPhone size={13} color="#64748B" />
                    <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }}>
                      {lead.phone || '—'}
                    </Text>
                  </Group>
                </Box>
              </SimpleGrid>
            </Paper>

            {/* B. Sales Information */}
            <Paper
              p="md"
              radius="md"
              style={{
                background: isDark ? '#1F2937' : '#F8FAFC',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              }}
            >
              <Group gap="xs" mb="sm">
                <ThemeIcon size="sm" radius="sm" color="violet" variant="light">
                  <IconReceipt size={14} />
                </ThemeIcon>
                <Text fw={750} size="sm" style={{ color: isDark ? '#F1F5F9' : '#0F172A', letterSpacing: '0.3px' }}>
                  B. Sales Information
                </Text>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Sales Owner
                  </Text>
                  <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                    {lead.assignedToName || lead.assignedTo || activeContract?.assignedToName || activeContract?.assignedTo || 'Ramesh Kumar'}
                  </Text>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Final Quotation
                  </Text>
                  <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                    {activeQuotation?.quotationNumber ? `${activeQuotation.quotationNumber}${activeQuotation.grandTotal ? ` (₹${Number(activeQuotation.grandTotal).toLocaleString('en-IN')})` : ''}` : (activeContract?.quotationNumber || 'QT-2026-001')}
                  </Text>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Contract ID
                  </Text>
                  <Badge size="xs" variant="light" color="blue" style={{ fontFamily: 'monospace', marginTop: 4 }}>
                    {activeContract?.contractId || activeContract?.id || 'CNT-2026-5038'}
                  </Badge>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Contract Value
                  </Text>
                  <Text size="sm" fw={750} style={{ color: '#10B981' }} mt={2}>
                    {activeContract?.contractValue ? `₹${Number(activeContract.contractValue).toLocaleString('en-IN')}` : (activeContract?.finalContractAmount ? `₹${Number(activeContract.finalContractAmount).toLocaleString('en-IN')}` : '₹2,80,000')}
                  </Text>
                </Box>
                <Box style={{ gridColumn: 'span 2' }}>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Payment Terms
                  </Text>
                  <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                    {activeContract?.paymentDueTerms || activeContract?.customPaymentDueTerms || (activeContract?.advancePaymentAmount ? `Advance ₹${Number(activeContract.advancePaymentAmount).toLocaleString('en-IN')} + Milestone Delivery` : null) || 'Net 15 Days (Advance 30%, Delivery 70%)'}
                  </Text>
                </Box>
              </SimpleGrid>
            </Paper>

            {/* C. Project Information */}
            <Paper
              p="md"
              radius="md"
              style={{
                background: isDark ? '#1F2937' : '#F8FAFC',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              }}
            >
              <Group gap="xs" mb="sm">
                <ThemeIcon size="sm" radius="sm" color="cyan" variant="light">
                  <IconBox size={14} />
                </ThemeIcon>
                <Text fw={750} size="sm" style={{ color: isDark ? '#F1F5F9' : '#0F172A', letterSpacing: '0.3px' }}>
                  C. Project Information
                </Text>
              </Group>
              <Stack gap="xs">
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  <Box>
                    <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                      Project Name
                    </Text>
                    <Text size="sm" fw={700} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                      {selectedDeliverableForDetails.projectName || activeProject?.name || progress?.projectName || 'CRM'}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                      Project Start Date
                    </Text>
                    <Group gap={4} mt={2}>
                      <IconCalendar size={13} color="#64748B" />
                      <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }}>
                        {activeProject?.startDate || activeContract?.startDate || '01-09-2026'}
                      </Text>
                    </Group>
                  </Box>
                  <Box>
                    <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                      Expected Completion Date
                    </Text>
                    <Group gap={4} mt={2}>
                      <IconCalendar size={13} color="#64748B" />
                      <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }}>
                        {selectedDeliverableForDetails.deadline || activeProject?.targetEndDate || activeContract?.endDate || progress?.targetDeliveryDate || '09-07-2027'}
                      </Text>
                    </Group>
                  </Box>
                </SimpleGrid>

                <Box mt={2}>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Project Scope
                  </Text>
                  <Text size="sm" style={{ color: isDark ? '#E2E8F0' : '#334155', lineHeight: 1.5 }} mt={2}>
                    {activeContract?.scopeOfWork || (activeProject as any)?.scope || 'Complete full-stack implementation, UI design, database architecture, modules implementation, UAT, and production handover.'}
                  </Text>
                </Box>

                <Box mt={2}>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Deliverables
                  </Text>
                  <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                    {activeProject?.modules && activeProject.modules.length > 0
                      ? activeProject.modules.map((m: any) => m.name).join(', ')
                      : handedOverModules.length > 0
                      ? handedOverModules.map((m) => m.name).join(', ')
                      : selectedDeliverableForDetails.name || 'Contact, Lead, Activity Logs'}
                  </Text>
                </Box>
              </Stack>
            </Paper>

            {/* D. Team Assignment */}
            <Paper
              p="md"
              radius="md"
              style={{
                background: isDark ? '#1F2937' : '#F8FAFC',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              }}
            >
              <Group gap="xs" mb="sm">
                <ThemeIcon size="sm" radius="sm" color="orange" variant="light">
                  <IconUsers size={14} />
                </ThemeIcon>
                <Text fw={750} size="sm" style={{ color: isDark ? '#F1F5F9' : '#0F172A', letterSpacing: '0.3px' }}>
                  D. Team Assignment
                </Text>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Project TL
                  </Text>
                  <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                    {activeProject?.projectManagerName || progress?.projectManager || data.fromEmployee || 'Santhosh (TL)'}
                  </Text>
                </Box>
                <Box>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Handover Assigned By
                  </Text>
                  <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                    {data.fromEmployee || lead.createdByName || lead.assignedToName || 'Admin / Project TL'}
                  </Text>
                </Box>
                <Box style={{ gridColumn: 'span 2' }}>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Team Members
                  </Text>
                  <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                    {activeProject?.teamMembers && activeProject.teamMembers.length > 0
                      ? activeProject.teamMembers.join(', ')
                      : activeProject?.teamDetails && activeProject.teamDetails.length > 0
                      ? activeProject.teamDetails.map((t: any) => t.employeeName || t.name).join(', ')
                      : (selectedDeliverableForDetails.assignedTo ? `${selectedDeliverableForDetails.assignedTo}, Arun (Frontend), Divya (Backend)` : 'Santhosh (TL), Arun (Frontend), Divya (Backend)')}
                  </Text>
                </Box>
              </SimpleGrid>
            </Paper>

            {/* E. Handover Information */}
            <Paper
              p="md"
              radius="md"
              style={{
                background: isDark ? '#1F2937' : '#F8FAFC',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              }}
            >
              <Group gap="xs" mb="sm">
                <ThemeIcon size="sm" radius="sm" color="teal" variant="light">
                  <IconFileCheck size={14} />
                </ThemeIcon>
                <Text fw={750} size="sm" style={{ color: isDark ? '#F1F5F9' : '#0F172A', letterSpacing: '0.3px' }}>
                  E. Handover Information
                </Text>
              </Group>
              <Stack gap="xs">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <Box>
                    <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                      Handover Date
                    </Text>
                    <Group gap={4} mt={2}>
                      <IconCalendar size={13} color="#64748B" />
                      <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }}>
                        {data.handoverDate || selectedDeliverableForDetails.transferredAt || dayjs().format('DD-MM-YYYY')}
                      </Text>
                    </Group>
                  </Box>
                  <Box>
                    <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                      Pending Items
                    </Text>
                    <Text size="sm" fw={600} style={{ color: isDark ? '#F8FAFC' : '#1E293B' }} mt={2}>
                      {data.pendingTasks || (selectedDeliverableForDetails.progress && selectedDeliverableForDetails.progress < 100 ? `${100 - selectedDeliverableForDetails.progress}% remaining implementation` : 'None - All items completed and verified')}
                    </Text>
                  </Box>
                </SimpleGrid>


                <Box mt={2}>
                  <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                    Important Client Requirements
                  </Text>
                  <Text size="sm" style={{ color: isDark ? '#E2E8F0' : '#334155', lineHeight: 1.5 }} mt={2}>
                    {lead.notes || lead.agenda || (lead.productList?.length ? `Required Modules: ${lead.productList.join(', ')}` : '') || 'Ensured mobile responsive design, high performance REST API responses, and encrypted data storage.'}
                  </Text>
                </Box>

                <Box mt={4}>
                  <Group justify="space-between" align="center" mb="xs">
                    <Text size="11px" c="dimmed" fw={600} style={{ textTransform: 'uppercase' }}>
                      Attachments / Documents ({data.documents?.length || 0})
                    </Text>
                    <Button
                      size="xs"
                      variant="light"
                      color="teal"
                      leftSection={<IconUpload size={14} />}
                      onClick={() => detailsModalFileInputRef.current?.click()}
                    >
                      Upload Attachments
                    </Button>
                  </Group>

                  {/* Hidden file input for details modal upload */}
                  <input
                    type="file"
                    ref={detailsModalFileInputRef}
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleDirectCardUpload(e.target.files);
                        e.target.value = '';
                      }
                    }}
                  />

                  {/* Interactive Drag & Drop / Click Upload Box */}
                  <Paper
                    p="sm"
                    radius="md"
                    mb="xs"
                    onClick={() => detailsModalFileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDetailsDraggingOver(true);
                    }}
                    onDragLeave={() => setIsDetailsDraggingOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDetailsDraggingOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleDirectCardUpload(e.dataTransfer.files);
                      }
                    }}
                    style={{
                      border: `1.5px dashed ${isDetailsDraggingOver ? '#10B981' : isDark ? 'rgba(255, 255, 255, 0.18)' : '#CBD5E1'}`,
                      backgroundColor: isDetailsDraggingOver
                        ? isDark ? 'rgba(16, 185, 129, 0.12)' : '#F0FDF4'
                        : isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Group justify="center" gap="sm">
                      <ThemeIcon size="md" radius="xl" variant="light" color={isDetailsDraggingOver ? 'teal' : 'blue'}>
                        <IconCloudUpload size={18} />
                      </ThemeIcon>
                      <Box style={{ textAlign: 'left' }}>
                        <Text size="xs" fw={650} style={{ color: isDark ? '#F1F5F9' : '#1E293B' }}>
                          Click to browse or drag & drop files here to upload
                        </Text>
                        <Text size="10px" c="dimmed">
                          PDF, Word, Excel, Images, Code, ZIP (Up to 25MB each)
                        </Text>
                      </Box>
                    </Group>
                  </Paper>

                  {/* Attachments List */}
                  {data.documents && data.documents.length > 0 ? (
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                      {data.documents.map((doc) => (
                        <Paper
                          key={doc.id}
                          p="xs"
                          radius="sm"
                          style={{
                            background: isDark ? '#111827' : '#FFFFFF',
                            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Group gap="xs" style={{ overflow: 'hidden' }}>
                            <ThemeIcon size="sm" variant="light" color="blue" radius="sm">
                              <IconFileText size={12} />
                            </ThemeIcon>
                            <Box style={{ overflow: 'hidden' }}>
                              <Text size="xs" fw={600} truncate style={{ color: isDark ? '#F1F5F9' : '#1E293B' }}>
                                {doc.name}
                              </Text>
                              <Text size="10px" c="dimmed">
                                {doc.fileType || 'Document'} • {doc.fileSize || 'Active'}
                              </Text>
                            </Box>
                          </Group>
                          <Group gap={4} wrap="nowrap">
                            <Tooltip label="Open / Download" withArrow>
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                color="blue"
                                onClick={() => handleDownloadOrOpenDoc(doc)}
                              >
                                <IconDownload size={13} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Remove Attachment" withArrow>
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                color="red"
                                onClick={() => handleDeleteDocument(doc.id)}
                              >
                                <IconTrash size={13} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Paper>
                      ))}
                    </SimpleGrid>
                  ) : (
                    <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
                      No document attachments uploaded yet. Use the upload box above to attach files.
                    </Text>
                  )}
                </Box>
              </Stack>
            </Paper>

            {/* Modal Footer */}
            <Group justify="flex-end" mt="sm">
              <Button
                variant="light"
                color="gray"
                onClick={() => setSelectedDeliverableForDetails(null)}
              >
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

    </Box>

  );
};

export default LeadHandoverSection;

