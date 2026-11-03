import React from 'react';
import { Box, Container, Drawer, Paper, Text, Button, useComputedColorScheme } from '@mantine/core';
import { IconShieldLock } from '@tabler/icons-react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { AnimatedCanvasBackdrop } from '../common/AnimatedCanvasBackdrop';
import { useCRM } from '../../context/CRMContext';
import { usePermissions } from '../../context/AccessControlContext';
import { DashboardPage } from '../../pages/DashboardPage';
import { EmployeeDashboard } from '../../pages/dashboard/EmployeeDashboard';
import { EmployeesPage, AddEmployeePage } from '../../pages/employees';
import { ContactsPage, AddContactPage, ContactDetailsPage, ContactQualificationPage } from '../../pages/contacts';
import { LeadsPage, LeadSchedulePage } from '../../pages/leads';
import { ProjectsPage, AddProjectPage, ProjectDetailsPage } from '../../pages/projects';
import { AccessControlPage } from '../../pages/access-control/AccessControlPage';
import { ScheduledMeetingsPage } from '../../pages/meetings';
import { CallLogsPage } from '../../pages/calls';
import { CustomersPage, CustomerDetailsPage } from '../../pages/customers';
import { SettingsPage } from '../../pages/settings';
import { BillingPage } from '../../pages/billing';
import { InvoicesPage, CreateInvoicePage, InvoiceDetailsPage } from '../../pages/invoices';
import { Invoice } from '../../types/billing';
import { LeadNegotiationSection, LeadContractSection } from '../../pages/leads/components/LeadDealSections';
import { AuthPage, SignupPage, LoginPage, ResetPasswordPage } from '../../pages/auth';
import { ActivityTimelinePage } from '../../pages/activity-timeline';
import { useContact } from '../../context/ContactContext';
import { useLead } from '../../context/LeadContext';
import { useProject } from '../../context/ProjectContext';
import { useCustomer } from '../../context/CustomerContext';

const AccessRestrictedView: React.FC<{ moduleName: string; onGoAllowed: () => void }> = ({
  moduleName,
  onGoAllowed,
}) => (
  <Container size="sm" py={80}>
    <Paper
      p="xl"
      radius="24px"
      withBorder
      style={{
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
      }}
    >
      <IconShieldLock size={56} color="#EF4444" style={{ margin: '0 auto 16px', opacity: 0.85 }} />
      <Text fw={800} size="xl">
        Access Restricted
      </Text>
      <Text size="sm" c="dimmed" mt="xs" mb="lg">
        You do not have permission to view the <b>{moduleName}</b> module. If you require access, please contact your administrator.
      </Text>
      <Button radius="100px" color="blue" onClick={onGoAllowed}>
        Go to Available Screen
      </Button>
    </Paper>
  </Container>
);

export const AppLayout: React.FC = () => {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const { activeNav, setActiveNav, sidebarMobileOpened, setSidebarMobileOpened, sidebarCollapsed } = useCRM();
  const { selectedContact, deleteContact } = useContact();
  const { isSuperAdmin, can } = usePermissions();
  const { selectedLead } = useLead();
  const { selectedProject, setSelectedProject, deleteProject: deleteProj, projects } = useProject();
  const { selectedCustomer, setSelectedCustomer, customers, deleteCustomer: deleteCust } = useCustomer();
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = React.useState<Invoice | null>(null);

  const findFirstAllowedNav = React.useCallback((): string => {
    const candidateModules: { nav: string; id: string }[] = [
      { nav: 'dashboard', id: 'dashboard' },
      { nav: 'employee-dashboard', id: 'employee_dashboard' },
      { nav: 'contacts', id: 'contacts' },
      { nav: 'leads', id: 'leads' },
      { nav: 'scheduled-meetings', id: 'scheduled_meetings' },
      { nav: 'call-logs', id: 'call_logs' },
      { nav: 'customers', id: 'customers' },
      { nav: 'projects', id: 'projects' },
      { nav: 'negotiations', id: 'negotiations' },
      { nav: 'invoices', id: 'invoices' },
      { nav: 'activity-timeline', id: 'activity_timeline' },
      { nav: 'employees', id: 'employee_management' },
      { nav: 'access-control', id: 'access_control' },
      { nav: 'settings', id: 'settings' },
    ];
    for (const m of candidateModules) {
      if (can(m.id, 'view')) return m.nav;
    }
    return isSuperAdmin ? 'dashboard' : 'employee-dashboard';
  }, [can, isSuperAdmin]);

  // Automatically redirect non-admin users to Employee Dashboard or their first permitted screen
  // (MUST be called before any conditional return to satisfy Rules of Hooks)
  React.useEffect(() => {
    if (activeNav === 'dashboard' && !isSuperAdmin && !can('dashboard', 'view')) {
      if (can('employee_dashboard', 'view')) {
        setActiveNav('employee-dashboard');
      } else {
        const allowed = findFirstAllowedNav();
        if (allowed && allowed !== 'dashboard') {
          setActiveNav(allowed);
        }
      }
    }
  }, [activeNav, isSuperAdmin, can, findFirstAllowedNav]);

  if (activeNav === 'signup') {
    return (
      <SignupPage
        onSuccess={() => setActiveNav('dashboard')}
        onSwitchToLogin={() => setActiveNav('login')}
      />
    );
  }

  if (activeNav === 'login') {
    return (
      <LoginPage
        onSuccess={() => {
          if (isSuperAdmin || can('dashboard', 'view')) {
            setActiveNav('dashboard');
          } else if (can('employee_dashboard', 'view')) {
            setActiveNav('employee-dashboard');
          } else {
            setActiveNav(findFirstAllowedNav());
          }
        }}
        onSwitchToSignup={() => setActiveNav('signup')}
      />
    );
  }

  if (activeNav === 'reset-password') {
    return (
      <ResetPasswordPage
        onSuccess={() => setActiveNav('login')}
        onBackToLogin={() => setActiveNav('login')}
      />
    );
  }

  if (activeNav === 'auth') {
    return <AuthPage onSuccess={() => setActiveNav('dashboard')} />;
  }

  const renderActiveScreen = () => {
    switch (activeNav) {
      case 'dashboard':
        if (!can('dashboard', 'view') && !isSuperAdmin) {
          if (can('employee_dashboard', 'view')) {
            return <EmployeeDashboard onNavigate={(nav) => setActiveNav(nav)} />;
          }
          return (
            <AccessRestrictedView
              moduleName="Dashboard"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        return <DashboardPage onNavigate={(nav) => setActiveNav(nav)} />;
      case 'employee-dashboard':
        if (!can('employee_dashboard', 'view')) {
          return (
            <AccessRestrictedView
              moduleName="Employee Dashboard"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        return <EmployeeDashboard onNavigate={(nav) => setActiveNav(nav)} />;
      case 'employees':
        if (!can('employee_management', 'view')) {
          return (
            <AccessRestrictedView
              moduleName="Employee Management"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        return <EmployeesPage />;
      case 'add-employee':
      case 'add':
      case 'onboard-employee':
      case 'onboard': {
        if (!can('employee_management', 'view')) {
          return (
            <AccessRestrictedView
              moduleName="Employee Management"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        let editData = null;
        try {
          const savedEdit = typeof window !== 'undefined' ? sessionStorage.getItem('crm_editing_employee') : null;
          if (savedEdit) editData = JSON.parse(savedEdit);
        } catch (e) {}

        return (
          <AddEmployeePage
            onBack={() => {
              if (typeof window !== 'undefined') sessionStorage.removeItem('crm_editing_employee');
              setActiveNav('employees');
            }}
            initialData={editData}
          />
        );
      }
      case 'contacts':
        if (!can('contacts', 'view')) {
          return (
            <AccessRestrictedView
              moduleName="Contacts"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        return <ContactsPage />;
      case 'leads':
      case 'lead':
        if (!can('leads', 'view')) {
          return (
            <AccessRestrictedView
              moduleName="Leads"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        return <LeadsPage />;
      case 'lead-schedule':
      case 'lead-details':
      case 'leads/schedule':
      case 'schedule-meeting': {
        let activeLead = selectedLead;
        let navSource: string | null = null;
        if (typeof window !== 'undefined') {
          try {
            if (!activeLead) {
              const saved = sessionStorage.getItem('crm_selected_lead');
              if (saved) activeLead = JSON.parse(saved);
            }
            navSource = sessionStorage.getItem('crm_lead_nav_source');
          } catch (e) {}
        }
        const handleBackFromSchedule = () => {
          if (navSource === 'activity-timeline') {
            setActiveNav('activity-timeline');
          } else {
            setActiveNav('leads');
          }
        };
        return (
          <LeadSchedulePage
            lead={activeLead}
            onBack={handleBackFromSchedule}
            onSuccess={handleBackFromSchedule}
          />
        );
      }
      case 'add-contact':
      case 'contacts/add': {
        let editData = null;
        try {
          const savedEdit = typeof window !== 'undefined' ? sessionStorage.getItem('crm_editing_contact') : null;
          if (savedEdit) editData = JSON.parse(savedEdit);
        } catch (e) {}

        return (
          <AddContactPage
            onBack={() => {
              if (typeof window !== 'undefined') sessionStorage.removeItem('crm_editing_contact');
              setActiveNav('contacts');
            }}
            initialData={editData}
          />
        );
      }
      case 'contact-details': {
        let activeContact = selectedContact;
        if (!activeContact && typeof window !== 'undefined') {
          try {
            const saved = sessionStorage.getItem('crm_selected_contact');
            if (saved) activeContact = JSON.parse(saved);
          } catch (e) {}
        }
        if (activeContact) {
          return (
            <ContactDetailsPage
              contact={activeContact}
              onBack={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.removeItem('crm_selected_contact');
                }
                setActiveNav('contacts');
              }}
              onEdit={(c) => {
                if (typeof window !== 'undefined') sessionStorage.setItem('crm_editing_contact', JSON.stringify(c));
                setActiveNav('add-contact');
              }}
              onDelete={async (c) => {
                await deleteContact(c.id);
                if (typeof window !== 'undefined') {
                  sessionStorage.removeItem('crm_selected_contact');
                }
                setActiveNav('contacts');
              }}
            />
          );
        }
        return <ContactsPage />;
      }
      case 'contact-qualification':
      case 'contacts/qualification':
      case 'contacts/qualify':
      case 'qualification': {
        let qualifyContact = null;
        if (typeof window !== 'undefined') {
          try {
            const saved = sessionStorage.getItem('crm_qualifying_contact');
            if (saved) qualifyContact = JSON.parse(saved);
          } catch (e) {}
        }
        if (!qualifyContact) {
          qualifyContact = selectedContact;
        }
        return (
          <ContactQualificationPage
            contact={qualifyContact}
            onBack={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('crm_qualifying_contact');
                sessionStorage.removeItem('crm_selected_contact');
              }
              setActiveNav('contacts');
            }}
            onSuccess={(_resultStatus) => {
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('crm_qualifying_contact');
                sessionStorage.removeItem('crm_selected_contact');
                localStorage.setItem('crm_contacts_tab', 'ASSIGNED');
                sessionStorage.setItem('crm_contacts_tab', 'ASSIGNED');
              }
              setActiveNav('contacts');
              window.dispatchEvent(new CustomEvent('crm_contacts_updated'));
            }}
          />
        );
      }
      case 'projects':
      case 'projects-management':
      case 'projects-all':
      case 'project':
        if (!can('projects', 'view')) {
          return (
            <AccessRestrictedView
              moduleName="Projects Management"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        return <ProjectsPage initialSubNav="all" />;
      case 'project-details':
      case 'projects-details':
      case 'projects/details': {
        if (!can('projects', 'view')) {
          return (
            <AccessRestrictedView
              moduleName="Projects Management"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        let viewProject = selectedProject;
        if (!viewProject && typeof window !== 'undefined') {
          try {
            const saved = sessionStorage.getItem('crm_viewing_project');
            if (saved) viewProject = JSON.parse(saved);
          } catch (e) {}
        }
        if (!viewProject && projects && projects.length > 0) {
          viewProject = projects[0];
        }
        if (viewProject) {
          return (
            <ProjectDetailsPage
              project={viewProject}
              onBack={() => {
                if (typeof window !== 'undefined') sessionStorage.removeItem('crm_viewing_project');
                setSelectedProject(null);
                setActiveNav('projects');
              }}
              onEdit={(p) => {
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('crm_editing_project', JSON.stringify(p));
                }
                setActiveNav('add-project');
              }}
              onDelete={async (p) => {
                await deleteProj(p.id);
                if (typeof window !== 'undefined') sessionStorage.removeItem('crm_viewing_project');
                setSelectedProject(null);
                setActiveNav('projects');
              }}
            />
          );
        }
        return <ProjectsPage initialSubNav="all" />;
      }
      case 'add-project':
      case 'projects/add':
      case 'projects/create':
      case 'create-project': {
        if (!can('projects', 'view')) {
          return (
            <AccessRestrictedView
              moduleName="Projects Management"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        let editData = null;
        try {
          const savedEdit = typeof window !== 'undefined' ? sessionStorage.getItem('crm_editing_project') : null;
          if (savedEdit) editData = JSON.parse(savedEdit);
        } catch (e) {}

        return (
          <AddProjectPage
            onBack={() => {
              if (typeof window !== 'undefined') sessionStorage.removeItem('crm_editing_project');
              setActiveNav('projects');
            }}
            initialData={editData}
          />
        );
      }
      case 'projects-my':
        if (!can('projects', 'view')) {
          return (
            <AccessRestrictedView
              moduleName="Projects Management"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        return <ProjectsPage initialSubNav="my" />;
      case 'projects-tasks':
      case 'projects-milestones':
        if (!can('projects', 'view')) {
          return (
            <AccessRestrictedView
              moduleName="Projects Management"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        return <ProjectsPage initialSubNav="tasks" />;
      case 'projects-team':
        if (!can('projects', 'view')) {
          return (
            <AccessRestrictedView
              moduleName="Projects Management"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        return <ProjectsPage initialSubNav="team" />;
      case 'projects-reports':
        if (!can('projects', 'view')) {
          return (
            <AccessRestrictedView
              moduleName="Projects Management"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        return <ProjectsPage initialSubNav="reports" />;
      case 'access-control':
      case 'access-control-matrix':
      case 'rbac':
        if (!can('access_control', 'view')) {
          return (
            <AccessRestrictedView
              moduleName="Access Control"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        return <AccessControlPage />;
      case 'settings':
      case 'setting':
      case 'master-catalog':
      case 'catalog': {
        if (!can('settings', 'view') && !isSuperAdmin) {
          return (
            <AccessRestrictedView
              moduleName="Settings"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        return <SettingsPage />;
      }
      case 'scheduled-meetings':
      case 'meetings':
        if (!can('scheduled_meetings', 'view')) {
          return (
            <AccessRestrictedView
              moduleName="Meetings"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        return <ScheduledMeetingsPage />;
      case 'call-logs':
      case 'calls':
      case 'call-log':
      case 'activity-logs':
      case 'activity-log':
        if (!can('call_logs', 'view')) {
          return (
            <AccessRestrictedView
              moduleName="Activity Logs"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        return <CallLogsPage />;
      case 'negotiations':
      case 'negotiation':
        if (!can('negotiations', 'view') && !can('leads', 'view') && !isSuperAdmin) {
          return (
            <AccessRestrictedView
              moduleName="Negotiations"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        return <LeadNegotiationSection />;
      case 'contracts':
      case 'contract':
      case 'create-contract':
        if (!can('leads', 'view') && !isSuperAdmin) {
          return (
            <AccessRestrictedView
              moduleName="Contracts"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        return <LeadContractSection />;
      case 'customers':
      case 'customer':
      case 'customers-all':
        if (!can('customers', 'view')) {
          return (
            <AccessRestrictedView
              moduleName="Customers"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        return <CustomersPage />;
      case 'customer-details':
      case 'customers/details': {
        let viewCustomer = selectedCustomer;
        let highlightedProjNum: number | null = null;
        if (typeof window !== 'undefined') {
          try {
            const saved = sessionStorage.getItem('crm_selected_customer');
            if (saved) viewCustomer = JSON.parse(saved);
            const projStr = sessionStorage.getItem('crm_selected_customer_project');
            if (projStr) highlightedProjNum = parseInt(projStr, 10);
          } catch (e) {}
        }
        if (!viewCustomer && customers && customers.length > 0) {
          viewCustomer = customers[0];
        }
        if (viewCustomer) {
          return (
            <CustomerDetailsPage
              customer={viewCustomer}
              highlightedProjectNumber={highlightedProjNum}
              onBack={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.removeItem('crm_selected_customer');
                  sessionStorage.removeItem('crm_selected_customer_project');
                }
                setSelectedCustomer(null);
                setActiveNav('customers');
              }}
              onEdit={() => {}}
              onDelete={async (id) => {
                if (deleteCust) await deleteCust(id);
                if (typeof window !== 'undefined') {
                  sessionStorage.removeItem('crm_selected_customer');
                  sessionStorage.removeItem('crm_selected_customer_project');
                }
                setSelectedCustomer(null);
                setActiveNav('customers');
              }}
              onNavigateToProjects={() => setActiveNav('projects')}
              onNavigateToLeads={() => setActiveNav('leads')}
            />
          );
        }
        return <CustomersPage />;
      }
      case 'invoices':
      case 'invoice':
      case 'invoices-all':
        if (!can('invoices', 'view') && !can('billing', 'view') && !isSuperAdmin) {
          return (
            <AccessRestrictedView
              moduleName="Invoices"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        return (
          <InvoicesPage
            onCreateNew={() => {
              setEditingInvoice(null);
              if (typeof window !== 'undefined') sessionStorage.removeItem('crm_editing_invoice');
              setActiveNav('create-invoice');
            }}
            onViewInvoice={(inv) => {
              setSelectedInvoice(inv);
              if (typeof window !== 'undefined') sessionStorage.setItem('crm_selected_invoice', JSON.stringify(inv));
              setActiveNav('invoice-details');
            }}
            onEditInvoice={(inv) => {
              setEditingInvoice(inv);
              if (typeof window !== 'undefined') sessionStorage.setItem('crm_editing_invoice', JSON.stringify(inv));
              setActiveNav('edit-invoice');
            }}
          />
        );

      case 'create-invoice':
      case 'invoices/create':
      case 'invoices/add':
      case 'add-invoice':
        return (
          <CreateInvoicePage
            onBack={() => setActiveNav('invoices')}
            onSuccess={(inv) => {
              setSelectedInvoice(inv);
              if (typeof window !== 'undefined') sessionStorage.setItem('crm_selected_invoice', JSON.stringify(inv));
              setActiveNav('invoice-details');
            }}
          />
        );

      case 'edit-invoice':
      case 'invoices/edit': {
        let editInv = editingInvoice;
        if (!editInv && typeof window !== 'undefined') {
          try {
            const saved = sessionStorage.getItem('crm_editing_invoice');
            if (saved) editInv = JSON.parse(saved);
          } catch (e) {}
        }
        return (
          <CreateInvoicePage
            initialInvoice={editInv}
            onBack={() => setActiveNav('invoices')}
            onSuccess={(inv) => {
              setSelectedInvoice(inv);
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('crm_editing_invoice');
                sessionStorage.setItem('crm_selected_invoice', JSON.stringify(inv));
              }
              setActiveNav('invoice-details');
            }}
          />
        );
      }

      case 'invoice-details':
      case 'invoices/details': {
        let viewInv = selectedInvoice;
        if (!viewInv && typeof window !== 'undefined') {
          try {
            const saved = sessionStorage.getItem('crm_selected_invoice');
            if (saved) viewInv = JSON.parse(saved);
          } catch (e) {}
        }
        if (viewInv) {
          return (
            <InvoiceDetailsPage
              invoice={viewInv}
              onBack={() => {
                setSelectedInvoice(null);
                if (typeof window !== 'undefined') sessionStorage.removeItem('crm_selected_invoice');
                setActiveNav('invoices');
              }}
              onEdit={(inv) => {
                setEditingInvoice(inv);
                if (typeof window !== 'undefined') sessionStorage.setItem('crm_editing_invoice', JSON.stringify(inv));
                setActiveNav('edit-invoice');
              }}
            />
          );
        }
        return (
          <InvoicesPage
            onCreateNew={() => setActiveNav('create-invoice')}
            onViewInvoice={(inv) => {
              setSelectedInvoice(inv);
              if (typeof window !== 'undefined') sessionStorage.setItem('crm_selected_invoice', JSON.stringify(inv));
              setActiveNav('invoice-details');
            }}
            onEditInvoice={(inv) => {
              setEditingInvoice(inv);
              if (typeof window !== 'undefined') sessionStorage.setItem('crm_editing_invoice', JSON.stringify(inv));
              setActiveNav('edit-invoice');
            }}
          />
        );
      }

      case 'billing':
      case 'billing-invoicing':
      case 'quotations':
        if (!can('billing', 'view') && !isSuperAdmin) {
          return (
            <AccessRestrictedView
              moduleName="Billing & Invoicing"
              onGoAllowed={() => setActiveNav(findFirstAllowedNav())}
            />
          );
        }
        return <BillingPage />;
      case 'activity-timeline':
      case 'activities':
      case 'activity':
      case 'timeline':
        return <ActivityTimelinePage />;
      default:
        return <DashboardPage onNavigate={(nav) => setActiveNav(nav)} />;
    }
  };

  return (
    <Box
      style={{
        display: 'flex',
        height: '100vh',
        maxHeight: '100vh',
        width: '100vw',
        maxWidth: '100vw',
        overflow: 'hidden',
        background: 'transparent',
      }}
    >
      {/* 1. Desktop Left Fixed Sidebar (Collapsible: 275px or 72px, Hidden on Mobile) */}
      <Box
        visibleFrom="md"
        style={{
          width: sidebarCollapsed ? 72 : 275,
          minWidth: sidebarCollapsed ? 72 : 275,
          maxWidth: sidebarCollapsed ? 72 : 275,
          height: '100vh',
          flexShrink: 0,
          zIndex: 110,
          overflow: 'hidden',
          transition:
            'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.22s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Sidebar onSelectNav={(nav) => setActiveNav(nav)} />
      </Box>

      {/* Mobile Drawer Navigation (Hidden on Desktop) */}
      <Drawer
        opened={sidebarMobileOpened}
        onClose={() => setSidebarMobileOpened(false)}
        size={280}
        padding={0}
        withCloseButton={false}
        hiddenFrom="md"
        styles={{
          body: { height: '100%', padding: 0 },
        }}
      >
        <Sidebar onSelectNav={(nav) => setActiveNav(nav)} isMobile />
      </Drawer>

      {/* 2. Right Area: Top Header is Fixed, Center Workspace Scrolls */}
      <Box
        style={{
          flex: 1,
          minWidth: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          background: isDark
            ? '#070D1E'
            : 'radial-gradient(ellipse at 85% 15%, #E1EEFD 0%, #F5F9FE 45%, #EAF2FC 100%)',
        }}
      >
        {/* Top Header Bar (64px Fixed, never scrolls) */}
        <Box
          style={{
            height: 64,
            minHeight: 64,
            maxHeight: 64,
            flexShrink: 0,
            zIndex: 100,
            width: '100%',
          }}
        >
          <Header />
        </Box>

        {/* Main Content Workspace (Center ONLY is scrollable!) */}
        <Box
          id="crm-main-scroll-container"
          style={{
            flex: 1,
            minHeight: 0,
            height: 'calc(100vh - 64px)',
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            position: 'relative',
          }}
        >
          {/* High-Tech Animated Canvas Background (Strictly behind cards: zIndex 0, pointer-events none) */}
          <AnimatedCanvasBackdrop />

          <Container
            fluid
            px={{ base: 'xs', sm: 'md', md: 'lg', xl: 'xl' }}
            py="md"
            style={{
              width: '100%',
              maxWidth: '100%',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              paddingBottom: 48,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {renderActiveScreen()}
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
