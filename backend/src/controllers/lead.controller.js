import * as leadService from '../services/lead.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * 1. Get all leads with pagination & search
 * GET /api/leads
 */
export async function getLeads(req, res) {
  try {
    const result = await leadService.getLeadsService(req.query, req.user);
    return res.status(200).json({
      success: true,
      message: 'Leads retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('getLeads error:', error);
    return sendError(res, error.message || 'Failed to fetch leads', error.status || 500);
  }
}

/**
 * 2. Get Lead KPI Stats
 * GET /api/leads/stats
 */
export async function getLeadStats(req, res) {
  try {
    const result = await leadService.getLeadStatsService(req.user);
    return res.status(200).json({
      success: true,
      stats: result.stats,
    });
  } catch (error) {
    console.error('getLeadStats error:', error);
    return sendError(res, error.message || 'Failed to fetch lead stats', error.status || 500);
  }
}

/**
 * 3. Get Lead Metadata
 * GET /api/leads/metadata
 */
export async function getLeadMetadata(req, res) {
  try {
    const result = await leadService.getLeadMetadataService();
    return res.status(200).json({
      success: true,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('getLeadMetadata error:', error);
    return sendError(res, error.message || 'Failed to fetch lead metadata', error.status || 500);
  }
}

/**
 * 4. Get Lead by ID
 * GET /api/leads/:id
 */
export async function getLeadById(req, res) {
  try {
    const result = await leadService.getLeadByIdService(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
}

/**
 * 5. Create a lead
 * POST /api/leads
 */
export async function createLead(req, res) {
  try {
    const result = await leadService.createLeadService(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('createLead error:', error);
    return sendError(res, error.message || 'Failed to create lead', error.status || 500);
  }
}

/**
 * 6. Update lead
 * PUT /api/leads/:id
 */
export async function updateLead(req, res) {
  try {
    const result = await leadService.updateLeadService(req.params.id, req.body, req.user);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('updateLead error:', error);
    return sendError(res, error.message || 'Failed to update lead', error.status || 500);
  }
}

/**
 * 7. Delete lead
 * DELETE /api/leads/:id
 */
export async function deleteLead(req, res) {
  try {
    const result = await leadService.deleteLeadService(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: { id: result.id, leadId: result.leadId },
    });
  } catch (error) {
    console.error('deleteLead error:', error);
    return sendError(res, error.message || 'Failed to delete lead', error.status || 500);
  }
}

/**
 * 8. Get all proposals (Lead Module)
 * GET /api/leads/proposals
 */
export async function getLeadProposals(req, res) {
  try {
    const proposals = await leadService.getLeadProposalsService(req.query);
    return res.status(200).json({
      success: true,
      message: 'Proposals retrieved successfully.',
      data: proposals,
    });
  } catch (error) {
    console.error('getLeadProposals error:', error);
    return sendError(res, error.message || 'Failed to fetch proposals', error.status || 500);
  }
}
export const getProposals = getLeadProposals;

/**
 * 9. Get single proposal by ID
 * GET /api/leads/proposals/:id
 */
export async function getLeadProposalById(req, res) {
  try {
    const proposal = await leadService.getLeadProposalByIdService(req.params.id);
    return res.status(200).json({
      success: true,
      data: proposal,
    });
  } catch (error) {
    console.error('getLeadProposalById error:', error);
    return sendError(res, error.message || 'Failed to fetch proposal', error.status || 500);
  }
}
export const getProposalById = getLeadProposalById;

/**
 * 10. Create new proposal
 * POST /api/leads/proposals
 */
export async function createLeadProposal(req, res) {
  try {
    const proposal = await leadService.createLeadProposalService(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: 'Proposal created successfully.',
      data: proposal,
    });
  } catch (error) {
    console.error('createLeadProposal error:', error);
    return sendError(res, error.message || 'Failed to create proposal', error.status || 500);
  }
}
export const createProposal = createLeadProposal;

/**
 * 11. Update proposal
 * PUT /api/leads/proposals/:id
 */
export async function updateLeadProposal(req, res) {
  try {
    const proposal = await leadService.updateLeadProposalService(req.params.id, req.body, req.user);
    return res.status(200).json({
      success: true,
      message: 'Proposal updated successfully.',
      data: proposal,
    });
  } catch (error) {
    console.error('updateLeadProposal error:', error);
    return sendError(res, error.message || 'Failed to update proposal', error.status || 500);
  }
}
export const updateProposal = updateLeadProposal;

/**
 * 12. Delete proposal
 * DELETE /api/leads/proposals/:id
 */
export async function deleteLeadProposal(req, res) {
  try {
    const result = await leadService.deleteLeadProposalService(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Proposal deleted successfully.',
      data: result,
    });
  } catch (error) {
    console.error('deleteLeadProposal error:', error);
    return sendError(res, error.message || 'Failed to delete proposal', error.status || 500);
  }
}
export const deleteProposal = deleteLeadProposal;

// =============================================================================
// NEGOTIATION CONTROLLERS (Inside Lead Controller)
// =============================================================================

/**
 * 13. Get all negotiations with filters and pagination
 * GET /api/leads/negotiations OR /api/negotiations
 */
export async function getLeadNegotiations(req, res) {
  try {
    const result = await leadService.getLeadNegotiationsService(req.query);
    return res.status(200).json({
      success: true,
      message: 'Negotiations retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('getLeadNegotiations error:', error);
    return sendError(res, error.message || 'Failed to fetch negotiations', error.status || 500);
  }
}
export const getNegotiations = getLeadNegotiations;

/**
 * 14. Get negotiation statistics summary
 * GET /api/leads/negotiations/stats OR /api/negotiations/stats
 */
export async function getLeadNegotiationStats(req, res) {
  try {
    const stats = await leadService.getLeadNegotiationStatsService();
    return res.status(200).json({
      success: true,
      data: stats,
      stats,
    });
  } catch (error) {
    console.error('getLeadNegotiationStats error:', error);
    return sendError(res, error.message || 'Failed to fetch negotiation stats', error.status || 500);
  }
}
export const getNegotiationStats = getLeadNegotiationStats;

/**
 * 15. Get single negotiation by ID or negotiationId
 * GET /api/leads/negotiations/:id OR /api/negotiations/:id
 */
export async function getLeadNegotiationById(req, res) {
  try {
    const negotiation = await leadService.getLeadNegotiationByIdService(req.params.id);
    return res.status(200).json({
      success: true,
      data: negotiation,
    });
  } catch (error) {
    console.error('getLeadNegotiationById error:', error);
    return sendError(res, error.message || 'Negotiation record not found', error.status || 404);
  }
}
export const getNegotiationById = getLeadNegotiationById;

/**
 * 16. Create new negotiation
 * POST /api/leads/negotiations OR /api/negotiations
 */
export async function createLeadNegotiation(req, res) {
  try {
    const negotiation = await leadService.createLeadNegotiationService(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: 'Negotiation created successfully',
      data: negotiation,
    });
  } catch (error) {
    console.error('createLeadNegotiation error:', error);
    return sendError(res, error.message || 'Failed to create negotiation', error.status || 400);
  }
}
export const createNegotiation = createLeadNegotiation;

/**
 * 17. Update negotiation
 * PUT /api/leads/negotiations/:id OR /api/negotiations/:id
 */
export async function updateLeadNegotiation(req, res) {
  try {
    const negotiation = await leadService.updateLeadNegotiationService(req.params.id, req.body, req.user);
    return res.status(200).json({
      success: true,
      message: 'Negotiation updated successfully',
      data: negotiation,
    });
  } catch (error) {
    console.error('updateLeadNegotiation error:', error);
    return sendError(res, error.message || 'Failed to update negotiation', error.status || 400);
  }
}
export const updateNegotiation = updateLeadNegotiation;

/**
 * 18. Delete negotiation
 * DELETE /api/leads/negotiations/:id OR /api/negotiations/:id
 */
export async function deleteLeadNegotiation(req, res) {
  try {
    const result = await leadService.deleteLeadNegotiationService(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Negotiation deleted successfully',
      data: result,
    });
  } catch (error) {
    console.error('deleteLeadNegotiation error:', error);
    return sendError(res, error.message || 'Failed to delete negotiation', error.status || 500);
  }
}
export const deleteNegotiation = deleteLeadNegotiation;

/**
 * 19. Get contracts under Lead Module
 * GET /api/leads/contracts OR /api/contracts
 */
export async function getLeadContracts(req, res) {
  try {
    const result = await leadService.getLeadContractsService(req.query);
    return res.status(200).json({
      success: true,
      message: 'Contracts retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('getLeadContracts error:', error);
    return sendError(res, error.message || 'Failed to fetch contracts', error.status || 500);
  }
}
export const getContracts = getLeadContracts;

/**
 * 20. Get contract stats
 * GET /api/leads/contracts/stats OR /api/contracts/stats
 */
export async function getLeadContractStats(req, res) {
  try {
    const stats = await leadService.getLeadContractStatsService(req.query.leadId);
    return res.status(200).json({
      success: true,
      message: 'Contract statistics retrieved successfully',
      data: stats,
      stats,
    });
  } catch (error) {
    console.error('getLeadContractStats error:', error);
    return sendError(res, error.message || 'Failed to fetch contract stats', error.status || 500);
  }
}
export const getContractStats = getLeadContractStats;

/**
 * 21. Get single contract by ID
 * GET /api/leads/contracts/:id OR /api/contracts/:id
 */
export async function getLeadContractById(req, res) {
  try {
    const contract = await leadService.getLeadContractByIdService(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Contract retrieved successfully',
      data: contract,
    });
  } catch (error) {
    console.error('getLeadContractById error:', error);
    return sendError(res, error.message || 'Contract not found', error.status || 404);
  }
}
export const getContractById = getLeadContractById;

/**
 * 22. Create new contract
 * POST /api/leads/contracts OR /api/contracts
 */
export async function createLeadContract(req, res) {
  try {
    const contract = await leadService.createLeadContractService(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: 'Contract created successfully',
      data: contract,
    });
  } catch (error) {
    console.error('createLeadContract error:', error);
    return sendError(res, error.message || 'Failed to create contract', error.status || 400);
  }
}
export const createContract = createLeadContract;

/**
 * 23. Update contract
 * PUT /api/leads/contracts/:id OR /api/contracts/:id
 */
export async function updateLeadContract(req, res) {
  try {
    const contract = await leadService.updateLeadContractService(req.params.id, req.body, req.user);
    return res.status(200).json({
      success: true,
      message: 'Contract updated successfully',
      data: contract,
    });
  } catch (error) {
    console.error('updateLeadContract error:', error);
    return sendError(res, error.message || 'Failed to update contract', error.status || 400);
  }
}
export const updateContract = updateLeadContract;

/**
 * 23b. Submit contract for approval
 * POST /api/leads/contracts/:id/submit OR /api/contracts/:id/submit
 */
export async function submitLeadContractApproval(req, res) {
  try {
    const contract = await leadService.submitLeadContractApprovalService(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      message: 'Contract submitted for approval successfully',
      data: contract,
    });
  } catch (error) {
    console.error('submitLeadContractApproval error:', error);
    return sendError(res, error.message || 'Failed to submit contract for approval', error.status || 400);
  }
}
export const submitContractApproval = submitLeadContractApproval;

/**
 * 23c. Approve contract
 * POST /api/leads/contracts/:id/approve OR /api/contracts/:id/approve
 */
export async function approveLeadContract(req, res) {
  try {
    const contract = await leadService.approveLeadContractService(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      message: 'Contract approved successfully',
      data: contract,
    });
  } catch (error) {
    console.error('approveLeadContract error:', error);
    return sendError(res, error.message || 'Failed to approve contract', error.status || 400);
  }
}
export const approveContract = approveLeadContract;

/**
 * 23d. Reject contract
 * POST /api/leads/contracts/:id/reject OR /api/contracts/:id/reject
 */
export async function rejectLeadContract(req, res) {
  try {
    const { rejectionReason } = req.body || {};
    const contract = await leadService.rejectLeadContractService(req.params.id, rejectionReason, req.user);
    return res.status(200).json({
      success: true,
      message: 'Contract rejected successfully',
      data: contract,
    });
  } catch (error) {
    console.error('rejectLeadContract error:', error);
    return sendError(res, error.message || 'Failed to reject contract', error.status || 400);
  }
}
export const rejectContract = rejectLeadContract;

/**
 * 24. Delete contract
 * DELETE /api/leads/contracts/:id OR /api/contracts/:id
 */
export async function deleteLeadContract(req, res) {
  try {
    const result = await leadService.deleteLeadContractService(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Contract deleted successfully',
      data: result,
    });
  } catch (error) {
    console.error('deleteLeadContract error:', error);
    return sendError(res, error.message || 'Failed to delete contract', error.status || 500);
  }
}
export const deleteContract = deleteLeadContract;

export default {
  getLeads,
  getLeadStats,
  getLeadMetadata,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getLeadProposals,
  getLeadProposalById,
  createLeadProposal,
  updateLeadProposal,
  deleteLeadProposal,
  getProposals,
  getProposalById,
  createProposal,
  updateProposal,
  deleteProposal,
  getLeadNegotiations,
  getLeadNegotiationStats,
  getLeadNegotiationById,
  createLeadNegotiation,
  updateLeadNegotiation,
  deleteLeadNegotiation,
  getNegotiations,
  getNegotiationStats,
  getNegotiationById,
  createNegotiation,
  updateNegotiation,
  deleteNegotiation,
  getLeadContracts,
  getLeadContractStats,
  getLeadContractById,
  createLeadContract,
  updateLeadContract,
  submitLeadContractApproval,
  approveLeadContract,
  rejectLeadContract,
  deleteLeadContract,
  getContracts,
  getContractStats,
  getContractById,
  createContract,
  updateContract,
  submitContractApproval,
  approveContract,
  rejectContract,
  deleteContract,
};


