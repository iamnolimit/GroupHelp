const LGHelpTemplate = require("../GHbot.js");
const {bold} = require("../api/utils/utils.js");

function main(args) {

    const GHbot = new LGHelpTemplate(args);
    const { TGbot, db, config } = GHbot;

    l = global.LGHLangs; //importing langs object

    /**
     * Send log to log channel
     * @param {LGHelpTemplate.LGHChat} chat
     * @param {string} logType
     * @param {string} message
     * @param {object} options
     */
    function sendLog(chat, logType, message, options = {})
    {
        if(!chat.logChannel || !chat.logChannel.channelId) return;
        if(!chat.logChannel.enabled) return;
        
        // Check if this log type is enabled
        var enabledLogs = chat.logChannel.types || {
            punishments: true,
            roleChanges: true,
            settings: true,
            joins: false,
            leaves: false,
            deleted: false
        };

        if(!enabledLogs[logType]) return;

        var timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        var logMessage = "📋 [" + timestamp + " UTC]\n";
        logMessage += bold(chat.title) + "\n\n";
        logMessage += message;

        try {
            GHbot.sendMessage(null, chat.logChannel.channelId, logMessage, {
                parse_mode: "HTML",
                ...options
            });
        } catch(e) {
            console.log("Failed to send log to channel:", e.message);
        }
    }

    // Hook into punishment events
    GHbot.onMessage((msg, chat, user) => {
        // This will be called by punishment.js
        if(msg._punishment) {
            var target = msg._punishment.target;
            var reason = msg._punishment.reason;
            var action = msg._punishment.action;
            
            var logMsg = "⚠️ " + bold(action.toUpperCase()) + "\n";
            logMsg += bold(l[chat.lang].USER) + ": " + target.name + "\n";
            if(reason) logMsg += bold(l[chat.lang].REASON) + ": " + reason + "\n";
            
            sendLog(chat, "punishments", logMsg);
        }
    });

    // Log role changes
    var originalUserToRole = null;
    try {
        var RM = require("../api/utils/rolesManager.js");
        if(RM.userToRole) {
            originalUserToRole = RM.userToRole;
            RM.userToRole = function(GHbot, chat, targetId, role) {
                var result = originalUserToRole(GHbot, chat, targetId, role);
                
                if(result.success) {
                    var target = chat.getCached(targetId);
                    var logMsg = "👤 " + bold(l[chat.lang].ROLE_CHANGED || "Role Changed") + "\n";
                    logMsg += bold(l[chat.lang].USER) + ": " + (target.firstName || targetId) + "\n";
                    logMsg += bold(l[chat.lang].NEW_ROLE || "New Role") + ": " + role + "\n";
                    
                    sendLog(chat, "roleChanges", logMsg);
                }
                
                return result;
            };
        }
    } catch(e) {
        console.log("Could not hook role changes:", e.message);
    }

    /**
     * Handle settings callback
     */
    GHbot.onCallback((cb, chat, user) => {
        if(!cb.data.startsWith("LOGC:")) return;

        var page = cb.message?.message_id || null;
        var splitData = cb.data.split(":");
        var action = splitData[1];

        // Main settings menu
        if(action == "MAIN") {
            var status = chat.logChannel?.enabled ? l[chat.lang].ON : l[chat.lang].OFF;
            var channelSet = chat.logChannel?.channelId ? "✅" : "❌";

            var keyboard = [
                [{ text: l[chat.lang].STATUS + ": " + status, callback_data: "LOGC:STATUS" }],
                [{ text: (l[chat.lang].CHANNEL_SET || "Channel Set") + ": " + channelSet, callback_data: "LOGC:SETCHANNEL" }]
            ];

            if(chat.logChannel?.enabled && chat.logChannel?.channelId) {
                keyboard.push([{ text: l[chat.lang].LOG_TYPES || "Log Types", callback_data: "LOGC:TYPES" }]);
                keyboard.push([{ text: l[chat.lang].TEST_LOG || "Test Log", callback_data: "LOGC:TEST" }]);
            }

            keyboard.push([{ text: l[chat.lang].CLOSE_MENU_BUTTON, callback_data: "MENU" }]);

            GHbot.editMessageMarkup(page, chat.id, keyboard, cb.id);
        }

        // Toggle status
        else if(action == "STATUS") {
            if(!chat.logChannel) chat.logChannel = {enabled: false, channelId: null, types: {}};
            chat.logChannel.enabled = !chat.logChannel.enabled;
            db.chats.updateValue(chat.id, "logChannel", chat.logChannel);
            GHbot.answerCallbackQuery(cb.id, l[chat.lang].DONE || "Done");
            GHbot.emit("callback", {data: "LOGC:MAIN", message: cb.message}, chat, user);
        }

        // Set channel
        else if(action == "SETCHANNEL") {
            chat.getCached(user.id).waitingReply = cb.data;
            db.chats.updateValue(chat.id, "users", chat.users);
            
            GHbot.answerCallbackQuery(cb.id);
            GHbot.sendMessage(user.id, chat.id, l[chat.lang].SEND_CHANNEL_ID || "Forward a message from the channel or send its ID (e.g., -1001234567890):");
        }

        // Configure log types
        else if(action == "TYPES") {
            if(!chat.logChannel.types) chat.logChannel.types = {};
            var types = chat.logChannel.types;

            var keyboard = [
                [{ text: (l[chat.lang].PUNISHMENTS || "Punishments") + ": " + (types.punishments !== false ? "✅" : "❌"), callback_data: "LOGC:TOGGLE:punishments" }],
                [{ text: (l[chat.lang].ROLE_CHANGES || "Role Changes") + ": " + (types.roleChanges !== false ? "✅" : "❌"), callback_data: "LOGC:TOGGLE:roleChanges" }],
                [{ text: (l[chat.lang].SETTINGS_CHANGES || "Settings") + ": " + (types.settings !== false ? "✅" : "❌"), callback_data: "LOGC:TOGGLE:settings" }],
                [{ text: (l[chat.lang].USER_JOINS || "Joins") + ": " + (types.joins ? "✅" : "❌"), callback_data: "LOGC:TOGGLE:joins" }],
                [{ text: (l[chat.lang].USER_LEAVES || "Leaves") + ": " + (types.leaves ? "✅" : "❌"), callback_data: "LOGC:TOGGLE:leaves" }],
                [{ text: (l[chat.lang].DELETED_MESSAGES || "Deleted Msgs") + ": " + (types.deleted ? "✅" : "❌"), callback_data: "LOGC:TOGGLE:deleted" }],
                [{ text: l[chat.lang].BACK_BUTTON || "Back", callback_data: "LOGC:MAIN" }]
            ];

            GHbot.editMessageMarkup(page, chat.id, keyboard, cb.id);
        }

        // Toggle log type
        else if(action == "TOGGLE") {
            var type = splitData[2];
            if(!chat.logChannel.types) chat.logChannel.types = {};
            chat.logChannel.types[type] = !chat.logChannel.types[type];
            db.chats.updateValue(chat.id, "logChannel", chat.logChannel);
            GHbot.answerCallbackQuery(cb.id, l[chat.lang].DONE || "Done");
            GHbot.emit("callback", {data: "LOGC:TYPES", message: cb.message}, chat, user);
        }

        // Test log
        else if(action == "TEST") {
            sendLog(chat, "settings", "🧪 " + bold("Test Log") + "\nThis is a test log message from LibreGroupHelp.");
            GHbot.answerCallbackQuery(cb.id, l[chat.lang].TEST_LOG_SENT || "Test log sent!");
        }
    });

    /**
     * Handle channel ID input
     */
    GHbot.onMessage((msg, chat, user) => {
        if(!msg.chat.isGroup) return;
        var waitingReply = chat.users[user.id]?.waitingReply;
        if(!waitingReply || waitingReply != "LOGC:SETCHANNEL") return;

        var channelId = null;

        // Check if it's a forwarded message from a channel
        if(msg.forward_origin && msg.forward_origin.type == "channel") {
            channelId = msg.forward_origin.chat.id;
        }
        // Or a channel ID as text
        else if(msg.text) {
            var idText = msg.text.trim();
            // Remove @ if present
            if(idText.startsWith('@')) idText = idText.substring(1);
            
            // Try to parse as number
            var id = parseInt(idText);
            if(!isNaN(id)) {
                channelId = id;
            }
        }

        if(!channelId) {
            GHbot.sendMessage(user.id, chat.id, l[chat.lang].INVALID_CHANNEL || "Invalid channel. Forward a message from the channel.");
            return;
        }

        // Test if bot can send to channel
        try {
            GHbot.sendMessage(null, channelId, "✅ Log channel configured successfully!");
            
            if(!chat.logChannel) chat.logChannel = {enabled: true, channelId: null, types: {}};
            chat.logChannel.channelId = channelId;
            db.chats.updateValue(chat.id, "logChannel", chat.logChannel);
            
            GHbot.sendMessage(user.id, chat.id, l[chat.lang].CHANNEL_SET_SUCCESS || "Channel set successfully!");
        } catch(e) {
            GHbot.sendMessage(user.id, chat.id, l[chat.lang].CHANNEL_NO_ACCESS || "Bot cannot access this channel. Make sure bot is admin.");
        }

        chat.users[user.id].waitingReply = null;
        db.chats.updateValue(chat.id, "users", chat.users);
        GHbot.deleteMessage(chat.id, msg.message_id);
    });

    // Export sendLog function for use by other plugins
    GHbot.sendLog = sendLog;

}

module.exports = main;
