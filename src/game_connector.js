const fs = require('fs');
const io = require('socket.io-client');
const path = require('path');
const tmi = require('tmi.js'); 
const { LiveChat } = require('youtube-chat');
const Config = require('./config_manager');

const MOD_SUFFIX = path.join('bin', 'x64', 'plugins', 'cyber_engine_tweaks', 'mods', 'RogueScriptsAndStreamersTool', 'cmd.txt');

class GameConnector {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.socket = null;        
        this.twitchClient = null;  
        this.youtubeClient = null; 
        
        this.config = Config.get();
        this.isConnected = false;
        this.finalGamePath = "";
        
        // Сразу пытаемся определить путь при старте
        this.resolvePath(this.config.gamePath);
    }

    reloadConfig() {
        this.config = Config.get();
        this.resolvePath(this.config.gamePath);
        this.log("Настройки обновлены.", 'info');
    }

    log(msg, type = 'info') {
        if (this.mainWindow) {
            this.mainWindow.webContents.send('add-log', { msg, type });
        }
        console.log(`[${type}] ${msg}`);
    }

    sendStatus() {
        if (this.mainWindow) {
            this.mainWindow.webContents.send('connection-status', this.isConnected);
        }
    }

    resolvePath(inputPath) {
        if (!inputPath) return;
        let clean = inputPath.replace(/['"]/g, '').trim();
        
        if (clean.endsWith('cmd.txt')) {
            this.finalGamePath = clean;
        } else if (clean.endsWith('RogueScriptsAndStreamersTool')) {
            this.finalGamePath = path.join(clean, 'cmd.txt');
        } else {
            this.finalGamePath = path.join(clean, MOD_SUFFIX);
        }
    }

    connect() {
        if (this.isConnected) return;

        if (!this.finalGamePath) {
            this.resolvePath(this.config.gamePath);
            if(!this.finalGamePath) {
                this.log("Некорректный путь к игре!", 'error');
                return;
            }
        }

        if (this.config.token) {
            this.connectDonationAlerts();
        } else {
            this.log("DA Token не задан. Пропускаем.", 'warning');
        }

        if (this.config.twitchChannel) {
            this.connectTwitch(this.config.twitchChannel);
        } else {
            this.log("Twitch канал не указан. Пропускаем.", 'warning');
        }

        if (this.config.youtubeHandle) {
            this.connectYouTube(this.config.youtubeHandle);
        } else {
            this.log("YouTube Handle не указан. Пропускаем.", 'warning');
        }

        this.isConnected = true;
        this.sendStatus();
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        if (this.twitchClient) {
            this.twitchClient.disconnect().catch(()=>{});
            this.twitchClient = null;
        }
        if (this.youtubeClient) {
            this.youtubeClient.stop();
            this.youtubeClient = null;
        }

        this.isConnected = false;
        this.sendStatus();
        this.log("Все соединения разорваны.", 'info');
    }

    connectDonationAlerts() {
        this.log("DA: Подключение...", 'pending');
        
        this.socket = io('wss://socket.donationalerts.ru:443', {
            transports: ['websocket'],
            reconnection: true
        });

        this.socket.on('connect', () => {
            this.log("✅ DA: Подключено!", 'success');
            this.socket.emit('add-user', { token: this.config.token, type: 'minor' });
        });

        this.socket.on('donation', (data) => {
            try {
                const don = JSON.parse(data);
                this.log(`💰 DA: ${don.amount} ${don.currency} от ${don.username}`, 'donation');
                this.processLogic(don.amount, don.message, don.username);
            } catch (e) { this.log("Error parsing donation", 'error'); }
        });

        this.socket.on('error', (err) => this.log("DA Error: " + err, 'error'));
    }

    connectTwitch(channelName) {
        this.log(`Twitch: Подключение к ${channelName}...`, 'pending');

        this.twitchClient = new tmi.Client({
            channels: [ channelName ]
        });

        this.twitchClient.connect().catch(err => {
            this.log(`Twitch Error: ${err}`, 'error');
        });

        this.twitchClient.on('connected', () => {
            this.log(`✅ Twitch Chat: ${channelName}`, 'success');
        });

        this.twitchClient.on('message', (channel, tags, message, self) => {
            if (self) return;
            this.processLogic(0, message, tags.username);
        });
    }

    async connectYouTube(handleOrId) {
        this.log(`YouTube: Поиск стрима ${handleOrId}...`, 'pending');
        
        this.youtubeClient = new LiveChat({ handle: handleOrId });

        this.youtubeClient.on('start', (liveId) => {
            this.log(`✅ YouTube Connected! (ID: ${liveId})`, 'success');
        });

        this.youtubeClient.on('error', (err) => {
            this.log(`YouTube: ${err.message}`, 'warning');
        });

        this.youtubeClient.on('chat', (chatItem) => {
            const msg = chatItem.message.map(m => m.text).join('');
            this.processLogic(0, msg, chatItem.author.name);
        });

        this.youtubeClient.on('superchat', (chatItem) => {
            const amountText = chatItem.amount;
            const amount = parseFloat(amountText.replace(/[^0-9.]/g, '')) || 0;
            
            const msg = chatItem.message ? chatItem.message.map(m => m.text).join('') : "";
            
            this.log(`🔴 YT SuperChat: ${amount} от ${chatItem.author.name}`, 'donation');
            this.processLogic(amount, msg, chatItem.author.name);
        });

        try {
            const ok = await this.youtubeClient.start();
            if (!ok) this.log("YouTube: Стрим не найден (нужен прямой эфир).", 'warning');
        } catch (e) {
            this.log(`YouTube Init Error: ${e.message}`, 'error');
        }
    }

    simulate(amount, message) {
        this.log(`🧪 ТЕСТ: ${amount} RUB | "${message}"`, 'test');
        this.processLogic(amount, message, "TESTER");
    }

     sendToGame(cmd) {
        try {
            const dir = path.dirname(this.finalGamePath);
            if (!fs.existsSync(dir)) {
                this.log(`❌ Папка мода не найдена: ${dir}`, 'error');
                return;
            }
            
            let prefix = '';
            if (fs.existsSync(this.finalGamePath)) {
                const content = fs.readFileSync(this.finalGamePath, 'utf-8');
                if (content.length > 0 && !content.endsWith('\n')) {
                    prefix = '\n';
                }
            }

            fs.appendFileSync(this.finalGamePath, prefix + cmd + '\n');
            
            this.log(`📤 QUEUED: ${cmd}`, 'cmd');
        } catch (e) {
            this.log(`Ошибка записи: ${e.message}`, 'error');
        }
    }

    processLogic(amountStr, message, username) {
        const amount = parseFloat(amountStr) || 0;
        const msg = message ? message.toLowerCase() : "";
        const rules = this.config.rules || [];

        if (amount > 0) {
            const exactMatch = rules.find(r => r.active && r.type === 'exact' && parseFloat(r.value) === amount);
            if (exactMatch) return this.sendToGame(exactMatch.command);
        }

        const wordMatch = rules.find(r => r.active && r.type === 'word' && msg.includes(r.value.toLowerCase()));
        if (wordMatch) return this.sendToGame(wordMatch.command);

        if (amount > 0) {
            const rangeMatch = rules.find(r => r.active && r.type === 'range' && amount >= r.min && amount < r.max);
            if (rangeMatch) return this.sendToGame(rangeMatch.command);
            
            this.log("Нет правил для этой суммы.", 'warning');
        }
    }
}

module.exports = GameConnector;