import { query } from './db.js';

/**
 * Initializes and verifies PostgreSQL tables and indexes for the Support Ticket Module
 * Fully independent of Prisma. Uses native PostgreSQL DDL.
 */
export async function initTicketDatabase() {
  try {
    console.log('[TicketDB] Initializing Support Ticket database tables...');

    // 1. Core support_tickets table
    await query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_number VARCHAR(64) UNIQUE NOT NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        source VARCHAR(50) NOT NULL DEFAULT 'Customer',
        customer_id VARCHAR(64) REFERENCES "Customer"(id) ON DELETE SET NULL,
        contact_id VARCHAR(64) REFERENCES "Contact"(id) ON DELETE SET NULL,
        contact_name VARCHAR(128),
        project_id VARCHAR(64) REFERENCES "Project"(id) ON DELETE SET NULL,
        handover_id VARCHAR(128),
        contract_id VARCHAR(64) REFERENCES contracts(id) ON DELETE SET NULL,
        affected_module VARCHAR(128),
        issue_type VARCHAR(64) NOT NULL DEFAULT 'Bug',
        priority VARCHAR(32) NOT NULL DEFAULT 'Medium',
        status VARCHAR(32) NOT NULL DEFAULT 'New',
        assigned_team VARCHAR(128),
        assigned_to VARCHAR(64) REFERENCES "Employee"(id) ON DELETE SET NULL,
        team_lead_id VARCHAR(64) REFERENCES "Employee"(id) ON DELETE SET NULL,
        qa_assigned_to VARCHAR(64) REFERENCES "Employee"(id) ON DELETE SET NULL,
        reported_by VARCHAR(128) NOT NULL,
        reported_by_id VARCHAR(64),
        reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        first_response_at TIMESTAMPTZ,
        first_response_due_at TIMESTAMPTZ,
        resolution_due_at TIMESTAMPTZ,
        resolved_at TIMESTAMPTZ,
        closed_at TIMESTAMPTZ,
        reopened_count INTEGER NOT NULL DEFAULT 0,
        steps_to_reproduce TEXT,
        expected_result TEXT,
        actual_result TEXT,
        environment VARCHAR(64) DEFAULT 'Production',
        browser_device VARCHAR(128),
        error_message TEXT,
        root_cause TEXT,
        workaround TEXT,
        resolution_description TEXT,
        created_by VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Attachments table
    await query(`
      CREATE TABLE IF NOT EXISTS support_ticket_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(512) NOT NULL,
        mime_type VARCHAR(128),
        file_size BIGINT,
        uploaded_by VARCHAR(128),
        uploaded_by_id VARCHAR(64),
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. History / Audit Log table
    await query(`
      CREATE TABLE IF NOT EXISTS support_ticket_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        action VARCHAR(64) NOT NULL,
        field_name VARCHAR(64),
        old_value TEXT,
        new_value TEXT,
        reason TEXT,
        performed_by VARCHAR(128) NOT NULL,
        performed_by_id VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 4. Assignments Log table
    await query(`
      CREATE TABLE IF NOT EXISTS support_ticket_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        team VARCHAR(128),
        assigned_to VARCHAR(64) REFERENCES "Employee"(id) ON DELETE SET NULL,
        assigned_to_name VARCHAR(128),
        assigned_by VARCHAR(64),
        assigned_by_name VARCHAR(128),
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        unassigned_at TIMESTAMPTZ,
        assignment_reason TEXT
      );
    `);

    // 5. Comments (Public Replies & Internal Notes) table
    await query(`
      CREATE TABLE IF NOT EXISTS support_ticket_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        type VARCHAR(32) NOT NULL DEFAULT 'public_reply',
        message TEXT NOT NULL,
        author_id VARCHAR(64),
        author_name VARCHAR(128) NOT NULL,
        author_role VARCHAR(64),
        attachments JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 6. Helpful performance Indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_customer ON support_tickets(customer_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_project ON support_tickets(project_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON support_ticket_comments(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON support_ticket_attachments(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON support_ticket_history(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_ticket_assignments_ticket_id ON support_ticket_assignments(ticket_id);
    `);

    console.log('[TicketDB] Support Ticket database tables initialized successfully.');
  } catch (error) {
    console.error('[TicketDB] Error initializing Support Ticket database:', error);
    throw error;
  }
}

export default initTicketDatabase;

