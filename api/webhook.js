process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 0;
global.LGHVersion = "0.2.9.2";
global.directory = __dirname + "/.."; // adjusted for api folder

const fs = require("fs");
const path = require("path");
const TelegramBot = require('node-telegram-bot-api');
const TR = require("../api/tg/tagResolver.js");
const cp = require("../api/external/cryptoPrices.js");

// Cache untuk bot instance
let botInstance = null;
let GHbotInstance = null;
let dbInstance = null;
let isInitialized = false;

async function initialize() {
    if (isInitialized) {
        return { GHbot: GHbotInstance, TGbot: botInstance, db: dbInstance };
    }

    console.log("Initializing bot for Vercel...");
    
    // Load config
    const config = JSON.parse(
        fs.readFileSync(path.join(__dirname, "..", "config.json"))
    );

    // Override bot token from environment variable if available
    if (process.env.BOT_TOKEN) {
        config.botToken = process.env.BOT_TOKEN;
    }

    // Load languages
    console.log("Loading languages...");
    const l = {};
    const rLang = config.reserveLang;
    l[rLang] = JSON.parse(
        fs.readFileSync(path.join(__dirname, "..", "langs", rLang + ".json"))
    );
    console.log("-loaded principal language: \"" + l[rLang].LANG_NAME + "\" " + rLang);

    const langs = fs.readdirSync(path.join(__dirname, "..", "langs"));
    langs.splice(langs.indexOf(rLang + ".json"), 1);

    const defaultLangObjects = Object.keys(l[rLang]);
    langs.forEach((langFile) => {
        const fileName = langFile.replaceAll(".json", "");
        l[fileName] = JSON.parse(
            fs.readFileSync(path.join(__dirname, "..", "langs", langFile))
        );
        console.log("-loaded language: \"" + l[fileName].LANG_NAME + "\" " + fileName);

        defaultLangObjects.forEach((object) => {
            if (!l[fileName].hasOwnProperty(object)) {
                console.log("  identified missing parameter " + object + ", replacing from " + rLang);
                l[fileName][object] = l[rLang][object];
            }
        });
    });

    global.LGHLangs = l;

    // Load external API if allowed
    if (config.allowExternalApi) {
        await cp.load();
    }

    // Initialize bot WITHOUT polling
    console.log("Starting bot in webhook mode...");
    botInstance = new TelegramBot(config.botToken, { polling: false });
    
    // Set webhook
    const webhookUrl = process.env.WEBHOOK_URL || 
        `https://${process.env.VERCEL_URL}/api/webhook`;
    
    await botInstance.setWebHook(webhookUrl, {
        allowed_updates: JSON.stringify([
            "message",
            "edited_message",
            "edited_channel_post",
            "callback_query",
            "message_reaction",
            "message_reaction_count",
            "chat_member"
        ])
    });
    
    const bot = await botInstance.getMe();
    botInstance.me = bot;
    console.log("Webhook set to:", webhookUrl);

    // Load database
    const getDatabase = require("../api/database.js");
    dbInstance = getDatabase(config);
    console.log("Database loaded");

    // Load tag resolver
    TR.load(config);

    // Initialize main bot
    const LGHelpBot = require("../main.js");
    const botData = await LGHelpBot(config);
    GHbotInstance = botData.GHbot;

    // Load plugins
    console.log("Loading modules...");
    const directory = fs.readdirSync(path.join(__dirname, "..", "plugins"));
    directory.forEach((fileName) => {
        try {
            const func = require(path.join(__dirname, "..", "plugins", fileName));
            func({
                GHbot: GHbotInstance,
                TGbot: botInstance,
                db: dbInstance,
                config: config
            });
            console.log("\tloaded " + fileName);
        } catch (error) {
            console.log("The plugin " + fileName + " crashed:");
            console.log(error);
        }
    });

    isInitialized = true;
    console.log("Bot initialized successfully");

    return { GHbot: GHbotInstance, TGbot: botInstance, db: dbInstance };
}

// Main webhook handler
module.exports = async (req, res) => {
    // Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Initialize bot if not already done
        const { TGbot } = await initialize();

        // Process the update
        const update = req.body;
        
        if (update) {
            // Process update using the bot instance
            TGbot.processUpdate(update);
            return res.status(200).json({ ok: true });
        } else {
            return res.status(400).json({ error: 'No update provided' });
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
};
