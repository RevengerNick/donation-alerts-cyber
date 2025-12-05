const { ipcRenderer } = require('electron');
const LOCALES = require('./locales');

const COMMANDS = [
    { cmd: "hack:overheat:1", desc: "🔥 Burn Lvl 1 (10s)" },
    { cmd: "hack:overheat:2", desc: "🔥 Burn Lvl 2 (15s)" },
    { cmd: "hack:overheat:3", desc: "🔥 Burn Lvl 3 (20s)" },
    { cmd: "hack:overheat:4", desc: "🔥 Burn Lvl 4 (25s)" },
    
    { cmd: "hack:poison:1", desc: "☣️ Contagion Lvl 1 (10s)" },
    { cmd: "hack:poison:2", desc: "☣️ Contagion Lvl 2 (15s)" },
    { cmd: "hack:poison:3", desc: "☣️ Contagion Lvl 3 (20s)" },

    { cmd: "hack:emp:1", desc: "⚡ Short Circuit (Light Stun)" },
    { cmd: "hack:emp:2", desc: "⚡ Short Circuit (Damage)" },
    { cmd: "hack:emp:3", desc: "⚡ Short Circuit (Heavy Damage)" },

    { cmd: "hack:blind:1", desc: "👁️ Blind Lvl 1 (10s)" },
    { cmd: "hack:blind:2", desc: "👁️ Blind Lvl 2 (15s)" },

    { cmd: "hack:weapon:1", desc: "🔫 Weapon Glitch (10s)" },
    { cmd: "hack:weapon:2", desc: "🔫 Weapon Glitch (15s)" },

    { cmd: "hack:cripple:1", desc: "🛑 Cripple Move (10s)" },
    { cmd: "hack:cripple:2", desc: "🛑 Cripple Move (15s)" },

    { cmd: "raid:1", desc: "🛑 Raid 1LVL" },
    { cmd: "raid:2", desc: "🛑 Raid 2LVL" },
    { cmd: "raid:3", desc: "🛑 Raid 3LVL" },
    { cmd: "raid:4", desc: "🛑 Raid 4LVL" },

    { cmd: "hack:suicide", desc: "💀 SUICIDE (Kill Player)" },

    // === ПОЛЕЗНЫЕ БАФФЫ (BUFFS) ===
    { cmd: "buff:god:1", desc: "🛡️ God Mode (20s)" },
    { cmd: "buff:god:2", desc: "🛡️ God Mode (30s)" },
    { cmd: "buff:god:3", desc: "🛡️ God Mode (40s)" },

    { cmd: "buff:speed:1", desc: "⚡ Super Speed (20s)" },
    { cmd: "buff:speed:2", desc: "⚡ Super Speed (30s)" },

    { cmd: "buff:invis:1", desc: "👻 Ghost Mode (20s)" },
    { cmd: "buff:invis:2", desc: "👻 Ghost Mode (30s)" },

    { cmd: "buff:ram:1", desc: "🧠 Infinite RAM (20s)" },
    { cmd: "buff:ram:2", desc: "🧠 Infinite RAM (30s)" },

    { cmd: "buff:ammo", desc: "📦 Infinite Ammo Buff" },

    { cmd: "wanted:1", desc: "🚔 Police: 1 Star" },
    { cmd: "wanted:2", desc: "🚔 Police: 2 Stars" },
    { cmd: "wanted:3", desc: "🚔 Police: 3 Stars" },
    { cmd: "wanted:4", desc: "🚔 Police: MaxTac" },
    { cmd: "wanted:0", desc: "🚔 Remove Wanted Level" },

    { cmd: "drunk:1", desc: "🍺 Drunk: Tipsy" },
    { cmd: "drunk:2", desc: "🍺 Drunk: Heavy" },
    { cmd: "drunk:3", desc: "🍺 Drunk: Very Heavy" },
    { cmd: "drunk:4", desc: "🍺 Drunk: WASTED" },

    { cmd: "heal:25", desc: "❤️ Heal 25%" },
    { cmd: "heal:50", desc: "❤️ Heal 50%" },
    { cmd: "heal:100", desc: "❤️ Full Heal" },

    { cmd: "damage:10", desc: "💔 Damage 10 HP" },
    { cmd: "damage:50", desc: "💔 Damage 50 HP" },
    { cmd: "damage:100", desc: "💔 Damage 100 HP" },
    { cmd: "damage:500", desc: "💔 Damage 500 HP (Critical)" },

    { cmd: "ammo:100", desc: "🔫 Add 100 Ammo" },
    { cmd: "ammo:500", desc: "🔫 Add 500 Ammo" },

    { cmd: "money:1000", desc: "💰 Add 1k Eddies" },
    { cmd: "money:10000", desc: "💰 Add 10k Eddies" },
    { cmd: "money:100000", desc: "💰 Add 100k Eddies" },

    { cmd: "clean:1", desc: "🧹 CLEANSE (Remove All)" }
];

let config = { rules: [], language: 'en' };
let isAppConnected = false;

(async () => {
    config = await ipcRenderer.invoke('get-config');
    document.getElementById('token').value = config.token || '';
    document.getElementById('path').value = config.gamePath || '';
    
    applyLanguage(config.language || 'en');
    renderAll();
    
    document.getElementById('btn-connect').onclick = toggleConnection;
    document.getElementById('btn-settings').onclick = toggleSettings;
    document.getElementById('btn-close-settings').onclick = toggleSettings;
    document.getElementById('btn-add-rule').onclick = addRule;
    
    document.getElementById('btn-min').onclick = () => ipcRenderer.send('win-minimize');
    document.getElementById('btn-close').onclick = () => ipcRenderer.send('win-close');
    
    document.getElementById('rule-type').onchange = updateInputs;
    
    const cmdInput = document.getElementById('cmd-input');
    cmdInput.oninput = filterCommands;
    cmdInput.onfocus = filterCommands;
    
    document.getElementById('twitch-channel').value = config.twitchChannel || '';
document.getElementById('youtube-handle').value = config.youtubeHandle || '';
['token', 'path', 'twitch-channel', 'youtube-handle'].forEach(id => {
    document.getElementById(id).addEventListener('input', autoSave);
});
})();

function changeLanguage() {
    const lang = document.getElementById('lang-select').value;
    config.language = lang;
    ipcRenderer.invoke('save-config', config);
    applyLanguage(lang);
}

function applyLanguage(lang) {
    const texts = LOCALES[lang] || LOCALES['en'];
    config.language = lang;
    document.getElementById('lang-select').value = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key === 'btn_connect') updateConnectButtonText();
        else if (texts[key]) el.innerText = texts[key];
    });

    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const key = el.getAttribute('data-i18n-ph');
        if (texts[key]) el.placeholder = texts[key];
    });
    updateInputs(); 
}

function toggleConnection() {
    if (isAppConnected) ipcRenderer.send('disconnect-socket');
    else { autoSave(); ipcRenderer.send('connect-socket'); }
}

ipcRenderer.on('connection-status', (event, status) => {
    isAppConnected = status;
    updateConnectButtonText();
});

ipcRenderer.on('license-status', (event, data) => {
        if (data.type === 'TRIAL') {
            showTrialBanner(data.minutes);
        }
    });

    function showTrialBanner(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    const banner = document.createElement('div');
    banner.style.background = 'linear-gradient(90deg, #ff003c, #80001e)';
    banner.style.color = 'white';
    banner.style.textAlign = 'center';
    banner.style.padding = '8px';
    banner.style.fontSize = '11px';
    banner.style.fontWeight = 'bold';
    banner.style.letterSpacing = '1px';
    banner.style.position = 'absolute';
    banner.style.top = '56px';
    banner.style.left = '0';
    banner.style.width = '100%';
    banner.style.zIndex = '50';
    banner.style.boxShadow = '0 5px 10px rgba(0,0,0,0.5)';
    banner.innerText = `⚠ TRIAL MODE ACTIVE. TIME LEFT: ${hours}H ${mins}M. BUY FULL VERSION TO REMOVE LIMITS.`;
    
    document.body.appendChild(banner);
}
function updateConnectButtonText() {
    const btn = document.getElementById('btn-connect');
    const texts = LOCALES[config.language || 'en'];
    if (isAppConnected) {
        btn.innerText = texts.btn_disconnect;
        btn.classList.add('disconnect');
    } else {
        btn.innerText = texts.btn_connect;
        btn.classList.remove('disconnect');
    }
}

function toggleSettings() {
    document.getElementById('settings-overlay').classList.toggle('open');
}

function updateInputs() {
    const type = document.getElementById('rule-type').value;
    const v1 = document.getElementById('val1');
    const div2 = document.getElementById('div-v2');
    const lbl = document.getElementById('lbl-v1');
    const texts = LOCALES[config.language || 'en'];

    if(type === 'range') {
        lbl.innerText = texts.lbl_min; v1.type = "number"; div2.style.display = "block";
    } else if(type === 'word') {
        lbl.innerText = texts.lbl_keyword; v1.type = "text"; div2.style.display = "none";
    } else {
        lbl.innerText = texts.lbl_amount; v1.type = "number"; div2.style.display = "none";
    }
}

function renderAll() {
    const testList = document.getElementById('test-buttons-list');
    const editList = document.getElementById('edit-list');
    testList.innerHTML = '';
    editList.innerHTML = '';

    config.rules.forEach((r, i) => {
        let desc = '';
        let icon = '';
        if(r.type === 'exact') { desc = `${r.value} RUB`; icon = '💰'; }
        if(r.type === 'range') { desc = `${r.min} - ${r.max} RUB`; icon = '📊'; }
        if(r.type === 'word')  { desc = `KEYWORD: "${r.value.toUpperCase()}"`; icon = '💬'; }

        const btn = document.createElement('div');
        btn.className = 'btn-test';
        btn.innerHTML = `<div>${icon} <b>${desc}</b></div> <span class="cmd">${r.command}</span>`;
        btn.onclick = () => runRuleTest(r);
        testList.appendChild(btn);

        const row = document.createElement('div');
        row.className = 'rule-row';
        row.innerHTML = `
            <div style="flex:1; color:#fcee0a; font-weight:bold;">${desc}</div>
            <div style="flex:1; font-family:monospace; color:#888;">${r.command}</div>
            <button class="btn-del" onclick="removeRule(${i})">REMOVE</button>
        `;
        editList.appendChild(row);
    });
}

function addRule() {
    const type = document.getElementById('rule-type').value;
    const cmd = document.getElementById('cmd-input').value;
    const v1 = document.getElementById('val1').value;
    if(!cmd || !v1) return;

    const rule = { type, command: cmd, active: true };
    if(type === 'range') {
        rule.min = parseFloat(v1);
        rule.max = parseFloat(document.getElementById('val2').value);
    } else if (type === 'word') {
        rule.value = v1.toLowerCase();
    } else {
        rule.value = parseFloat(v1);
    }

    config.rules.push(rule);
    ipcRenderer.invoke('save-config', config);
    renderAll();
    document.getElementById('cmd-input').value = '';
}

window.removeRule = function(index) {
    config.rules.splice(index, 1);
    ipcRenderer.invoke('save-config', config);
    renderAll();
};

function runRuleTest(rule) {
    let amount = 0;
    let msg = "";
    if(rule.type === 'exact') amount = rule.value;
    if(rule.type === 'range') amount = rule.min;
    if(rule.type === 'word') msg = rule.value;
    ipcRenderer.send('test-logic', { amount, msg });
}

function filterCommands() {
    const input = document.getElementById('cmd-input');
    const val = input.value.toLowerCase();
    const list = document.getElementById('suggestions');
    list.innerHTML = '';
    const matches = COMMANDS.filter(c => c.cmd.includes(val) || c.desc.toLowerCase().includes(val));
    if(matches.length > 0) {
        list.style.display = 'block';
        matches.forEach(m => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `${m.cmd} <span>${m.desc}</span>`;
            div.onclick = () => { input.value = m.cmd; list.style.display = 'none'; };
            list.appendChild(div);
        });
    } else { list.style.display = 'none'; }
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.ac-container') && !e.target.closest('#cmd-input')) {
        document.getElementById('suggestions').style.display = 'none';
    }
});

function autoSave() {
    config.token = document.getElementById('token').value;
    config.twitchChannel = document.getElementById('twitch-channel').value;
    config.youtubeHandle = document.getElementById('youtube-handle').value;
    config.gamePath = document.getElementById('path').value;
    ipcRenderer.invoke('save-config', config);
}

function toggleConnection() {
    if (isAppConnected) ipcRenderer.send('disconnect-socket');
    else { autoSave(); ipcRenderer.send('connect-socket'); }
}

ipcRenderer.on('add-log', (e, data) => {
    const div = document.getElementById('console');
    const line = document.createElement('div');
    line.className = `log-line log-${data.type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${data.msg}`;
    div.appendChild(line);
    div.scrollTop = div.scrollHeight;
});