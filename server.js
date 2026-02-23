const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const si = require('systeminformation');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public'), {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
}));

let previousStats = null;
let lastTime = Date.now();

async function getCPUData() {
    try {
        const [cpuInfo, cpuLoad, cpuTemp, mem, processes, fsStats] = await Promise.all([
            si.cpu(),
            si.currentLoad(),
            si.cpuTemperature(),
            si.mem(),
            si.processes(),
            si.fsStats()
        ]);
        
        const currentTime = Date.now();
        const timeDiff = (currentTime - lastTime) / 1000;
        
        let opsPerSec = 0;
        
        if (previousStats && timeDiff > 0) {
            const readOps = (fsStats.rx - previousStats.rx) / timeDiff;
            const writeOps = (fsStats.wx - previousStats.wx) / timeDiff;
            opsPerSec = Math.round(readOps + writeOps);
        }
        
        previousStats = { rx: fsStats.rx, wx: fsStats.wx };
        lastTime = currentTime;
        
        const theoreticalOps = Math.round(cpuInfo.speed * 1000000000 * cpuInfo.cores * (cpuLoad.currentLoad / 100));
        
        const topProcesses = processes.list
            .sort((a, b) => b.cpu - a.cpu)
            .slice(0, 5)
            .map(p => ({
                name: p.name,
                cpu: Math.round(p.cpu * 10) / 10,
                mem: Math.round(p.mem * 10) / 10
            }));

        const coresLoad = cpuLoad.cpus.map((core, index) => ({
            core: index + 1,
            load: Math.round(core.load * 10) / 10
        }));

        return {
            cpu: {
                manufacturer: cpuInfo.manufacturer,
                brand: cpuInfo.brand,
                cores: cpuInfo.cores,
                physicalCores: cpuInfo.physicalCores,
                speed: cpuInfo.speed,
                speedMax: cpuInfo.speedMax || cpuInfo.speed,
                usage: Math.round(cpuLoad.currentLoad * 10) / 10,
                temperature: cpuTemp.main || null,
                temperatureMax: cpuTemp.max || null
            },
            memory: {
                total: mem.total,
                used: mem.used,
                free: mem.free,
                usagePercent: Math.round((mem.used / mem.total) * 1000) / 10
            },
            processes: {
                running: processes.running,
                total: processes.all,
                top5: topProcesses
            },
            coresLoad: coresLoad,
            io: {
                opsPerSec: opsPerSec,
                estimatedOps: theoreticalOps
            },
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Error getting CPU data:', error);
        return null;
    }
}

wss.on('connection', (ws) => {
    console.log('Client connected');
    
    const sendData = async () => {
        const data = await getCPUData();
        if (data && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    };
    
    sendData();
    const interval = setInterval(sendData, 500);
    
    ws.on('close', () => {
        console.log('Client disconnected');
        clearInterval(interval);
    });
});

app.get('/api/cpu', async (req, res) => {
    const data = await getCPUData();
    if (data) {
        res.json(data);
    } else {
        res.status(500).json({ error: 'Failed to get CPU info' });
    }
});

server.listen(PORT, () => {
    console.log(`🖥️  CPU Monitor running at http://localhost:${PORT}`);
});
