import { Router } from 'express';
import authRouter from './auth.routes.js';
import employeeRouter from './employee.routes.js';
import contactRouter from './contact.routes.js';
import projectRouter from './project.routes.js';
import accessControlRouter from './accessControl.routes.js';
import moduleRouter from './module.routes.js';
import leadRouter from './lead.routes.js';
import taskRouter from './task.routes.js';
import meetingRouter from './meeting.routes.js';
import callLogRouter from './callLog.routes.js';
import customerRouter from './customer.routes.js';
import billingRouter, { invoiceRouter } from './invoice.routes.js';
import crmRouter from './crm.routes.js';
import settingsRouter from './settings.routes.js';
import activityRouter from './activity.routes.js';
import supportTicketRouter from './supportTicket.routes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/employees', employeeRouter);
apiRouter.use('/contacts', contactRouter);
apiRouter.use('/projects', projectRouter);
apiRouter.use('/access-control', accessControlRouter);
apiRouter.use('/modules', moduleRouter);
apiRouter.use('/leads', leadRouter);
apiRouter.use('/tasks', taskRouter);
apiRouter.use('/meetings', meetingRouter);
apiRouter.use('/call-logs', callLogRouter);
apiRouter.use('/activity-logs', callLogRouter);
apiRouter.use('/customers', customerRouter);
apiRouter.use('/billing', billingRouter);
apiRouter.use('/invoices', invoiceRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/activities', activityRouter);
apiRouter.use('/support-tickets', supportTicketRouter);
apiRouter.use('/', crmRouter);

export default apiRouter;
export {
  authRouter,
  employeeRouter,
  contactRouter,
  projectRouter,
  accessControlRouter,
  moduleRouter,
  leadRouter,
  taskRouter,
  meetingRouter,
  callLogRouter,
  customerRouter,
  billingRouter,
  crmRouter,
  settingsRouter,
  activityRouter,
  supportTicketRouter,
};
