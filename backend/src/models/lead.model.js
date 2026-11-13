import { prisma } from '../config/prisma.js';

/**
 * Dynamic Lead Model
 * Interfaces with Prisma ORM for sales lead operations
 */
export class LeadModel {
  static async findMany(where = {}, options = {}) {
    const { skip, take, orderBy, select } = options;
    return await prisma.lead.findMany({
      where,
      skip,
      take,
      orderBy: orderBy || { createdAt: 'desc' },
      select,
    });
  }

  static async findById(id) {
    return await prisma.lead.findFirst({
      where: {
        OR: [{ id }, { leadId: id }],
      },
    });
  }

  static async create(data) {
    return await prisma.lead.create({ data });
  }

  static async update(id, data) {
    return await prisma.lead.update({
      where: { id },
      data,
    });
  }

  static async delete(id) {
    return await prisma.lead.delete({
      where: { id },
    });
  }

  static async count(where = {}) {
    return await prisma.lead.count({ where });
  }

  static async getDynamicStatuses() {
    return ['New', 'In Progress', 'Completed', 'Lost'];
  }

  static async getDynamicMetadata() {
    const [
      dbSources,
      dbStatuses,
      dbStages,
      dbCategories,
      dbContactTypes,
      dbLeads,
      dbContacts,
      dbBillingProducts,
      dbMasterProjects,
    ] = await Promise.all([
      prisma.lead.findMany({ select: { source: true }, distinct: ['source'] }),
      prisma.lead.findMany({ select: { status: true }, distinct: ['status'] }),
      prisma.lead.findMany({ select: { stage: true }, distinct: ['stage'] }),
      prisma.lead.findMany({ select: { category: true }, distinct: ['category'] }),
      prisma.lead.findMany({ select: { contactType: true }, distinct: ['contactType'] }),
      prisma.lead.findMany({ select: { productList: true, serviceList: true } }),
      prisma.contact.findMany({ select: { productList: true, serviceList: true, interestedService: true, customProduct: true, category: true } }),
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

    dbLeads.forEach((l) => {
      if (Array.isArray(l.productList)) l.productList.forEach((p) => p && dynamicProducts.add(p.trim()));
      if (Array.isArray(l.serviceList)) l.serviceList.forEach((s) => s && dynamicServices.add(s.trim()));
    });

    dbContacts.forEach((c) => {
      if (Array.isArray(c.productList)) c.productList.forEach((p) => p && dynamicProducts.add(p.trim()));
      if (Array.isArray(c.serviceList)) c.serviceList.forEach((s) => s && dynamicServices.add(s.trim()));
      if (c.interestedService) {
        if (c.category === 'Product') dynamicProducts.add(c.interestedService.trim());
        else dynamicServices.add(c.interestedService.trim());
      }
      if (c.customProduct) dynamicProducts.add(c.customProduct.trim());
    });

    const fallbackSources = ['Website', 'Referral', 'Cold Call', 'LinkedIn', 'Social Media', 'Other'];
    const fallbackStatuses = ['New', 'In Progress', 'Complete'];
    const fallbackStages = [
      'New Lead',
      'Meetings',
      'Proposals',
      'Quotations',
      'Negotiation',
      'Contracts',
      'Invoices',
      'Payments',
      'Progress',
      'Completed'
    ];
    const fallbackCategories = ['Product', 'Service'];
    const fallbackContactTypes = ['Individual', 'Company Representative'];

    const normalizeStage = (stg) => {
      if (!stg) return null;
      const s = String(stg).trim().toLowerCase();
      if (s === 'discovery' || s.includes('demo') || s === 'meeting' || s === 'meetings' || s.includes('requirement')) return 'Meetings';
      if (s === 'proposal' || s === 'proposals') return 'Proposals';
      if (s === 'quotation' || s === 'quotations') return 'Quotations';
      if (s === 'negotiation' || s === 'negotiations' || s.includes('negotiat')) return 'Negotiation';
      if (s === 'contract' || s === 'contracts' || s === 'decision making') return 'Contracts';
      if (s === 'invoice' || s === 'invoices') return 'Invoices';
      if (s === 'payment' || s === 'payments') return 'Payments';
      if (s === 'progress') return 'Progress';
      if (s === 'completed' || s === 'complete' || s === 'won' || s === 'closed won') return 'Completed';
      if (s === 'initialization' || s === 'qualification' || s === 'new lead' || s === 'new') return 'New Lead';
      return stg;
    };

    const sources = Array.from(new Set([...dbSources.map(s => s.source).filter(Boolean), ...fallbackSources]));
    const statuses = ['New', 'In Progress', 'Completed', 'Lost'];
    const stages = Array.from(new Set([...fallbackStages, ...dbStages.map(s => normalizeStage(s.stage)).filter(Boolean)]));
    const categories = Array.from(new Set([...dbCategories.map(c => c.category).filter(Boolean), ...fallbackCategories]));
    const contactTypes = Array.from(new Set([...dbContactTypes.map(c => c.contactType).filter(Boolean), ...fallbackContactTypes]));

    return {
      sources,
      statuses,
      stages,
      categories,
      contactTypes,
      catalogProducts: Array.from(catalogProducts).filter(Boolean),
      catalogServices: Array.from(catalogServices).filter(Boolean),
      productOptions: Array.from(dynamicProducts).filter(Boolean),
      serviceOptions: Array.from(dynamicServices).filter(Boolean),
    };
  }
}

export const LEAD_MODULE = {
  id: 'leads',
  name: 'Leads',
  category: 'Sales & CRM',
  description: 'Inbound sales opportunities, prospective customer conversion, and pipeline management.',
  actions: ['canView', 'canCreate', 'canEdit', 'canDelete', 'canExport', 'canApprove'],
  defaultPermissions: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canExport: true,
    canApprove: false,
  },
  getDynamicStatuses: LeadModel.getDynamicStatuses,
  getDynamicMetadata: LeadModel.getDynamicMetadata,
};

export default LeadModel;
