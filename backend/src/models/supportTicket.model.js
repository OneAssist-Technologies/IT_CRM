import { query, getClient } from '../config/db.js';
import { formatTicketRow } from '../utils/ticket.util.js';

export class SupportTicketModel {
  /**
   * Search and filter tickets with pagination and sorting
   */
  static async findTickets(filters = {}, options = {}) {
    const {
      search,
      status,
      priority,
      issueType,
      assignedTeam,
      assignedTo,
      customerId,
      projectId,
      viewTab, // 'all' | 'my' | 'unassigned'
      userId,
      employeeId,
      dateFrom,
      dateTo,
    } = filters;

    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = options;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const conditions = [];
    const params = [];

    // View tab filters
    if (viewTab === 'unassigned') {
      conditions.push('(t.assigned_to IS NULL OR t.assigned_to = \'\')');
    } else if (viewTab === 'my') {
      const matchIds = [userId, employeeId].filter(Boolean);
      if (matchIds.length > 0) {
        params.push(matchIds);
        conditions.push(`t.assigned_to = ANY($${params.length})`);
      }
    }

    // Specific filters
    if (status && status !== 'All') {
      params.push(status);
      conditions.push(`t.status = $${params.length}`);
    }
    if (priority && priority !== 'All') {
      params.push(priority);
      conditions.push(`t.priority = $${params.length}`);
    }
    if (issueType && issueType !== 'All') {
      params.push(issueType);
      conditions.push(`t.issue_type = $${params.length}`);
    }
    if (assignedTeam && assignedTeam !== 'All') {
      params.push(assignedTeam);
      conditions.push(`t.assigned_team = $${params.length}`);
    }
    if (assignedTo && assignedTo !== 'All') {
      if (assignedTo === 'Unassigned') {
        conditions.push("(t.assigned_to IS NULL OR t.assigned_to = '')");
      } else {
        params.push(assignedTo);
        conditions.push(`t.assigned_to = $${params.length}`);
      }
    }
    if (customerId) {
      params.push(customerId);
      conditions.push(`t.customer_id = $${params.length}`);
    }
    if (projectId) {
      params.push(projectId);
      conditions.push(`t.project_id = $${params.length}`);
    }

    // Date range
    if (dateFrom) {
      params.push(dateFrom);
      conditions.push(`t.reported_at >= $${params.length}::timestamptz`);
    }
    if (dateTo) {
      params.push(dateTo);
      conditions.push(`t.reported_at <= $${params.length}::timestamptz`);
    }

    // Global search (Ticket ID, Subject, Customer Name, Project Name)
    if (search && String(search).trim() !== '') {
      params.push(`%${String(search).trim()}%`);
      const pIdx = params.length;
      conditions.push(`(
        t.ticket_number ILIKE $${pIdx} OR 
        t.subject ILIKE $${pIdx} OR 
        c."companyName" ILIKE $${pIdx} OR 
        p.name ILIKE $${pIdx}
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate sort column to prevent SQL injection
    const allowedSortCols = {
      ticket_number: 't.ticket_number',
      subject: 't.subject',
      status: 't.status',
      priority: 't.priority',
      reported_at: 't.reported_at',
      due_date: 't.resolution_due_at',
      created_at: 't.created_at',
      updated_at: 't.updated_at',
    };
    const orderCol = allowedSortCols[sortBy] || 't.created_at';
    const orderDir = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const sql = `
      SELECT 
        t.*,
        c."companyName" AS customer_name,
        COALESCE(t.contact_name, ct.name, c."contactPerson") AS contact_name,
        COALESCE(ct.email, c.email) AS contact_email,
        COALESCE(ct.phone, c.phone) AS contact_phone,
        p.name AS project_name,
        p.status AS project_status,
        p."projectManagerName" AS project_manager_name,
        COALESCE(k.title, (
          SELECT k2.title 
          FROM contracts k2 
          WHERE (k2."clientName" ILIKE c."companyName" OR k2."customerId" = t.customer_id)
          ORDER BY k2."createdAt" DESC 
          LIMIT 1
        )) AS contract_title,
        COALESCE(k."contractType", (
          SELECT k2."contractType" 
          FROM contracts k2 
          WHERE (k2."clientName" ILIKE c."companyName" OR k2."customerId" = t.customer_id)
          ORDER BY k2."createdAt" DESC 
          LIMIT 1
        )) AS contract_type,
        COALESCE(k."slaTerms", (
          SELECT k2."slaTerms" 
          FROM contracts k2 
          WHERE (k2."clientName" ILIKE c."companyName" OR k2."customerId" = t.customer_id)
          ORDER BY k2."createdAt" DESC 
          LIMIT 1
        )) AS sla_terms,
        COALESCE(k."warrantyTerms", (
          SELECT k2."warrantyTerms" 
          FROM contracts k2 
          WHERE (k2."clientName" ILIKE c."companyName" OR k2."customerId" = t.customer_id)
          ORDER BY k2."createdAt" DESC 
          LIMIT 1
        )) AS warranty_terms,
        emp.name AS assigned_to_name,
        emp.email AS assigned_to_email,
        lead_emp.name AS team_lead_name,
        qa_emp.name AS qa_assigned_to_name
      FROM support_tickets t
      LEFT JOIN "Customer" c ON t.customer_id = c.id
      LEFT JOIN "Contact" ct ON t.contact_id = ct.id
      LEFT JOIN "Project" p ON t.project_id = p.id
      LEFT JOIN contracts k ON t.contract_id = k.id
      LEFT JOIN "Employee" emp ON t.assigned_to = emp.id
      LEFT JOIN "Employee" lead_emp ON t.team_lead_id = lead_emp.id
      LEFT JOIN "Employee" qa_emp ON t.qa_assigned_to = qa_emp.id
      ${whereClause}
      ORDER BY ${orderCol} ${orderDir}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;

    const countSql = `
      SELECT COUNT(*) AS total
      FROM support_tickets t
      LEFT JOIN "Customer" c ON t.customer_id = c.id
      LEFT JOIN "Project" p ON t.project_id = p.id
      ${whereClause};
    `;

    const countParams = [...params];
    params.push(parseInt(limit, 10), offset);

    const [rowsRes, countRes] = await Promise.all([
      query(sql, params),
      query(countSql, countParams),
    ]);

    const total = parseInt(countRes.rows[0]?.total || '0', 10);
    const tickets = rowsRes.rows.map(formatTicketRow);

    return {
      tickets,
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)) || 1,
    };
  }

  /**
   * Find a single ticket by UUID or ticket_number
   */
  static async findById(id) {
    const sql = `
      SELECT 
        t.*,
        c."companyName" AS customer_name,
        COALESCE(t.contact_name, ct.name, c."contactPerson") AS contact_name,
        COALESCE(ct.email, c.email) AS contact_email,
        COALESCE(ct.phone, c.phone) AS contact_phone,
        p.name AS project_name,
        p.status AS project_status,
        p."projectManagerName" AS project_manager_name,
        COALESCE(k.title, (
          SELECT k2.title 
          FROM contracts k2 
          WHERE (k2."clientName" ILIKE c."companyName" OR k2."customerId" = t.customer_id)
          ORDER BY k2."createdAt" DESC 
          LIMIT 1
        )) AS contract_title,
        COALESCE(k."contractType", (
          SELECT k2."contractType" 
          FROM contracts k2 
          WHERE (k2."clientName" ILIKE c."companyName" OR k2."customerId" = t.customer_id)
          ORDER BY k2."createdAt" DESC 
          LIMIT 1
        )) AS contract_type,
        COALESCE(k."slaTerms", (
          SELECT k2."slaTerms" 
          FROM contracts k2 
          WHERE (k2."clientName" ILIKE c."companyName" OR k2."customerId" = t.customer_id)
          ORDER BY k2."createdAt" DESC 
          LIMIT 1
        )) AS sla_terms,
        COALESCE(k."warrantyTerms", (
          SELECT k2."warrantyTerms" 
          FROM contracts k2 
          WHERE (k2."clientName" ILIKE c."companyName" OR k2."customerId" = t.customer_id)
          ORDER BY k2."createdAt" DESC 
          LIMIT 1
        )) AS warranty_terms,
        emp.name AS assigned_to_name,
        emp.email AS assigned_to_email,
        lead_emp.name AS team_lead_name,
        qa_emp.name AS qa_assigned_to_name
      FROM support_tickets t
      LEFT JOIN "Customer" c ON t.customer_id = c.id
      LEFT JOIN "Contact" ct ON t.contact_id = ct.id
      LEFT JOIN "Project" p ON t.project_id = p.id
      LEFT JOIN contracts k ON t.contract_id = k.id
      LEFT JOIN "Employee" emp ON t.assigned_to = emp.id
      LEFT JOIN "Employee" lead_emp ON t.team_lead_id = lead_emp.id
      LEFT JOIN "Employee" qa_emp ON t.qa_assigned_to = qa_emp.id
      WHERE t.id::text = $1 OR t.ticket_number = $1
      LIMIT 1;
    `;

    const res = await query(sql, [id]);
    return formatTicketRow(res.rows[0]);
  }

  /**
   * Insert new ticket into support_tickets table
   */
  static async create(data) {
    const fields = [
      'ticket_number',
      'subject',
      'description',
      'source',
      'customer_id',
      'contact_id',
      'contact_name',
      'project_id',
      'handover_id',
      'contract_id',
      'affected_module',
      'issue_type',
      'priority',
      'status',
      'assigned_team',
      'assigned_to',
      'team_lead_id',
      'qa_assigned_to',
      'reported_by',
      'reported_by_id',
      'reported_at',
      'first_response_due_at',
      'resolution_due_at',
      'steps_to_reproduce',
      'expected_result',
      'actual_result',
      'environment',
      'browser_device',
      'error_message',
      'root_cause',
      'workaround',
      'resolution_description',
      'created_by',
    ];

    const values = fields.map((f) => data[f] ?? null);
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO support_tickets (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *;
    `;

    const res = await query(sql, values);
    return formatTicketRow(res.rows[0]);
  }

  /**
   * Update existing ticket by ID
   */
  static async update(id, data) {
    const setClauses = [];
    const values = [];

    const allowedUpdates = [
      'subject',
      'description',
      'source',
      'customer_id',
      'contact_id',
      'contact_name',
      'project_id',
      'handover_id',
      'contract_id',
      'affected_module',
      'issue_type',
      'priority',
      'status',
      'assigned_team',
      'assigned_to',
      'reported_by',
      'team_lead_id',
      'qa_assigned_to',
      'first_response_at',
      'first_response_due_at',
      'resolution_due_at',
      'resolved_at',
      'closed_at',
      'reopened_count',
      'steps_to_reproduce',
      'expected_result',
      'actual_result',
      'environment',
      'browser_device',
      'error_message',
      'root_cause',
      'workaround',
      'resolution_description',
    ];

    for (const key of allowedUpdates) {
      if (data[key] !== undefined) {
        values.push(data[key]);
        setClauses.push(`${key} = $${values.length}`);
      }
    }

    if (setClauses.length === 0) return await this.findById(id);

    setClauses.push('updated_at = NOW()');
    values.push(id);

    const sql = `
      UPDATE support_tickets 
      SET ${setClauses.join(', ')}
      WHERE id::text = $${values.length} OR ticket_number = $${values.length}
      RETURNING *;
    `;

    const res = await query(sql, values);
    return formatTicketRow(res.rows[0]);
  }

  /**
   * Add audit history entry
   */
  static async addHistory(data) {
    const sql = `
      INSERT INTO support_ticket_history (
        ticket_id, action, field_name, old_value, new_value, reason, performed_by, performed_by_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const params = [
      data.ticket_id,
      data.action,
      data.field_name || null,
      data.old_value || null,
      data.new_value || null,
      data.reason || null,
      data.performed_by,
      data.performed_by_id || null,
    ];
    const res = await query(sql, params);
    return res.rows[0];
  }

  /**
   * Get history for a ticket
   */
  static async getHistory(ticketId) {
    const sql = `
      SELECT * 
      FROM support_ticket_history 
      WHERE ticket_id = $1 
      ORDER BY created_at DESC;
    `;
    const res = await query(sql, [ticketId]);
    return res.rows.map((r) => ({
      id: r.id,
      ticketId: r.ticket_id,
      action: r.action,
      fieldName: r.field_name,
      oldValue: r.old_value,
      newValue: r.new_value,
      reason: r.reason,
      performedBy: r.performed_by,
      performedById: r.performed_by_id,
      createdAt: r.created_at,
    }));
  }

  /**
   * Add assignment entry
   */
  static async addAssignment(data) {
    const sql = `
      INSERT INTO support_ticket_assignments (
        ticket_id, team, assigned_to, assigned_to_name, assigned_by, assigned_by_name, assignment_reason
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const params = [
      data.ticket_id,
      data.team || null,
      data.assigned_to || null,
      data.assigned_to_name || null,
      data.assigned_by || null,
      data.assigned_by_name || null,
      data.assignment_reason || null,
    ];
    const res = await query(sql, params);
    return res.rows[0];
  }

  /**
   * Get assignment history for a ticket
   */
  static async getAssignments(ticketId) {
    const sql = `
      SELECT * 
      FROM support_ticket_assignments 
      WHERE ticket_id = $1 
      ORDER BY assigned_at DESC;
    `;
    const res = await query(sql, [ticketId]);
    return res.rows.map((r) => ({
      id: r.id,
      ticketId: r.ticket_id,
      team: r.team,
      assignedTo: r.assigned_to,
      assignedToName: r.assigned_to_name,
      assignedBy: r.assigned_by,
      assignedByName: r.assigned_by_name,
      assignedAt: r.assigned_at,
      unassignedAt: r.unassigned_at,
      assignmentReason: r.assignment_reason,
    }));
  }

  /**
   * Add comment (Public Reply or Internal Note)
   */
  static async addComment(data) {
    const sql = `
      INSERT INTO support_ticket_comments (
        ticket_id, type, message, author_id, author_name, author_role, attachments
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      RETURNING *;
    `;
    const params = [
      data.ticket_id,
      data.type || 'public_reply',
      data.message,
      data.author_id || null,
      data.author_name,
      data.author_role || null,
      JSON.stringify(data.attachments || []),
    ];
    const res = await query(sql, params);
    return res.rows[0];
  }

  /**
   * Get comments for a ticket
   */
  static async getComments(ticketId, includeInternal = true) {
    let sql = `
      SELECT * 
      FROM support_ticket_comments 
      WHERE ticket_id = $1
    `;
    const params = [ticketId];

    if (!includeInternal) {
      sql += ` AND type = 'public_reply'`;
    }

    sql += ` ORDER BY created_at ASC;`;

    const res = await query(sql, params);
    return res.rows.map((r) => ({
      id: r.id,
      ticketId: r.ticket_id,
      type: r.type,
      message: r.message,
      authorId: r.author_id,
      authorName: r.author_name,
      authorRole: r.author_role,
      attachments: r.attachments,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Add attachment record
   */
  static async addAttachment(data) {
    const sql = `
      INSERT INTO support_ticket_attachments (
        ticket_id, file_name, file_path, mime_type, file_size, uploaded_by, uploaded_by_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const params = [
      data.ticket_id,
      data.file_name,
      data.file_path,
      data.mime_type || null,
      data.file_size || 0,
      data.uploaded_by || 'Staff',
      data.uploaded_by_id || null,
    ];
    const res = await query(sql, params);
    return res.rows[0];
  }

  /**
   * Get attachments for a ticket
   */
  static async getAttachments(ticketId) {
    const sql = `
      SELECT * 
      FROM support_ticket_attachments 
      WHERE ticket_id = $1 
      ORDER BY uploaded_at DESC;
    `;
    const res = await query(sql, [ticketId]);
    return res.rows.map((r) => ({
      id: r.id,
      ticketId: r.ticket_id,
      fileName: r.file_name,
      filePath: r.file_path,
      mimeType: r.mime_type,
      fileSize: r.file_size,
      uploadedBy: r.uploaded_by,
      uploadedById: r.uploaded_by_id,
      uploadedAt: r.uploaded_at,
    }));
  }

  /**
   * Fetch all CRM master dropdown data needed to create and edit tickets
   * Reuses existing Customer, Contact, Project, Contract, Employee tables
   */
  static async getDropdownMetadata() {
    const [custRes, projRes, contRes, leadRes, empRes, contractRes] = await Promise.all([
      query(`
        SELECT id, "customerId" as code, "companyName" as name, "contactPerson", email, phone 
        FROM "Customer" 
        WHERE status != 'Inactive'
        ORDER BY "companyName" ASC;
      `),
      query(`
        SELECT id, "projectId" as code, name, "clientName", "contactId", status, "projectManagerName"
        FROM "Project"
        ORDER BY name ASC;
      `),
      query(`
        SELECT id, "contactId" as code, name, email, phone, "companyName"
        FROM "Contact"
        ORDER BY name ASC;
      `),
      query(`
        SELECT id, "leadId" as code, name, "companyName", email, phone
        FROM "Lead"
        ORDER BY name ASC;
      `),
      query(`
        SELECT id, "empCode" as code, name, email, department, designation, role, status
        FROM "Employee"
        WHERE status = 'Active' OR status IS NULL
        ORDER BY name ASC;
      `),
      query(`
        SELECT id, "contractId" as code, title, "clientName", "contactId", "contractType", "slaTerms", "warrantyTerms"
        FROM contracts
        ORDER BY title ASC;
      `),
    ]);

    // Extract unique support/engineering teams from Employee departments
    const teamSet = new Set([
      'Technical Support',
      'Engineering / Development',
      'Quality Assurance (QA)',
      'Product & Design',
      'DevOps & Infrastructure',
      'Customer Success',
    ]);
    for (const emp of empRes.rows) {
      if (emp.department && String(emp.department).trim()) {
        teamSet.add(String(emp.department).trim());
      }
    }

    return {
      customers: custRes.rows,
      projects: projRes.rows,
      contacts: contRes.rows,
      leads: leadRes.rows,
      employees: empRes.rows,
      contracts: contractRes.rows,
      teams: Array.from(teamSet),
    };
  }

  /**
   * Get ticket stats summary for tabs: all, my, unassigned
   */
  static async getStats(userId) {
    const res = await query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE assigned_to = $1) AS my_count,
        COUNT(*) FILTER (WHERE assigned_to IS NULL OR assigned_to = '') AS unassigned_count,
        COUNT(*) FILTER (WHERE status = 'New' OR status = 'Assigned') AS new_count,
        COUNT(*) FILTER (WHERE status = 'In Progress') AS in_progress_count,
        COUNT(*) FILTER (WHERE status = 'Resolved' OR status = 'Closed') AS complete_count
      FROM support_tickets;
    `, [userId || null]);
    const row = res.rows[0] || {};
    return {
      all: parseInt(row.total || '0', 10),
      my: parseInt(row.my_count || '0', 10),
      unassigned: parseInt(row.unassigned_count || '0', 10),
      new: parseInt(row.new_count || '0', 10),
      inProgress: parseInt(row.in_progress_count || '0', 10),
      complete: parseInt(row.complete_count || '0', 10),
    };
  }

  /**
   * Delete ticket by ID or ticket_number
   */
  static async delete(id) {
    const res = await query('DELETE FROM support_tickets WHERE id::text = $1 OR ticket_number = $1 RETURNING *;', [id]);
    return res.rows[0] ? formatTicketRow(res.rows[0]) : null;
  }

  /**
   * Tasks CRUD for Work in Progress / Progression (support_ticket_tasks table)
   */
  static async getTasks(ticketId) {
    const sql = `
      SELECT id, ticket_id as "ticketId", ref_number as "refNumber", task_name as "taskName",
             assigned_to as "assignedTo", assigned_to_id as "assignedToId",
             target_date as "targetDate", priority, status, notes,
             created_at as "createdAt", updated_at as "updatedAt"
      FROM support_ticket_tasks
      WHERE ticket_id::text = $1
         OR ticket_id IN (SELECT id FROM support_tickets WHERE ticket_number = $1 OR id::text = $1)
      ORDER BY ref_number ASC, created_at ASC;
    `;
    const res = await query(sql, [ticketId]);
    return res.rows;
  }

  static async createTask(ticketId, data) {
    let resolvedTicketId = ticketId;
    const tRes = await query('SELECT id FROM support_tickets WHERE id::text = $1 OR ticket_number = $1 LIMIT 1;', [ticketId]);
    if (tRes.rows.length > 0) {
      resolvedTicketId = tRes.rows[0].id;
    }

    const sql = `
      INSERT INTO support_ticket_tasks (
        ticket_id, ref_number, task_name, assigned_to, assigned_to_id, target_date, priority, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, ticket_id as "ticketId", ref_number as "refNumber", task_name as "taskName",
                assigned_to as "assignedTo", assigned_to_id as "assignedToId",
                target_date as "targetDate", priority, status, notes,
                created_at as "createdAt", updated_at as "updatedAt";
    `;
    const params = [
      resolvedTicketId,
      data.refNumber || 'TSK-01',
      data.taskName || 'Untitled Task',
      data.assignedTo || null,
      data.assignedToId || null,
      data.targetDate || null,
      data.priority || 'Medium',
      data.status || 'Pending',
      data.notes || null,
    ];
    const res = await query(sql, params);
    return res.rows[0];
  }

  static async updateTask(ticketId, taskId, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.taskName !== undefined) {
      fields.push(`task_name = $${idx++}`);
      values.push(data.taskName);
    }
    if (data.assignedTo !== undefined) {
      fields.push(`assigned_to = $${idx++}`);
      values.push(data.assignedTo);
    }
    if (data.assignedToId !== undefined) {
      fields.push(`assigned_to_id = $${idx++}`);
      values.push(data.assignedToId);
    }
    if (data.targetDate !== undefined) {
      fields.push(`target_date = $${idx++}`);
      values.push(data.targetDate);
    }
    if (data.priority !== undefined) {
      fields.push(`priority = $${idx++}`);
      values.push(data.priority);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(data.status);
    }
    if (data.notes !== undefined) {
      fields.push(`notes = $${idx++}`);
      values.push(data.notes);
    }
    fields.push(`updated_at = NOW()`);

    let sql = '';
    if (ticketId) {
      values.push(ticketId);
      const ticketIdx = idx++;
      values.push(taskId);
      const taskIdx = idx++;
      sql = `
        UPDATE support_ticket_tasks
        SET ${fields.join(', ')}
        WHERE (ticket_id::text = $${ticketIdx} OR ticket_id IN (SELECT id FROM support_tickets WHERE ticket_number = $${ticketIdx} OR id::text = $${ticketIdx}))
          AND (id::text = $${taskIdx} OR ref_number = $${taskIdx})
        RETURNING id, ticket_id as "ticketId", ref_number as "refNumber", task_name as "taskName",
                  assigned_to as "assignedTo", assigned_to_id as "assignedToId",
                  target_date as "targetDate", priority, status, notes,
                  created_at as "createdAt", updated_at as "updatedAt";
      `;
    } else {
      values.push(taskId);
      sql = `
        UPDATE support_ticket_tasks
        SET ${fields.join(', ')}
        WHERE id::text = $${idx} OR ref_number = $${idx}
        RETURNING id, ticket_id as "ticketId", ref_number as "refNumber", task_name as "taskName",
                  assigned_to as "assignedTo", assigned_to_id as "assignedToId",
                  target_date as "targetDate", priority, status, notes,
                  created_at as "createdAt", updated_at as "updatedAt";
      `;
    }
    const res = await query(sql, values);
    return res.rows[0];
  }

  static async deleteTask(ticketId, taskId) {
    if (ticketId) {
      const sql = `
        DELETE FROM support_ticket_tasks 
        WHERE (ticket_id::text = $1 OR ticket_id IN (SELECT id FROM support_tickets WHERE ticket_number = $1 OR id::text = $1))
          AND (id::text = $2 OR ref_number = $2)
        RETURNING *;
      `;
      const res = await query(sql, [ticketId, taskId]);
      return res.rows[0];
    }
    const sql = `DELETE FROM support_ticket_tasks WHERE id::text = $1 OR ref_number = $1 RETURNING *;`;
    const res = await query(sql, [taskId]);
    return res.rows[0];
  }

  static async syncTasks(ticketId, tasks = []) {
    let resolvedTicketId = ticketId;
    const tRes = await query('SELECT id FROM support_tickets WHERE id::text = $1 OR ticket_number = $1 LIMIT 1;', [ticketId]);
    if (tRes.rows.length > 0) {
      resolvedTicketId = tRes.rows[0].id;
    }

    await query('DELETE FROM support_ticket_tasks WHERE ticket_id::text = $1;', [resolvedTicketId]);
    if (!Array.isArray(tasks) || tasks.length === 0) return [];

    const inserted = [];
    for (const t of tasks) {
      const res = await SupportTicketModel.createTask(resolvedTicketId, t);
      inserted.push(res);
    }
    return inserted;
  }
}

export default SupportTicketModel;

