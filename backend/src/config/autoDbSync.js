import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureSystemRolesService } from '../services/accessControl.service.js';
import { prisma } from './prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '../../');

/**
 * Automatically synchronizes existing Contact, Lead, and Meeting relationships in PostgreSQL
 */
export async function syncExistingContactLeadMeetings() {
  try {
    // 1. Link Contacts to existing Leads by phone, email, or name
    await prisma.$executeRawUnsafe(`
      UPDATE "Contact" c
      SET "internalReference" = l."leadId", "updatedAt" = NOW()
      FROM "Lead" l
      WHERE (c."internalReference" IS NULL OR c."internalReference" = '')
        AND (
          (c.phone IS NOT NULL AND c.phone != '' AND c.phone = l.phone)
          OR (c.email IS NOT NULL AND c.email != '' AND LOWER(c.email) = LOWER(l.email))
          OR (LOWER(c.name) = LOWER(l.name) AND c."companyName" IS NOT NULL AND LOWER(c."companyName") = LOWER(l."companyName"))
        )
    `).catch(() => {});

    // 2. Synchronize ScheduledMeeting records:
    // 2a. Set lead_id for meetings where contactId points to a converted contact
    await prisma.$executeRawUnsafe(`
      UPDATE "ScheduledMeeting" m
      SET "lead_id" = l.id, "updatedAt" = NOW()
      FROM "Contact" c
      JOIN "Lead" l ON (
        c."internalReference" = l."leadId" 
        OR (c.phone IS NOT NULL AND c.phone != '' AND c.phone = l.phone)
        OR (c.email IS NOT NULL AND c.email != '' AND LOWER(c.email) = LOWER(l.email))
      )
      WHERE (m."contactId" = c.id OR m."contactId" = c."contactId")
        AND (m."lead_id" IS NULL OR m."lead_id" = c.id OR m."lead_id" = c."contactId" OR m."lead_id" = '')
    `).catch(() => {});

    // 2b. Set contactId for meetings where lead_id points to a lead with a contact
    await prisma.$executeRawUnsafe(`
      UPDATE "ScheduledMeeting" m
      SET "contactId" = c.id, "updatedAt" = NOW()
      FROM "Lead" l
      JOIN "Contact" c ON (
        c."internalReference" = l."leadId" 
        OR (c.phone IS NOT NULL AND c.phone != '' AND c.phone = l.phone)
        OR (c.email IS NOT NULL AND c.email != '' AND LOWER(c.email) = LOWER(l.email))
      )
      WHERE (m."lead_id" = l.id OR m."lead_id" = l."leadId")
        AND (m."contactId" IS NULL OR m."contactId" = l.id OR m."contactId" = l."leadId" OR m."contactId" = '')
    `).catch(() => {});

    // 3. Synchronize activity timeline records
    await prisma.$executeRawUnsafe(`
      UPDATE activities a
      SET "leadId" = l.id, "leadCode" = l."leadId", "leadName" = l.name, "updatedAt" = NOW()
      FROM "Contact" c
      JOIN "Lead" l ON (
        c."internalReference" = l."leadId" 
        OR (c.phone IS NOT NULL AND c.phone != '' AND c.phone = l.phone)
      )
      WHERE (a."contactId" = c.id OR a."contactId" = c."contactId")
        AND (a."leadId" IS NULL OR a."leadId" = c.id OR a."leadId" = '')
    `).catch(() => {});

    // 4. Synchronize call logs
    await prisma.$executeRawUnsafe(`
      UPDATE "CallLog" cl
      SET "lead_id" = l.id, "updatedAt" = NOW()
      FROM "Contact" c
      JOIN "Lead" l ON (
        c."internalReference" = l."leadId" 
        OR (c.phone IS NOT NULL AND c.phone != '' AND c.phone = l.phone)
      )
      WHERE (cl."contactId" = c.id OR cl."contactId" = c."contactId")
        AND (cl."lead_id" IS NULL OR cl."lead_id" = c.id OR cl."lead_id" = '')
    `).catch(() => {});

    // 5. Synchronize Qualified status from Contact back to BulkUploadContact
    await prisma.$executeRawUnsafe(`
      UPDATE "BulkUploadContact" b
      SET "status" = c."status",
          "stage" = c."stage",
          "contactMode" = COALESCE(c."contactMode", b."contactMode"),
          "assignmentStatus" = c."assignmentStatus",
          "assignedTo" = COALESCE(c."assignedTo", b."assignedTo"),
          "assignedToName" = COALESCE(c."assignedToName", b."assignedToName"),
          "isImportedToContact" = true,
          "importedContactId" = c."id",
          "updatedAt" = NOW()
      FROM "Contact" c
      WHERE (b."importedContactId" = c."id"
             OR (b."phone" IS NOT NULL AND b."phone" != '' AND b."phone" = c."phone")
             OR (b."bulkId" IS NOT NULL AND b."bulkId" != '' AND (b."bulkId" = c."contactId" OR b."bulkId" = c."internalReference")))
        AND (c."status" = 'Qualified' OR c."qualificationStatus" = 'Qualified')
        AND (b."status" != 'Qualified')
    `).catch(() => {});

    // 6. Ensure Lead priority column exists and sync from Contact / BulkUploadContact
    // 7. Ensure proposals rejectionReason column exists
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
    `).catch(() => {});
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'Medium';
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      UPDATE "Lead" l
      SET "priority" = COALESCE(c."priority", 'Medium'),
          "updatedAt" = NOW()
      FROM "Contact" c
      WHERE (c."internalReference" = l."leadId"
             OR (l."phone" IS NOT NULL AND l."phone" != '' AND l."phone" = c."phone")
             OR (l."email" IS NOT NULL AND l."email" != '' AND LOWER(l."email") = LOWER(c."email"))
             OR l.id = c.id
             OR l."leadId" = c."contactId")
        AND c."priority" IS NOT NULL
        AND (l."priority" IS NULL OR l."priority" = '' OR l."priority" = 'Medium');
    `).catch(() => {});

    // 7. Update leads converted from qualified contacts to have status 'New' and stage 'Initialization'
    await prisma.$executeRawUnsafe(`
      UPDATE "Lead" l
      SET "status" = 'New',
          "stage" = 'Initialization',
          "updatedAt" = NOW()
      FROM "Contact" c
      WHERE (c."internalReference" = l."leadId"
             OR (l."phone" IS NOT NULL AND l."phone" != '' AND l."phone" = c."phone")
             OR (l."email" IS NOT NULL AND l."email" != '' AND LOWER(l."email") = LOWER(c."email"))
             OR l.id = c.id
             OR l."leadId" = c."contactId")
        AND (c."status" = 'Qualified' OR c."qualificationStatus" = 'Qualified')
        AND (l."status" = 'Qualified' OR l."stage" = 'Qualification');
    `).catch(() => {});

    // 8. Standardize all lead statuses to the 4 official statuses: New, In Progress, Completed, Lost
    await prisma.$executeRawUnsafe(`
      UPDATE "Lead"
      SET "status" = 'Completed', "updatedAt" = NOW()
      WHERE "status" IN ('Won', 'Closed Won', 'Complete');
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      UPDATE "Lead"
      SET "status" = 'Lost', "updatedAt" = NOW()
      WHERE "status" IN ('Disqualified', 'Unqualified', 'Cancelled');
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      UPDATE "Lead"
      SET "status" = 'In Progress', "updatedAt" = NOW()
      WHERE "status" IN ('Contacted', 'Active', 'Follow-up', 'Interested', 'Proposal Sent', 'In Negotiation');
    `).catch(() => {});
  } catch (err) {
    console.warn('[syncExistingContactLeadMeetings Notice]:', err.message || err);
  }
}

/**
 * Automatically creates and syncs PostgreSQL Database SQL tables from Prisma Schema
 * and ensures system roles (Super Admin, Admin, Project Manager, Sales Executive) exist.
 */
export async function autoSyncDatabase() {
  try {
    console.log('🔄 [Auto-Sync] Initializing system roles...');
    await ensureSystemRolesService();
    console.log('✅ [Auto-Sync] System roles initialized successfully!');
  } catch (error) {
    console.error(
      '❌ [Auto-Sync] System role initialization failed:',
      error.message || error
    );
  }
}

export default autoSyncDatabase;

