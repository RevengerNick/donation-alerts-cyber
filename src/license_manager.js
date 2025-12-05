const { machineIdSync } = require('node-machine-id');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

const AUTH_HOST = "https://auth-cp2077.revenger.dev"; 

const LICENSE_FILE = path.join(app.getPath('userData'), 'license.dat');
const TRIAL_FILE = path.join(app.getPath('userData'), 'app_session_config.dat'); 

class LicenseManager {
    constructor() {
        try {
            this.hwid = machineIdSync();
        } catch (e) {
            this.hwid = "UNKNOWN_HWID_FALLBACK";
        }
    }

    async checkStatus() {
        if (fs.existsSync(LICENSE_FILE)) {
            try {
                const data = JSON.parse(fs.readFileSync(LICENSE_FILE));
                
                this.validateKeyOnline(data.key).then(isValid => {
                    if (!isValid) {
                        try { fs.unlinkSync(LICENSE_FILE); } catch(e){}
                    }
                }).catch(() => {}); 

                return { access: true, type: 'FULL' };
            } catch (e) {
                try { fs.unlinkSync(LICENSE_FILE); } catch(e){}
            }
        }

        return await this.checkTrial();
    }
    async checkTrial() {
        try {
            const response = await axios.post(`${AUTH_HOST}/api/trial`, { hwid: this.hwid }, { timeout: 3000 });
            
            if (response.data.status === 'ACTIVE') {
                const startTime = Date.now() - ((4 * 60 - response.data.minutesLeft) * 60000);
                this.saveEncryptedTrial(startTime);
                
                return { access: true, type: 'TRIAL', minutesLeft: response.data.minutesLeft };
            } else {
                return { access: false, type: 'EXPIRED' };
            }

        } catch (error) {
            console.log("[DRM] Server offline, checking local backup...");
            return this.checkLocalTrial();
        }
    }

    checkLocalTrial() {
        const start = this.loadEncryptedTrial();
        
        if (!start) {
            this.saveEncryptedTrial(Date.now());
            return { access: true, type: 'TRIAL', minutesLeft: 240 };
        }

        const elapsed = Date.now() - start;
        const remaining = (4 * 60 * 60 * 1000) - elapsed;

        if (remaining > 0) {
            return { access: true, type: 'TRIAL', minutesLeft: Math.floor(remaining / 60000) };
        } else {
            return { access: false, type: 'EXPIRED' };
        }
    }

    async activate(key) {
        const isValid = await this.validateKeyOnline(key);
        if (isValid) {
            fs.writeFileSync(LICENSE_FILE, JSON.stringify({ key: key.trim() }));
            if (fs.existsSync(TRIAL_FILE)) fs.unlinkSync(TRIAL_FILE);
            return { success: true };
        }
        return { success: false, message: "Invalid Key" };
    }

    async validateKeyOnline(key) {
        try {
            const res = await axios.post(`${AUTH_HOST}/api/verify`, { key, hwid: this.hwid }, { timeout: 3000 });
            return res.data.valid;
        } catch (e) {
            if (e.response && e.response.status === 403) return false;
            return true;
        }
    }

    
    getCipherKey() {
        const key = crypto.createHash('sha256').update(this.hwid).digest();
        const iv = crypto.createHash('md5').update(this.hwid).digest();
        return { key, iv };
    }

    saveEncryptedTrial(timestamp) {
        try {
            const { key, iv } = this.getCipherKey();
            const text = JSON.stringify({ start: timestamp });
            
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
            
            let crypted = cipher.update(text, 'utf8', 'hex');
            crypted += cipher.final('hex');
            
            fs.writeFileSync(TRIAL_FILE, crypted);
        } catch (e) {
            console.error("[DRM] Save Error:", e);
        }
    }

    loadEncryptedTrial() {
        if (!fs.existsSync(TRIAL_FILE)) return null;
        try {
            const { key, iv } = this.getCipherKey();
            const text = fs.readFileSync(TRIAL_FILE, 'utf8');
            
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            
            let dec = decipher.update(text, 'hex', 'utf8');
            dec += decipher.final('utf8');
            
            return JSON.parse(dec).start;
        } catch (e) {
            console.error("[DRM] Load/Decrypt Error (File might be tampered):", e);
            return null;
        }
    }
}

module.exports = new LicenseManager();