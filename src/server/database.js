const fs = require('fs');
const path = require('path');

class EncountersDB {
    constructor(filePath = './encounters.json') {
        this.filePath = filePath;
        this.initialize();
    }

    initialize() {
        try {
            if (!fs.existsSync(this.filePath)) {
                fs.writeFileSync(this.filePath, JSON.stringify({ encounters: [] }, null, 2));
                console.log('Encounters JSON file created');
            }
        } catch (error) {
            console.error('Failed to initialize encounters file:', error);
        }
    }

    readEncounters() {
        try {
            const data = fs.readFileSync(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Failed to read encounters:', error);
            return { encounters: [] };
        }
    }

    writeEncounters(data) {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to write encounters:', error);
        }
    }

    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    insertEncounter(encounter) {
        try {
            const data = this.readEncounters();
            const id = this.generateId();

            const newEncounter = {
                id,
                timestamp: encounter.timestamp,
                date: encounter.date,
                duration_ms: encounter.duration_ms,
                total_damage: encounter.total_damage,
                player_count: encounter.player_count,
                data: encounter.data,
                created_at: new Date().toISOString()
            };

            data.encounters.unshift(newEncounter);
            this.writeEncounters(data);

            return { success: true, id };
        } catch (error) {
            console.error('Failed to insert encounter:', error);
            return { success: false, error: error.message };
        }
    }

    getEncounters(limit = 50) {
        try {
            const data = this.readEncounters();
            return data.encounters.slice(0, limit).map(e => ({
                id: e.id,
                timestamp: e.timestamp,
                date: e.date,
                duration_ms: e.duration_ms,
                total_damage: e.total_damage,
                player_count: e.player_count
            }));
        } catch (error) {
            console.error('Failed to get encounters:', error);
            return [];
        }
    }

    getEncounterById(id) {
        try {
            const data = this.readEncounters();
            return data.encounters.find(e => e.id === id) || null;
        } catch (error) {
            console.error('Failed to get encounter by id:', error);
            return null;
        }
    }

    deleteOldEncounters(keepCount = 100) {
        try {
            const data = this.readEncounters();
            const beforeCount = data.encounters.length;
            data.encounters = data.encounters.slice(0, keepCount);
            this.writeEncounters(data);

            const deleted = beforeCount - data.encounters.length;
            return { success: true, deleted };
        } catch (error) {
            console.error('Failed to delete old encounters:', error);
            return { success: false, error: error.message };
        }
    }

    close() {
        // No-op for JSON file
    }
}

module.exports = EncountersDB;
