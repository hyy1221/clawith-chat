import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// Database file path
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'chat.db')

let db: Database.Database | null = null

/**
 * Initialize the database
 */
export function initDatabase(): Database.Database {
  if (db) return db

  // Ensure directory exists
  const dbDir = path.dirname(DB_PATH)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  db = new Database(DB_PATH)

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL')

  // Create tables
  createTables(db)

  console.log(`[DB] Database initialized at ${DB_PATH}`)

  return db
}

/**
 * Create database tables
 */
function createTables(database: Database.Database): void {
  // Messages table
  database.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      session_id TEXT,
      sender_id TEXT NOT NULL,
      sender_name TEXT,
      sender_avatar TEXT,
      sender_role TEXT,
      relay_source TEXT,
      type TEXT NOT NULL DEFAULT 'text',
      content TEXT NOT NULL,
      quote_id TEXT,
      mentions TEXT,
      created_at INTEGER NOT NULL,
      status TEXT DEFAULT 'sent',
      reactions TEXT,
      read_by TEXT,
      edited_at INTEGER,
      edit_history TEXT,
      is_deleted INTEGER DEFAULT 0,
      INDEX idx_group_id (group_id),
      INDEX idx_sender_id (sender_id),
      INDEX idx_created_at (created_at)
    )
  `)

  // Groups table
  database.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      description TEXT,
      announcement TEXT,
      avatar TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Group members table
  database.exec(`
    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_avatar TEXT,
      role TEXT DEFAULT 'member',
      presence TEXT DEFAULT 'offline',
      last_seen INTEGER,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (group_id, user_id),
      INDEX idx_user_id (user_id)
    )
  `)

  // Presence table
  database.exec(`
    CREATE TABLE IF NOT EXISTS presence (
      user_id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'offline',
      last_seen INTEGER
    )
  `)

  console.log('[DB] Tables created successfully')
}

/**
 * Get the database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

/**
 * Message operations
 */
export const messageOps = {
  insert(message: MessageRecord): void {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO messages
      (id, group_id, session_id, sender_id, sender_name, sender_avatar, sender_role,
       relay_source, type, content, quote_id, mentions, created_at, status,
       reactions, read_by, edited_at, edit_history, is_deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      message.id,
      message.group_id,
      message.session_id,
      message.sender_id,
      message.sender_name,
      message.sender_avatar,
      message.sender_role,
      message.relay_source,
      message.type,
      JSON.stringify(message.content),
      message.quote_id,
      message.mentions ? JSON.stringify(message.mentions) : null,
      message.created_at,
      message.status,
      message.reactions ? JSON.stringify(message.reactions) : null,
      message.read_by ? JSON.stringify(message.read_by) : null,
      message.edited_at,
      message.edit_history ? JSON.stringify(message.edit_history) : null,
      message.is_deleted ? 1 : 0
    )
  },

  getByGroupId(groupId: string, limit = 200, offset = 0): MessageRecord[] {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM messages
      WHERE group_id = ? AND is_deleted = 0
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)

    const rows = stmt.all(groupId, limit, offset) as any[]
    return rows.map(parseMessageRow)
  },

  getById(id: string): MessageRecord | null {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM messages WHERE id = ?')
    const row = stmt.get(id) as any
    return row ? parseMessageRow(row) : null
  },

  update(messageId: string, updates: Partial<MessageRecord>): void {
    const db = getDatabase()
    const fields: string[] = []
    const values: any[] = []

    if (updates.content !== undefined) {
      fields.push('content = ?')
      values.push(JSON.stringify(updates.content))
    }
    if (updates.edited_at !== undefined) {
      fields.push('edited_at = ?')
      values.push(updates.edited_at)
    }
    if (updates.edit_history !== undefined) {
      fields.push('edit_history = ?')
      values.push(JSON.stringify(updates.edit_history))
    }
    if (updates.reactions !== undefined) {
      fields.push('reactions = ?')
      values.push(JSON.stringify(updates.reactions))
    }
    if (updates.read_by !== undefined) {
      fields.push('read_by = ?')
      values.push(JSON.stringify(updates.read_by))
    }
    if (updates.is_deleted !== undefined) {
      fields.push('is_deleted = ?')
      values.push(updates.is_deleted ? 1 : 0)
    }
    if (updates.status !== undefined) {
      fields.push('status = ?')
      values.push(updates.status)
    }

    if (fields.length === 0) return

    values.push(messageId)
    const stmt = db.prepare(`UPDATE messages SET ${fields.join(', ')} WHERE id = ?`)
    stmt.run(...values)
  },

  search(keyword: string, groupId?: string, limit = 50): MessageRecord[] {
    const db = getDatabase()
    let query = `
      SELECT * FROM messages
      WHERE is_deleted = 0 AND content LIKE ?
    `
    const params: any[] = [`%${keyword}%`]

    if (groupId) {
      query += ' AND group_id = ?'
      params.push(groupId)
    }

    query += ' ORDER BY created_at DESC LIMIT ?'
    params.push(limit)

    const stmt = db.prepare(query)
    const rows = stmt.all(...params) as any[]
    return rows.map(parseMessageRow)
  },

  deleteOldMessages(daysOld = 30): number {
    const db = getDatabase()
    const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000
    const stmt = db.prepare('DELETE FROM messages WHERE created_at < ?')
    const result = stmt.run(cutoff)
    return result.changes
  }
}

/**
 * Group operations
 */
export const groupOps = {
  create(group: GroupRecord): void {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO groups
      (id, name, owner_id, description, announcement, avatar, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      group.id,
      group.name,
      group.owner_id,
      group.description,
      group.announcement,
      group.avatar,
      group.created_at,
      group.updated_at
    )
  },

  getById(id: string): GroupRecord | null {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM groups WHERE id = ?')
    const row = stmt.get(id) as any
    return row || null
  },

  update(id: string, updates: Partial<GroupRecord>): void {
    const db = getDatabase()
    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description)
    }
    if (updates.announcement !== undefined) {
      fields.push('announcement = ?')
      values.push(updates.announcement)
    }
    if (updates.avatar !== undefined) {
      fields.push('avatar = ?')
      values.push(updates.avatar)
    }

    if (fields.length === 0) return

    fields.push('updated_at = ?')
    values.push(Date.now())
    values.push(id)

    const stmt = db.prepare(`UPDATE groups SET ${fields.join(', ')} WHERE id = ?`)
    stmt.run(...values)
  },

  getAll(): GroupRecord[] {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM groups ORDER BY updated_at DESC')
    return stmt.all() as GroupRecord[]
  }
}

/**
 * Member operations
 */
export const memberOps = {
  add(member: MemberRecord): void {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO group_members
      (group_id, user_id, user_name, user_avatar, role, presence, last_seen, joined_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      member.group_id,
      member.user_id,
      member.user_name,
      member.user_avatar,
      member.role,
      member.presence,
      member.last_seen,
      member.joined_at
    )
  },

  remove(groupId: string, userId: string): void {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?')
    stmt.run(groupId, userId)
  },

  getByGroupId(groupId: string): MemberRecord[] {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM group_members WHERE group_id = ?')
    return stmt.all(groupId) as MemberRecord[]
  },

  getByUserId(userId: string): MemberRecord[] {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM group_members WHERE user_id = ?')
    return stmt.all(userId) as MemberRecord[]
  },

  updatePresence(groupId: string, userId: string, presence: string): void {
    const db = getDatabase()
    const stmt = db.prepare(`
      UPDATE group_members SET presence = ?, last_seen = ? WHERE group_id = ? AND user_id = ?
    `)
    stmt.run(presence, Date.now(), groupId, userId)
  }
}

/**
 * Presence operations
 */
export const presenceOps = {
  update(userId: string, status: string): void {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO presence (user_id, status, last_seen)
      VALUES (?, ?, ?)
    `)
    stmt.run(userId, status, Date.now())
  },

  get(userId: string): { status: string; last_seen: number } | null {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM presence WHERE user_id = ?')
    return stmt.get(userId) as any || null
  },

  getAll(): Array<{ user_id: string; status: string; last_seen: number }> {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM presence')
    return stmt.all() as any[]
  }
}

// Helper to parse message row
function parseMessageRow(row: any): MessageRecord {
  return {
    id: row.id,
    group_id: row.group_id,
    session_id: row.session_id,
    sender_id: row.sender_id,
    sender_name: row.sender_name,
    sender_avatar: row.sender_avatar,
    sender_role: row.sender_role,
    relay_source: row.relay_source,
    type: row.type,
    content: JSON.parse(row.content || '{}'),
    quote_id: row.quote_id,
    mentions: row.mentions ? JSON.parse(row.mentions) : null,
    created_at: row.created_at,
    status: row.status,
    reactions: row.reactions ? JSON.parse(row.reactions) : null,
    read_by: row.read_by ? JSON.parse(row.read_by) : null,
    edited_at: row.edited_at,
    edit_history: row.edit_history ? JSON.parse(row.edit_history) : null,
    is_deleted: Boolean(row.is_deleted)
  }
}

// Types
export interface MessageRecord {
  id: string
  group_id: string
  session_id?: string
  sender_id: string
  sender_name?: string
  sender_avatar?: string
  sender_role?: string
  relay_source?: string
  type: string
  content: any
  quote_id?: string
  mentions?: string[]
  created_at: number
  status?: string
  reactions?: Array<{ emoji: string; userIds: string[] }>
  read_by?: Array<{ userId: string; readAt: number }>
  edited_at?: number
  edit_history?: Array<{ content: any; editedAt: number }>
  is_deleted?: boolean
}

export interface GroupRecord {
  id: string
  name: string
  owner_id: string
  description?: string
  announcement?: string
  avatar?: string
  created_at: number
  updated_at: number
}

export interface MemberRecord {
  group_id: string
  user_id: string
  user_name: string
  user_avatar?: string
  role: string
  presence?: string
  last_seen?: number
  joined_at: number
}

export default { initDatabase, getDatabase, messageOps, groupOps, memberOps, presenceOps }
