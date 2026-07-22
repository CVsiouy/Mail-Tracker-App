import * as SQLite from "expo-sqlite";
import type { AiStatus } from "@mailtracker/shared";
import type { EmailMeta, IEmailStore } from "../interfaces.js";

const DB_NAME = "mailtracker_emails.db";

interface Row {
  messageId: string;
  threadId: string | null;
  from_address: string;
  fromName: string | null;
  subject: string;
  snippet: string;
  category: string;
  aiStatus: string;
  aiConfidence: number | null;
  aiReason: string | null;
  receivedAtMs: number;
  isUnread: number;
  hasAttachment: number;
}

function rowToEmail(row: Row): EmailMeta {
  return {
    messageId: row.messageId,
    threadId: row.threadId,
    from: row.from_address,
    fromName: row.fromName,
    subject: row.subject,
    snippet: row.snippet,
    category: row.category,
    aiStatus: (row.aiStatus as AiStatus) ?? "pending",
    aiConfidence: row.aiConfidence,
    aiReason: row.aiReason,
    receivedAtMs: row.receivedAtMs,
    isUnread: Boolean(row.isUnread),
    hasAttachment: Boolean(row.hasAttachment),
  };
}

/**
 * SQLite local cache of the server-owned inbox — provides instant/offline paint.
 */
export class SqliteEmailStore implements IEmailStore {
  private db: SQLite.SQLiteDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private getDb(): SQLite.SQLiteDatabase {
    if (!this.db) throw new Error("Database not initialized. Call init() first.");
    return this.db;
  }

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      this.db = await SQLite.openDatabaseAsync(DB_NAME);
      await this.createTables();
    })();
    return this.initPromise;
  }

  private async createTables(): Promise<void> {
    await this.getDb().execAsync(`
      CREATE TABLE IF NOT EXISTS emails (
        messageId TEXT PRIMARY KEY,
        threadId TEXT,
        from_address TEXT NOT NULL,
        fromName TEXT,
        subject TEXT NOT NULL,
        snippet TEXT,
        category TEXT DEFAULT 'General',
        aiStatus TEXT DEFAULT 'pending',
        aiConfidence REAL,
        aiReason TEXT,
        receivedAtMs INTEGER NOT NULL,
        isUnread INTEGER DEFAULT 1,
        hasAttachment INTEGER DEFAULT 0,
        lastSyncedAt INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_emails_received ON emails(receivedAtMs DESC);
      CREATE INDEX IF NOT EXISTS idx_emails_category ON emails(category);
    `);
  }

  async saveEmails(emails: EmailMeta[]): Promise<void> {
    const db = this.getDb();
    const now = Date.now();
    for (const e of emails) {
      await db.runAsync(
        `INSERT OR REPLACE INTO emails (
          messageId, threadId, from_address, fromName, subject, snippet, category,
          aiStatus, aiConfidence, aiReason, receivedAtMs, isUnread, hasAttachment, lastSyncedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          e.messageId,
          e.threadId,
          e.from,
          e.fromName,
          e.subject,
          e.snippet,
          e.category,
          e.aiStatus,
          e.aiConfidence,
          e.aiReason,
          e.receivedAtMs,
          e.isUnread ? 1 : 0,
          e.hasAttachment ? 1 : 0,
          now,
        ],
      );
    }
  }

  async getEmails(limit = 50, offset = 0): Promise<EmailMeta[]> {
    const rows = await this.getDb().getAllAsync<Row>(
      `SELECT messageId, threadId, from_address, fromName, subject, snippet, category,
              aiStatus, aiConfidence, aiReason, receivedAtMs, isUnread, hasAttachment
       FROM emails ORDER BY receivedAtMs DESC LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    return rows.map(rowToEmail);
  }

  async getEmail(messageId: string): Promise<EmailMeta | null> {
    const row = await this.getDb().getFirstAsync<Row>(
      `SELECT messageId, threadId, from_address, fromName, subject, snippet, category,
              aiStatus, aiConfidence, aiReason, receivedAtMs, isUnread, hasAttachment
       FROM emails WHERE messageId = ?`,
      [messageId],
    );
    return row ? rowToEmail(row) : null;
  }

  async updateEmail(messageId: string, updates: Partial<EmailMeta>): Promise<void> {
    const sets: string[] = [];
    const values: (string | number | null)[] = [];
    const push = (col: string, val: string | number | null) => {
      sets.push(`${col} = ?`);
      values.push(val);
    };

    if (updates.from !== undefined) push("from_address", updates.from);
    if (updates.fromName !== undefined) push("fromName", updates.fromName);
    if (updates.subject !== undefined) push("subject", updates.subject);
    if (updates.snippet !== undefined) push("snippet", updates.snippet);
    if (updates.category !== undefined) push("category", updates.category);
    if (updates.aiStatus !== undefined) push("aiStatus", updates.aiStatus);
    if (updates.isUnread !== undefined) push("isUnread", updates.isUnread ? 1 : 0);
    if (updates.hasAttachment !== undefined) push("hasAttachment", updates.hasAttachment ? 1 : 0);

    if (sets.length === 0) return;
    values.push(messageId);
    await this.getDb().runAsync(`UPDATE emails SET ${sets.join(", ")} WHERE messageId = ?`, values);
  }

  async deleteEmail(messageId: string): Promise<void> {
    await this.getDb().runAsync("DELETE FROM emails WHERE messageId = ?", [messageId]);
  }

  async clearAll(): Promise<void> {
    await this.getDb().runAsync("DELETE FROM emails");
  }

  async getCount(): Promise<number> {
    const result = await this.getDb().getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM emails",
    );
    return result?.count ?? 0;
  }
}

export const emailStore = new SqliteEmailStore();
