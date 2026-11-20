/**
 * Employee Domain Utility Functions
 */

/**
 * Generate standardized Employee Code (e.g. EMP-001)
 */
export function generateEmpCode(count = 0) {
  return `EMP-${String(count + 1).padStart(3, '0')}`;
}

/**
 * Build Prisma WHERE query for Employee filtering & search
 */
export function buildEmployeeFilterQuery(queryParams = {}) {
  const { department, status, role, employmentType, search } = queryParams;
  const where = {};

  if (department && department !== 'ALL' && department !== 'All') {
    where.department = String(department);
  }
  if (status && status !== 'ALL' && status !== 'All') {
    where.status = String(status);
  }
  if (role && role !== 'ALL' && role !== 'All') {
    where.role = String(role);
  }
  if (employmentType && employmentType !== 'ALL' && employmentType !== 'All') {
    where.employmentType = String(employmentType);
  }

  if (search && String(search).trim() !== '') {
    const q = String(search).trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { empCode: { contains: q, mode: 'insensitive' } },
      { designation: { contains: q, mode: 'insensitive' } },
      { department: { contains: q, mode: 'insensitive' } },
    ];
  }

  return where;
}

/**
 * Check if employee status represents an Inactive / Disabled state
 */
export function isEmployeeInactive(status) {
  if (!status) return false;
  const s = String(status).trim().toLowerCase();
  return (
    s === 'inactive' ||
    s.startsWith('inact') ||
    s === 'relieved' ||
    s === 'terminated' ||
    s === 'suspended' ||
    s === 'disabled'
  );
}

/**
 * Format single employee record
 */
export function formatEmployeeResponse(employee) {
  if (!employee) return null;
  return {
    ...employee,
    isActive: !isEmployeeInactive(employee.status),
  };
}

export default {
  generateEmpCode,
  buildEmployeeFilterQuery,
  isEmployeeInactive,
  formatEmployeeResponse,
};
