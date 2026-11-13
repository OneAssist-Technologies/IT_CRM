import * as projectService from '../services/project.service.js';

/**
 * 1. List projects
 * GET /api/v1/projects
 */
export async function getProjects(req, res) {
  try {
    const result = await projectService.getProjectsService(req.query, req.user);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[getProjects Error]:', error);
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 2. Get Single Project by ID
 * GET /api/v1/projects/:id
 */
export async function getProjectById(req, res) {
  try {
    const result = await projectService.getProjectByIdService(req.params.id);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 3. Get Project KPI Stats
 * GET /api/v1/projects/stats
 */
export async function getProjectStats(req, res) {
  try {
    const result = await projectService.getProjectStatsService(req.user);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 4. Get Project Dropdown Metadata
 * GET /api/v1/projects/metadata
 */
export async function getProjectMetadata(_req, res) {
  try {
    const result = await projectService.getProjectMetadataService();
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

/**
 * 5. Create Project
 * POST /api/v1/projects
 */
export async function createProject(req, res) {
  try {
    const result = await projectService.createProjectService(req.body, req.user);
    return res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[createProject Error]:', error);
    return res.status(error.status || 400).json({ success: false, message: error.message });
  }
}

/**
 * 6. Update Project
 * PUT /api/v1/projects/:id
 */
export async function updateProject(req, res) {
  try {
    const result = await projectService.updateProjectService(req.params.id, req.body, req.user);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[updateProject Error]:', error);
    return res.status(error.status || 400).json({ success: false, message: error.message });
  }
}

/**
 * 7. Delete Project
 * DELETE /api/v1/projects/:id
 */
export async function deleteProject(req, res) {
  try {
    const result = await projectService.deleteProjectService(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[deleteProject Error]:', error);
    return res.status(error.status || 400).json({ success: false, message: error.message });
  }
}

/**
 * 8. Update Project Modules
 * PUT /api/v1/projects/:id/modules
 */
export async function updateProjectModules(req, res) {
  try {
    const result = await projectService.updateProjectModulesService(req.params.id, req.body.modules, req.user);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[updateProjectModules Error]:', error);
    return res.status(error.status || 400).json({ success: false, message: error.message });
  }
}

export default {
  getProjects,
  getProjectById,
  getProjectStats,
  getProjectMetadata,
  createProject,
  updateProject,
  deleteProject,
  updateProjectModules,
};
