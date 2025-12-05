const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const CONFIG_PATH = path.join(__dirname, 'config.json');

const DEFAULTS = {
    token: "",
    gamePath: "",
    twitchChannel: "",
    youtubeHandle: "",
    rules: [
        { id: 1, type: 'exact', value: 666, command: 'hack:suicide', active: true },
        { id: 2, type: 'range', min: 50, max: 100, command: 'hack:blind:1', active: true },
    ]
};

class ConfigManager {
    constructor() {
        this.data = this.load();
    }

    load() {
        try {
            if (fs.existsSync(CONFIG_PATH)) {
                return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
            }
        } catch (e) {
            console.error("Config load error:", e);
        }
        return JSON.parse(JSON.stringify(DEFAULTS));
    }

    save(newData) {
        this.data = { ...this.data, ...newData };
        try {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.data, null, 4));
            return true;
        } catch (e) {
            console.error("Config save error:", e);
            return false;
        }
    }

    get() { return this.data; }
}

module.exports = new ConfigManager();