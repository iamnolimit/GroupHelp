const LGHelpTemplate = require("../GHbot.js");
const {bold, punishmentToText, handlePunishmentCallback, genPunishButtons} = require("../api/utils/utils.js");
const {punishUser} = require("../api/utils/punishment.js");
const RM = require("../api/utils/rolesManager.js");

function main(args) {

    const GHbot = new LGHelpTemplate(args);
    const { TGbot, db, config } = GHbot;

    l = global.LGHLangs; //importing langs object

    /**
     * Check message length and punish if exceeds limit
     * @param {LGHelpTemplate.LGHMessage} msg
     * @param {LGHelpTemplate.LGHChat} chat
     * @param {LGHelpTemplate.LGHUser} user
     */
    function checkMessageLength(msg, chat, user)
    {
        if(!msg.chat.isGroup) return;
        if(user.perms.length == 1) return; // User has permission to bypass
        if(!chat.messageLength || chat.messageLength.punishment == 0) return;
        if(!chat.messageLength.maxLength || chat.messageLength.maxLength <= 0) return;

        var text = msg.text || msg.caption || "";
        if(!text) return;

        var length = text.length;

        if(length > chat.messageLength.maxLength) {
            var reason = (l[chat.lang].MESSAGE_TOO_LONG || "Message too long") + " (" + length + "/" + chat.messageLength.maxLength + ")";
            var target = RM.userToTarget(chat, user);
            var deleteMsg = chat.messageLength.delete !== false;
            
            punishUser(GHbot, chat, target, chat.messageLength.punishment, chat.messageLength.PTime, reason, deleteMsg ? msg.message_id : false);
        }
    }

    GHbot.onMessage(checkMessageLength);

    /**
     * Handle settings callback
     */
    GHbot.onCallback((cb, chat, user) => {
        if(!cb.data.startsWith("LENGTH:")) return;

        var page = cb.message?.message_id || null;
        var splitData = cb.data.split(":");
        var action = splitData[1];

        // Main settings menu
        if(action == "MAIN") {
            var status = chat.messageLength.punishment == 0 ? l[chat.lang].OFF : l[chat.lang].ON;
            var punishText = punishmentToText(l[chat.lang], chat.messageLength.punishment);
            var maxLength = chat.messageLength.maxLength || 0;

            var keyboard = [
                [{ text: l[chat.lang].STATUS + ": " + status, callback_data: "LENGTH:STATUS" }],
                [{ text: l[chat.lang].PUNISHMENT + ": " + punishText, callback_data: "LENGTH:PUNISHMENT" }]
            ];

            if(chat.messageLength.punishment > 0) {
                keyboard.push([{ text: l[chat.lang].DELETE + ": " + (chat.messageLength.delete !== false ? l[chat.lang].YES : l[chat.lang].NO), callback_data: "LENGTH:DELETE" }]);
                keyboard.push([{ text: l[chat.lang].MAX_LENGTH + ": " + maxLength, callback_data: "LENGTH:SET" }]);
            }

            keyboard.push([{ text: l[chat.lang].CLOSE_MENU_BUTTON, callback_data: "MENU" }]);

            GHbot.editMessageMarkup(page, chat.id, keyboard, cb.id);
        }

        // Toggle status
        else if(action == "STATUS") {
            chat.messageLength.punishment = chat.messageLength.punishment == 0 ? 1 : 0;
            db.chats.updateValue(chat.id, "messageLength", chat.messageLength);
            GHbot.answerCallbackQuery(cb.id, l[chat.lang].DONE || "Done");
            GHbot.emit("callback", {data: "LENGTH:MAIN", message: cb.message}, chat, user);
        }

        // Change punishment
        else if(action == "PUNISHMENT") {
            var keyboard = genPunishButtons("LENGTH:SETPUNISH:", l[chat.lang]);
            keyboard.push([{text: l[chat.lang].BACK_BUTTON || "Back", callback_data: "LENGTH:MAIN"}]);
            GHbot.editMessageMarkup(page, chat.id, keyboard, cb.id);
        }

        // Set punishment
        else if(action == "SETPUNISH") {
            handlePunishmentCallback(GHbot, cb, chat, user, splitData[2], splitData[3], "messageLength", "LENGTH:MAIN");
        }

        // Toggle delete
        else if(action == "DELETE") {
            chat.messageLength.delete = !chat.messageLength.delete;
            db.chats.updateValue(chat.id, "messageLength", chat.messageLength);
            GHbot.answerCallbackQuery(cb.id, l[chat.lang].DONE || "Done");
            GHbot.emit("callback", {data: "LENGTH:MAIN", message: cb.message}, chat, user);
        }

        // Set max length
        else if(action == "SET") {
            chat.getCached(user.id).waitingReply = cb.data;
            db.chats.updateValue(chat.id, "users", chat.users);
            
            GHbot.answerCallbackQuery(cb.id);
            GHbot.sendMessage(user.id, chat.id, l[chat.lang].SEND_MAX_LENGTH || "Send the maximum message length (number of characters):");
        }
    });

    /**
     * Handle max length input
     */
    GHbot.onMessage((msg, chat, user) => {
        if(!msg.chat.isGroup) return;
        var waitingReply = chat.users[user.id]?.waitingReply;
        if(!waitingReply || waitingReply != "LENGTH:SET") return;

        var lengthText = (msg.text || "").trim();
        var maxLength = parseInt(lengthText);

        if(isNaN(maxLength) || maxLength <= 0) {
            GHbot.sendMessage(user.id, chat.id, l[chat.lang].INVALID_NUMBER || "Invalid number. Must be a positive integer.");
            return;
        }

        if(maxLength > 10000) {
            GHbot.sendMessage(user.id, chat.id, l[chat.lang].NUMBER_TOO_BIG || "Number too big. Maximum is 10000 characters.");
            return;
        }

        if(maxLength < 10) {
            GHbot.sendMessage(user.id, chat.id, l[chat.lang].NUMBER_TOO_SMALL || "Number too small. Minimum is 10 characters.");
            return;
        }

        if(!chat.messageLength) chat.messageLength = {punishment: 0, PTime: null, delete: true, maxLength: 4000};
        
        chat.messageLength.maxLength = maxLength;
        db.chats.updateValue(chat.id, "messageLength", chat.messageLength);
        
        GHbot.sendMessage(user.id, chat.id, (l[chat.lang].MAX_LENGTH_SET || "Maximum length set to") + ": " + maxLength);

        chat.users[user.id].waitingReply = null;
        db.chats.updateValue(chat.id, "users", chat.users);
        GHbot.deleteMessage(chat.id, msg.message_id);
    });

}

module.exports = main;
