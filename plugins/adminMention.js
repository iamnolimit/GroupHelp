const LGHelpTemplate = require("../GHbot.js");
const {bold} = require("../api/utils/utils.js");
const RM = require("../api/utils/rolesManager.js");

function main(args) {

    const GHbot = new LGHelpTemplate(args);
    const { TGbot, db, config } = GHbot;

    l = global.LGHLangs; //importing langs object

    /**
     * Check for @admin mentions and notify admins
     * @param {LGHelpTemplate.LGHMessage} msg
     * @param {LGHelpTemplate.LGHChat} chat
     * @param {LGHelpTemplate.LGHUser} user
     */
    function checkAdminMention(msg, chat, user)
    {
        if(!msg.chat.isGroup) return;
        if(!chat.adminMention || !chat.adminMention.enabled) return;

        var text = (msg.text || msg.caption || "").toLowerCase();
        if(!text) return;

        // Check for @admin or @admins mentions
        var hasAdminMention = text.includes("@admin") || text.includes("@admins");
        
        if(!hasAdminMention) return;

        // Get list of admins
        var admins = chat.admins || [];
        var notifiedCount = 0;
        var userLevel = RM.getUserLevel(chat, user.id);

        // Build notification message
        var notificationText = "🚨 " + (l[chat.lang].ADMIN_CALLED || "Admin called") + "!\n\n";
        notificationText += bold(l[chat.lang].FROM) + ": " + user.firstName + " " + (user.lastName || "") + " (@" + (user.username || user.id) + ")\n";
        notificationText += bold(l[chat.lang].GROUP) + ": " + chat.title + "\n";
        
        if(msg.text) {
            notificationText += bold(l[chat.lang].MESSAGE) + ": " + msg.text.substring(0, 200);
            if(msg.text.length > 200) notificationText += "...";
        }

        // Create keyboard with link to message
        var keyboard = [[{
            text: l[chat.lang].GO_TO_MESSAGE || "Go to message",
            url: `https://t.me/c/${String(chat.id).replace('-100', '')}/${msg.message_id}`
        }]];

        // Notify all admins
        for(let admin of admins) {
            // Don't notify the user who called admins
            if(admin.user.id == user.id) continue;
            
            // Check if admin has higher or equal level
            var adminLevel = RM.getUserLevel(chat, admin.user.id);
            if(adminLevel < userLevel) continue;

            try {
                GHbot.sendMessage(admin.user.id, admin.user.id, notificationText, {
                    reply_markup: { inline_keyboard: keyboard },
                    parse_mode: "HTML"
                });
                notifiedCount++;
            } catch(e) {
                // Admin might have blocked the bot or doesn't have a private chat
                console.log("Failed to notify admin:", admin.user.id);
            }
        }

        // Optional: Send confirmation in group
        if(chat.adminMention.confirmInGroup && notifiedCount > 0) {
            GHbot.sendMessage(user.id, chat.id, 
                "✅ " + notifiedCount + " " + (l[chat.lang].ADMINS_NOTIFIED || "admins notified"),
                { reply_to_message_id: msg.message_id }
            );
        }
    }

    GHbot.onMessage(checkAdminMention);

    /**
     * Handle settings callback
     */
    GHbot.onCallback((cb, chat, user) => {
        if(!cb.data.startsWith("ADMIN_MENTION:")) return;

        var page = cb.message?.message_id || null;
        var splitData = cb.data.split(":");
        var action = splitData[1];

        // Main settings menu
        if(action == "MAIN") {
            var status = chat.adminMention?.enabled ? l[chat.lang].ON : l[chat.lang].OFF;
            var confirm = chat.adminMention?.confirmInGroup ? l[chat.lang].YES : l[chat.lang].NO;

            var keyboard = [
                [{ text: l[chat.lang].STATUS + ": " + status, callback_data: "ADMIN_MENTION:STATUS" }]
            ];

            if(chat.adminMention?.enabled) {
                keyboard.push([{ 
                    text: (l[chat.lang].CONFIRM_IN_GROUP || "Confirm in group") + ": " + confirm, 
                    callback_data: "ADMIN_MENTION:CONFIRM" 
                }]);
            }

            keyboard.push([{ text: l[chat.lang].CLOSE_MENU_BUTTON, callback_data: "MENU" }]);

            GHbot.editMessageMarkup(page, chat.id, keyboard, cb.id);
        }

        // Toggle status
        else if(action == "STATUS") {
            if(!chat.adminMention) chat.adminMention = {enabled: false, confirmInGroup: true};
            chat.adminMention.enabled = !chat.adminMention.enabled;
            db.chats.updateValue(chat.id, "adminMention", chat.adminMention);
            GHbot.answerCallbackQuery(cb.id, l[chat.lang].DONE || "Done");
            GHbot.emit("callback", {data: "ADMIN_MENTION:MAIN", message: cb.message}, chat, user);
        }

        // Toggle confirmation
        else if(action == "CONFIRM") {
            if(!chat.adminMention) chat.adminMention = {enabled: false, confirmInGroup: true};
            chat.adminMention.confirmInGroup = !chat.adminMention.confirmInGroup;
            db.chats.updateValue(chat.id, "adminMention", chat.adminMention);
            GHbot.answerCallbackQuery(cb.id, l[chat.lang].DONE || "Done");
            GHbot.emit("callback", {data: "ADMIN_MENTION:MAIN", message: cb.message}, chat, user);
        }
    });

}

module.exports = main;
