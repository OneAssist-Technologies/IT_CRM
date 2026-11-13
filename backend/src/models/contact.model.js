import { prisma } from '../config/prisma.js';

/**
 * Dynamic Contact Model
 * Interfaces directly with Prisma DB with dynamic metadata extraction and CRUD
 */
export class ContactModel {
  /**
   * Find contacts dynamically with filters, pagination, and sorting
   */
  static async findMany(where = {}, options = {}) {
    const { skip, take, orderBy, select } = options;
    return await prisma.contact.findMany({
      where,
      skip,
      take,
      orderBy: orderBy || [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      select,
    });
  }

  /**
   * Find single contact by ID or unique contactId
   */
  static async findById(id) {
    return await prisma.contact.findFirst({
      where: {
        OR: [{ id }, { contactId: id }],
      },
    });
  }

  /**
   * Create new contact in database
   */
  static async create(data) {
    return await prisma.contact.create({ data });
  }

  /**
   * Update contact by ID
   */
  static async update(id, data) {
    return await prisma.contact.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete contact by ID
   */
  static async delete(id) {
    return await prisma.contact.delete({
      where: { id },
    });
  }

  /**
   * Count contacts dynamically
   */
  static async count(where = {}) {
    return await prisma.contact.count({ where });
  }

  /**
   * Fetch dynamic metadata options aggregated from actual database records
   */
  static async getDynamicMetadata() {
    const [
      dbSources,
      dbStatuses,
      dbStages,
      dbCategories,
      dbContactTypes,
      dbPriorities,
      dbQualificationStatuses,
      dbContacts,
      dbLeads,
      dbBillingProducts,
      dbMasterProjects,
    ] = await Promise.all([
      prisma.contact.findMany({ select: { source: true }, distinct: ['source'] }),
      prisma.contact.findMany({ select: { status: true }, distinct: ['status'] }),
      prisma.contact.findMany({ select: { stage: true }, distinct: ['stage'] }),
      prisma.contact.findMany({ select: { category: true }, distinct: ['category'] }),
      prisma.contact.findMany({ select: { contactType: true }, distinct: ['contactType'] }),
      prisma.contact.findMany({ select: { priority: true }, distinct: ['priority'] }),
      prisma.contact.findMany({ select: { qualificationStatus: true }, distinct: ['qualificationStatus'] }),
      prisma.contact.findMany({
        select: { productList: true, serviceList: true, interestedService: true, customProduct: true, category: true },
      }),
      prisma.lead.findMany({
        select: { productList: true, serviceList: true, category: true },
      }),
      prisma.billingProduct.findMany({
        where: { status: 'Active' },
        select: { name: true, type: true, modules: true },
      }),
      prisma.masterProject.findMany({
        where: { status: 'Active' },
        select: { name: true, category: true, modules: true },
      }),
    ]);

    const catalogProducts = new Set();
    const catalogServices = new Set();

    dbBillingProducts.forEach((bp) => {
      if (bp.name) {
        if (bp.type === 'Service') {
          catalogServices.add(bp.name.trim());
        } else {
          catalogProducts.add(bp.name.trim());
        }
      }
      if (Array.isArray(bp.modules)) {
        bp.modules.forEach((m) => {
          const mName = typeof m === 'string' ? m : m?.name;
          if (mName) catalogServices.add(mName.trim());
        });
      }
    });

    dbMasterProjects.forEach((mp) => {
      if (mp.name) {
        catalogProducts.add(mp.name.trim());
      }
      if (Array.isArray(mp.modules)) {
        mp.modules.forEach((m) => {
          const mName = typeof m === 'string' ? m : m?.name;
          if (mName) catalogServices.add(mName.trim());
        });
      }
    });

    const dynamicProducts = new Set([...catalogProducts]);
    const dynamicServices = new Set([...catalogServices]);

    dbContacts.forEach((c) => {
      if (Array.isArray(c.productList)) c.productList.forEach((p) => p && dynamicProducts.add(p.trim()));
      if (Array.isArray(c.serviceList)) c.serviceList.forEach((s) => s && dynamicServices.add(s.trim()));
      if (c.interestedService) {
        if (c.category === 'Product') dynamicProducts.add(c.interestedService.trim());
        else dynamicServices.add(c.interestedService.trim());
      }
      if (c.customProduct) dynamicProducts.add(c.customProduct.trim());
    });

    dbLeads.forEach((l) => {
      if (Array.isArray(l.productList)) l.productList.forEach((p) => p && dynamicProducts.add(p.trim()));
      if (Array.isArray(l.serviceList)) l.serviceList.forEach((s) => s && dynamicServices.add(s.trim()));
    });

    const fallbackSources = ['Website', 'Referral', 'Cold Call', 'LinkedIn', 'Social Media', 'Other'];
    const fallbackStatuses = ['New', 'Active', 'Qualified', 'In Progress', 'On Hold', 'Pending', 'Follow-up Required', 'Completed', 'Won', 'Lost', 'Cancelled'];
    const fallbackStages = ['Initialization', 'Qualification', 'Discovery', 'Requirement Analysis', 'Demo / Presentation', 'Proposal', 'Negotiation', 'Decision Making', 'Won', 'Lost'];
    const fallbackCategories = ['Product', 'Service'];
    const fallbackContactTypes = ['Individual', 'Company Representative'];
    const fallbackPriorities = ['High', 'Medium', 'Low'];
    const fallbackQualificationStatuses = ['In Progress', 'Qualified', 'Follow-up Required', 'Disqualified'];

    const sources = Array.from(new Set([...dbSources.map(s => s.source).filter(Boolean), ...fallbackSources]));
    const statuses = Array.from(new Set([...dbStatuses.map(s => s.status).filter(Boolean), ...fallbackStatuses]));
    const stages = Array.from(new Set([...dbStages.map(s => s.stage).filter(Boolean), ...fallbackStages]));
    const categories = Array.from(new Set([...dbCategories.map(c => c.category).filter(Boolean), ...fallbackCategories]));
    const contactTypes = Array.from(new Set([...dbContactTypes.map(c => c.contactType).filter(Boolean), ...fallbackContactTypes]));
    const priorities = Array.from(new Set([...dbPriorities.map(p => p.priority).filter(Boolean), ...fallbackPriorities]));
    const qualificationStatuses = Array.from(new Set([...dbQualificationStatuses.map(q => q.qualificationStatus).filter(Boolean), ...fallbackQualificationStatuses]));

    return {
      sources,
      statuses,
      stages,
      categories,
      contactTypes,
      priorities,
      qualificationStatuses,
      catalogProducts: Array.from(catalogProducts).filter(Boolean),
      catalogServices: Array.from(catalogServices).filter(Boolean),
      productOptions: Array.from(dynamicProducts).filter(Boolean),
      serviceOptions: Array.from(dynamicServices).filter(Boolean),
      // Verified Odoo Dropdown Options
      titles: ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'],
      odooTags: ['VIP', 'Prospect', 'Customer', 'Enterprise', 'SME', 'Vendor', 'Consulting', 'Technology', 'Partner'],
      paymentTermOptions: ['Immediate Payment', '15 Days', '30 Days', '45 Days', '60 Days', 'End of Following Month'],
      countries: ['India', 'United States', 'United Arab Emirates', 'United Kingdom', 'Singapore', 'Canada', 'Australia', 'Germany', 'Saudi Arabia'],
    };
  }
}

/**
 * Backward compatibility Module Definition
 */
export const CONTACT_MODULE = {
  id: 'contacts',
  name: 'Contacts',
  category: 'Sales & CRM',
  description: 'Enterprise contact management, multi-stage sales pipeline tracking, lead qualification, and representative assignment.',
  actions: ['canView', 'canCreate', 'canEdit', 'canDelete', 'canExport', 'canApprove'],
  defaultPermissions: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canExport: true,
    canApprove: false,
  },
  getDynamicMetadata: ContactModel.getDynamicMetadata,
};

export default ContactModel;
