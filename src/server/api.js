const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');
const fsPromises = require('fs').promises;
const fs = require('fs');
const supabase = require('./supabaseClient');

const SETTINGS_PATH = path.join('./settings.json');
const LOGS_DPS_PATH = path.join('./logs_dps.json');

function initializeApi(app, server, io, userDataManager, logger, globalSettings) {
    app.use(cors());
    app.use(express.json());
    app.use(express.static(path.join(__dirname, '..', '..', 'public'))); // Ajustar la ruta

    app.get('/icon.png', (req, res) => {
        res.sendFile(path.join(__dirname, '..', '..', 'icon.png')); // Ajustar la ruta
    });

    app.get('/favicon.ico', (req, res) => {
        res.sendFile(path.join(__dirname, '..', '..', 'icon.ico')); // Ajustar la ruta
    });

    app.get('/api/data', (req, res) => {
        const userData = userDataManager.getAllUsersData();
        const data = {
            code: 0,
            user: userData,
        };
        res.json(data);
    });

    app.get('/api/enemies', (req, res) => {
        const enemiesData = userDataManager.getAllEnemiesData();
        const data = {
            code: 0,
            enemy: enemiesData,
        };
        res.json(data);
    });

    app.get('/api/clear', async (req, res) => {
        try {
            // Save current encounter to database before clearing
            const userData = userDataManager.getAllUsersData();
            const userArray = Object.values(userData).filter(u => u.total_damage && u.total_damage.total > 0);

            if (userArray.length > 0) {
                const totalDamage = userArray.reduce((acc, u) => acc + (u.total_damage?.total || 0), 0);
                const timestamp = userDataManager.startTime;
                const durationMs = Date.now() - timestamp;

                const { error } = await supabase
                    .from('encounters')
                    .insert({
                        timestamp: timestamp,
                        date: new Date(timestamp).toISOString(),
                        duration_ms: durationMs,
                        total_damage: totalDamage,
                        player_count: userArray.length,
                        data: userData
                    });

                if (error) {
                    logger.error('Failed to save encounter:', error);
                }
            }

            userDataManager.clearAll(globalSettings);
            console.log('¡Estadísticas limpiadas!');
            res.json({
                code: 0,
                msg: '¡Estadísticas limpiadas!',
            });
        } catch (error) {
            logger.error('Error in /api/clear:', error);
            userDataManager.clearAll(globalSettings);
            res.json({
                code: 0,
                msg: '¡Estadísticas limpiadas!',
            });
        }
    });

    app.post('/api/clear-logs', async (req, res) => {
        const logsBaseDir = path.join(__dirname, '..', '..', 'logs'); // Ajustar la ruta
        try {
            const files = await fsPromises.readdir(logsBaseDir);
            for (const file of files) {
                const filePath = path.join(logsBaseDir, file);
                await fsPromises.rm(filePath, { recursive: true, force: true });
            }
            if (fs.existsSync(LOGS_DPS_PATH)) {
                await fsPromises.unlink(LOGS_DPS_PATH);
            }
            console.log('¡Todos los archivos y directorios de log han sido limpiados!');
            res.json({
                code: 0,
                msg: '¡Todos los archivos y directorios de log han sido limpiados!',
            });
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('El directorio de logs no existe, no hay logs que limpiar.');
                res.json({
                    code: 0,
                    msg: 'El directorio de logs no existe, no hay logs que limpiar.',
                });
            } else {
                logger.error('Failed to clear log files:', error);
                res.status(500).json({
                    code: 1,
                    msg: 'Failed to clear log files.',
                    error: error.message,
                });
            }
        }
    });

    app.post('/api/pause', (req, res) => {
        const { paused } = req.body;
        globalSettings.isPaused = paused; // Actualizar el estado de pausa en globalSettings
        console.log(`¡Estadísticas ${globalSettings.isPaused ? 'pausadas' : 'reanudadas'}!`);
        res.json({
            code: 0,
            msg: `¡Estadísticas ${globalSettings.isPaused ? 'pausadas' : 'reanudadas'}!`,
            paused: globalSettings.isPaused,
        });
    });

    app.get('/api/pause', (req, res) => {
        res.json({
            code: 0,
            paused: globalSettings.isPaused,
        });
    });

    app.post('/api/set-username', (req, res) => {
        const { uid, name } = req.body;
        if (uid && name) {
            const userId = parseInt(uid, 10);
            if (!isNaN(userId)) {
                userDataManager.setName(userId, name);
                console.log(`Manualmente se asignó el nombre '${name}' al UID ${userId}`);
                res.json({ code: 0, msg: 'Nombre de usuario actualizado correctamente.' });
            } else {
                res.status(400).json({ code: 1, msg: 'UID inválido.' });
            }
        } else {
            res.status(400).json({ code: 1, msg: 'Faltan UID o nombre.' });
        }
    });

    app.get('/api/skill/:uid', (req, res) => {
        const uid = parseInt(req.params.uid);
        const skillData = userDataManager.getUserSkillData(uid);

        if (!skillData) {
            return res.status(404).json({
                code: 1,
                msg: 'User not found',
            });
        }

        res.json({
            code: 0,
            data: skillData,
        });
    });

    app.get('/api/history/:timestamp/summary', async (req, res) => {
        const { timestamp } = req.params;
        const historyFilePath = path.join('./logs', timestamp, 'summary.json'); // Ajustar la ruta

        try {
            const data = await fsPromises.readFile(historyFilePath, 'utf8');
            const summaryData = JSON.parse(data);
            res.json({
                code: 0,
                data: summaryData,
            });
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.warn('History summary file not found:', error);
                res.status(404).json({
                    code: 1,
                    msg: 'History summary file not found',
                });
            } else {
                logger.error('Failed to read history summary file:', error);
                res.status(500).json({
                    code: 1,
                    msg: 'Failed to read history summary file',
                });
            }
        }
    });

    app.get('/api/history/:timestamp/data', async (req, res) => {
        const { timestamp } = req.params;
        const historyFilePath = path.join('./logs', timestamp, 'allUserData.json'); // Ajustar la ruta

        try {
            const data = await fsPromises.readFile(historyFilePath, 'utf8');
            const userData = JSON.parse(data);
            res.json({
                code: 0,
                user: userData,
            });
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.warn('History data file not found:', error);
                res.status(404).json({
                    code: 1,
                    msg: 'History data file not found',
                });
            } else {
                logger.error('Failed to read history data file:', error);
                res.status(500).json({
                    code: 1,
                    msg: 'Failed to read history data file',
                });
            }
        }
    });

    app.get('/api/history/:timestamp/skill/:uid', async (req, res) => {
        const { timestamp, uid } = req.params;
        const historyFilePath = path.join('./logs', timestamp, 'users', `${uid}.json`); // Ajustar la ruta

        try {
            const data = await fsPromises.readFile(historyFilePath, 'utf8');
            const skillData = JSON.parse(data);
            res.json({
                code: 0,
                data: skillData,
            });
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.warn('History skill file not found:', error);
                res.status(404).json({
                    code: 1,
                    msg: 'History skill file not found',
                });
            } else {
                logger.error('Failed to read history skill file:', error);
                res.status(500).json({
                    code: 1,
                    msg: 'Failed to load history skill file',
                });
            }
        }
    });

    app.get('/api/history/:timestamp/download', async (req, res) => {
        const { timestamp } = req.params;
        const historyFilePath = path.join('./logs', timestamp, 'fight.log'); // Ajustar la ruta
        res.download(historyFilePath, `fight_${timestamp}.log`);
    });

    app.get('/api/history/list', async (req, res) => {
        try {
            const data = (await fsPromises.readdir('./logs', { withFileTypes: true })) // Ajustar la ruta
                .filter((e) => e.isDirectory() && /^\d+$/.test(e.name))
                .map((e) => e.name);
            res.json({
                code: 0,
                data: data,
            });
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.warn('History path not found:', error);
                res.status(404).json({
                    code: 1,
                    msg: 'History path not found',
                });
            } else {
                logger.error('Failed to load history path:', error);
                res.status(500).json({
                    code: 1,
                    msg: 'Failed to load history path',
                });
            }
        }
    });

    app.get('/api/settings', async (req, res) => {
        res.json({ code: 0, data: globalSettings });
    });

    app.post('/api/settings', async (req, res) => {
        const newSettings = req.body;
        Object.assign(globalSettings, newSettings); // Actualizar globalSettings directamente
        await fsPromises.writeFile(SETTINGS_PATH, JSON.stringify(globalSettings, null, 2), 'utf8');
        res.json({ code: 0, data: globalSettings });
    });

    app.get('/api/diccionario', async (req, res) => {
        const diccionarioPath = path.join(__dirname, '..', '..', 'diccionario.json'); // Ajustar la ruta
        try {
            const data = await fsPromises.readFile(diccionarioPath, 'utf8');
            if (data.trim() === '') {
                res.json({});
            } else {
                res.json(JSON.parse(data));
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.warn('diccionario.json not found, returning empty object.');
                res.json({});
            } else {
                logger.error('Failed to read or parse diccionario.json:', error);
                res.status(500).json({ code: 1, msg: 'Failed to load diccionario', error: error.message });
            }
        }
    });

    function guardarLogDps(log) {
        if (!globalSettings.enableDpsLog) return;

        let logs = [];
        if (fs.existsSync(LOGS_DPS_PATH)) {
            logs = JSON.parse(fs.readFileSync(LOGS_DPS_PATH, 'utf8'));
        }
        logs.unshift(log);
        fs.writeFileSync(LOGS_DPS_PATH, JSON.stringify(logs, null, 2));
    }

    app.post('/guardar-log-dps', (req, res) => {
        const log = req.body;
        guardarLogDps(log);
        res.sendStatus(200);
    });

    app.get('/logs-dps', (req, res) => {
        let logs = [];
        if (fs.existsSync(LOGS_DPS_PATH)) {
            logs = JSON.parse(fs.readFileSync(LOGS_DPS_PATH, 'utf8'));
        }
        res.json(logs);
    });

    // Get list of saved encounters
    app.get('/api/encounters', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('encounters')
                .select('id, timestamp, date, duration_ms, total_damage, player_count')
                .order('timestamp', { ascending: false })
                .limit(50);

            if (error) {
                logger.error('Failed to fetch encounters:', error);
                return res.status(500).json({ code: 1, msg: 'Failed to fetch encounters' });
            }

            res.json({ code: 0, data: data || [] });
        } catch (error) {
            logger.error('Error in /api/encounters:', error);
            res.status(500).json({ code: 1, msg: 'Internal server error' });
        }
    });

    // Get specific encounter data
    app.get('/api/encounters/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { data, error } = await supabase
                .from('encounters')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (error) {
                logger.error('Failed to fetch encounter:', error);
                return res.status(500).json({ code: 1, msg: 'Failed to fetch encounter' });
            }

            if (!data) {
                return res.status(404).json({ code: 1, msg: 'Encounter not found' });
            }

            res.json({ code: 0, encounter: data });
        } catch (error) {
            logger.error('Error in /api/encounters/:id:', error);
            res.status(500).json({ code: 1, msg: 'Internal server error' });
        }
    });

    io.on('connection', (socket) => {
        console.log('Cliente WebSocket conectado: ' + socket.id);

        socket.on('disconnect', () => {
            console.log('Cliente WebSocket desconectado: ' + socket.id);
        });
    });

    setInterval(() => {
        if (!globalSettings.isPaused) {
            const userData = userDataManager.getAllUsersData();
            const data = {
                code: 0,
                user: userData,
            };
            io.emit('data', data);
        }
    }, 100);
}

module.exports = initializeApi;
