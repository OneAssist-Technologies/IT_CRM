/**
 * Dynamic Module Utility Functions
 */

/**
 * Generate a database/URL-safe module ID from module name
 * e.g. "Invoice & Billing" -> "invoice_billing"
 */
export function generateModuleId(name) {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

import { EXCLUDED_LEGACY_MODULES } from '../models/model.registry.js';

/**
 * Merge static system modules and dynamic DB role permissions
 */
export function mergeSystemAndDbModules(systemModules = [], dbPermissions = []) {
  const moduleMap = new Map();

  for (const sysMod of systemModules) {
    if (EXCLUDED_LEGACY_MODULES && EXCLUDED_LEGACY_MODULES.has(sysMod.id)) continue;
    moduleMap.set(sysMod.id, {
      id: sysMod.id,
      name: sysMod.name,
      category: sysMod.category || 'Core',
      description: sysMod.description || '',
      isSystem: true,
    });
  }

  for (const p of dbPermissions) {
    if (EXCLUDED_LEGACY_MODULES && EXCLUDED_LEGACY_MODULES.has(p.moduleId)) continue;
    if (!moduleMap.has(p.moduleId)) {
      moduleMap.set(p.moduleId, {
        id: p.moduleId,
        name: p.moduleName,
        category: p.category || 'Custom',
        description: `Custom module: ${p.moduleName}`,
        isSystem: false,
      });
    } else {
      const existing = moduleMap.get(p.moduleId);
      existing.name = p.moduleName || existing.name;
      existing.category = p.category || existing.category;
    }
  }

  return Array.from(moduleMap.values());
}

export default {
  generateModuleId,
  mergeSystemAndDbModules,
};
