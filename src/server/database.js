const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class EncountersDB {
    constructor(dbPath = './encounters.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.initialize();
    }

    initialize() {
        try {
            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL');

            this.db.exec(`
                CREATE TABLE IF NOT EXISTS encounters (
                    id TEXT PRIMARY KEY,
                    timestamp INTEGER NOT NULL,
                    date TEXT NOT NULL,
                    duration_ms INTEGER,
                    total_damage INTEGER,
                    player_count INTEGER,
                    data TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_encounters_timestamp ON encounters(timestamp DESC);
            `);

            console.log('SQLite database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize SQLite database:', error);
            throw error;
        }
    }

    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    insertEncounter(encounter) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO encounters (id, timestamp, date, duration_ms, total_damage, player_count, data)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const id = this.generateId();
            const result = stmt.run(
                id,
                encounter.timestamp,
                encounter.date,
                encounter.duration_ms,
                encounter.total_damage,
                encounter.player_count,
                JSON.stringify(encounter.data)
            );

            return { success: true, id };
        } catch (error) {
            console.error('Failed to insert encounter:', error);
            return { success: false, error: error.message };
        }
    }

    getEncounters(limit = 50) {
        try {
            const stmt = this.db.prepare(`
                SELECT id, timestamp, date, duration_ms, total_damage, player_count
                FROM encounters
                ORDER BY timestamp DESC
                LIMIT ?
            `);

            return stmt.all(limit);
        } catch (error) {
            console.error('Failed to get encounters:', error);
            return [];
        }
    }

    getEncounterById(id) {
        try {
            const stmt = this.db.prepare(`
                SELECT *
                FROM encounters
                WHERE id = ?
            `);

            const row = stmt.get(id);
            if (row) {
                row.data = JSON.parse(row.data);
            }
            return row;
        } catch (error) {
            console.error('Failed to get encounter by id:', error);
            return null;
        }
    }

    deleteOldEncounters(keepCount = 100) {
        try {
            const stmt = this.db.prepare(`
                DELETE FROM encounters
                WHERE id NOT IN (
                    SELECT id FROM encounters
                    ORDER BY timestamp DESC
                    LIMIT ?
                )
            `);

            const result = stmt.run(keepCount);
            return { success: true, deleted: result.changes };
        } catch (error) {
            console.error('Failed to delete old encounters:', error);
            return { success: false, error: error.message };
        }
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = EncountersDB;
