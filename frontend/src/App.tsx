import React from 'react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { theme } from './theme';
import { CRMProvider } from './context/CRMContext';
import { EmployeeProvider } from './context/EmployeeContext';
import { ContactProvider } from './context/ContactContext';
import { LeadProvider } from './context/LeadContext';
import { ProjectProvider } from './context/ProjectContext';
import { CustomerProvider } from './context/CustomerContext';
import { AccessControlProvider } from './context/AccessControlContext';
import { SupportTicketProvider } from './context/SupportTicketContext';
import { AppLayout } from './components/layout/AppLayout';

export const App: React.FC = () => {
  // Ensure default is light theme
  React.useEffect(() => {
    try {
      const explicit = localStorage.getItem('crm_user_explicit_theme');
      if (!explicit) {
        localStorage.setItem('mantine-color-scheme-value', 'light');
      }
    } catch (e) {}
  }, []);

  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications position="top-right" zIndex={2000} containerWidth={380} autoClose={3500} limit={1} />
      <ModalsProvider>
        <CRMProvider>
          <AccessControlProvider>
            <EmployeeProvider>
              <ContactProvider>
                <LeadProvider>
                  <ProjectProvider>
                    <CustomerProvider>
                      <SupportTicketProvider>
                        <AppLayout />
                      </SupportTicketProvider>
                    </CustomerProvider>
                  </ProjectProvider>
                </LeadProvider>
              </ContactProvider>
            </EmployeeProvider>
          </AccessControlProvider>
        </CRMProvider>
      </ModalsProvider>
    </MantineProvider>
  );
};

export default App;
