const { Client, VoiceChannel, GuildMember } = require("discord.js");

const fs = require("fs");
const CONFIG = JSON.parse(fs.readFileSync("./config.json", { encoding: "utf-8" }));

const moment = require("moment");
require("moment-duration-format");

const Voice = new Client({ fetchAllMembers: true, disableMentions: "none" });
Voice.staffJoined = false;
Voice.playingVoice = false;
Voice.voiceConnection = null;
Voice.channelID = null;

Voice.on("ready", async() => {

    Voice.user.setPresence({
        status: "idle",
        activity: {
            name: CONFIG.DEFAULTS.BOTDURUM
        }
    });

    Voice.log(`\'${Voice.user.username}\' aktif!`);

    const Guild = Voice.guilds.cache.get(CONFIG.DEFAULTS.GUILD_ID) || Voice.guilds.cache.first();
    if(!Guild) {
        Voice.error("Sunucuyu bulamıyorum!");
        return Voice.destroy();
    }
    
    const Channel = Guild.channels.cache.get(CONFIG.DEFAULTS.SESKANAL);
    if(!Channel) {
        Voice.error("Ses kanalını bulamıyorum!");
        return Voice.destroy();
    }

    Channel.join().then(connection =>{
            
        Voice.voiceConnection = connection;
        Voice.channelID = Channel.id;
        Voice.log("Ses dosyası oynatılıyor!")
        if(!Channel.hasStaff()) playVoice(Voice);
        else Voice.staffJoined = true;

    }).catch(err => {
        Voice.error(`Ses kanalına bağlanamıyorum! (${Channel.name}) (${Channel.id}): ` + err.message)
        return Voice.destroy();
    });

});

Voice.on("voiceStateUpdate", async(oldState, newState) => {
    if(
        newState.channelID && (oldState.channelID !== newState.channelID) &&
        newState.member.isStaff() &&
        newState.channelID === Voice.channelID &&
        !newState.channel.hasStaff(newState.member)
    ) {
        Voice.staffJoined = true;
        return playVoice(Voice);
    }
    if( 
        oldState.channelID && 
        (oldState.channelID !== newState.channelID) && 
        newState.member.isStaff() && 
        oldState.channelID === Voice.channelID &&
        !oldState.channel.hasStaff()
    ) {
        Voice.staffJoined = false;
        return playVoice(Voice);
    }
});

Voice.login(CONFIG.token).catch(err => {
    Voice.error("Bota bağlanamadım! Tokeni kontrol et!");
    return Voice.destroy();
});

/**
 * 
 * @param {Client} Voice 
 */
function playVoice(Voice) {
    try {

        const Path = Voice.staffJoined === true ? "./" + CONFIG.FILES.STAFF : "./" + CONFIG.FILES.WELCOME;
        Voice.playingVoice = true;
        Voice.voiceConnection.play(Path, {
            volume: 1
        }).on("finish", async() => {
            Voice.playingVoice = false;
            if(Voice.staffJoined === true) return;
            playVoice(Voice);
        });

    } catch(err) {

        return Voice.log("Ses dosyasını oynatırken bir hata ile karşılaştım! ");
        
    }
};

Client.prototype.log = function(content) {
    return console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] ${content}`);
};

Client.prototype.error = function(content) {
    return console.error(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] ERR! ${content}`);
};

VoiceChannel.prototype.hasStaff = function(checkMember = false) {
    if(this.members.some(m => (checkMember !== false ? m.user.id !== checkMember.id : true) && !m.user.bot && m.roles.highest.position >= m.guild.roles.cache.get(CONFIG.DEFAULTS.MIN_STAFF_ROLE).position)) return true; // m.roles.highest.position >= this.guild.roles.cache.get(CONFIG.DEFAULTS.MIN_STAFF_ROLE).position
    return false;
}

VoiceChannel.prototype.getStaffs = function(checkMember = false) {
    return this.members.filter(m => (checkMember !== false ? m.user.id !== checkMember.id : true) && !m.user.bot && m.roles.highest.position >= m.guild.roles.cache.get(CONFIG.DEFAULTS.MIN_STAFF_ROLE).position).size
}

GuildMember.prototype.isStaff = function() {
    if(
        !this.user.bot &&
        ([...CONFIG.DEFAULTS.AUTHORS].includes(this.id) ||
        this.hasPermission("ADMINISTRATOR") ||
        this.roles.highest.position >= this.guild.roles.cache.get(CONFIG.DEFAULTS.ALTYETKİLİ).position
        )
    ) return true;
    return false;
}

