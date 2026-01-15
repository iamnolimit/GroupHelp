const LGHelpTemplate = require("../GHbot.js");
const {bold, punishmentToText, handlePunishmentCallback, genPunishButtons} = require("../api/utils/utils.js");
const {punishUser} = require("../api/utils/punishment.js");
const RM = require("../api/utils/rolesManager.js");

function main(args) {

    const GHbot = new LGHelpTemplate(args);
    const { TGbot, db, config } = GHbot;

    l = global.LGHLangs; //importing langs object

    /**
     * Check if night mode should block messages
     * @param {LGHelpTemplate.LGHMessage} msg
     * @param {LGHelpTemplate.LGHChat} chat
     * @param {LGHelpTemplate.LGHUser} user
     */
    function checkNightMode(msg, chat, user)
    {
        if(!msg.chat.isGroup) return;
        if(user.perms.night == 1) return; // User has permission to bypass
        if(!chat.nightMode || chat.nightMode.punishment == 0) return;

        var now = new Date();
        var currentHour = now.getUTCHours();
        var currentMinute = now.getMinutes();
        var currentTime = currentHour * 60 + currentMinute;

        // Convert start and end times to minutes
        var startTime = chat.nightMode.startHour * 60 + (chat.nightMode.startMinute || 0);
        var endTime = chat.nightMode.endHour * 60 + (chat.nightMode.endMinute || 0);

        var isNightTime = false;
        
        // Handle case where night mode crosses midnight
        if(startTime > endTime) {
            isNightTime = (currentTime >= startTime || currentTime < endTime);
        } else {
            isNightTime = (currentTime >= startTime && currentTime < endTime);
        }

        if(isNightTime) {
            var reason = l[chat.lang].NIGHT_MODE_ACTIVE || "Night mode is active";
            var target = RM.userToTarget(chat, user);
            var deleteMsg = chat.nightMode.delete !== false;
            
            punishUser(GHbot, chat, target, chat.nightMode.punishment, chat.nightMode.PTime, reason, deleteMsg ? msg.message_id : false);
        }
    }

    GHbot.onMessage(checkNightMode);

    /**
     * Handle settings callback
     */
    GHbot.onCallback((cb, chat, user) => {
        if(!cb.data.startsWith("NIGHT:")) return;

        var page = cb.message?.message_id || null;
        var splitData = cb.data.split(":");
        var action = splitData[1];

        // Main settings menu
        if(action == "MAIN") {
            var status = chat.nightMode.punishment == 0 ? l[chat.lang].OFF : l[chat.lang].ON;
            var punishText = punishmentToText(l[chat.lang], chat.nightMode.punishment);
            
            var startTime = String(chat.nightMode.startHour || 0).padStart(2, '0') + ":" + String(chat.nightMode.startMinute || 0).padStart(2, '0');
            var endTime = String(chat.nightMode.endHour || 8).padStart(2, '0') + ":" + String(chat.nightMode.endMinute || 0).padStart(2, '0');

            var keyboard = [
                [{ text: l[chat.lang].STATUS + ": " + status, callback_data: "NIGHT:STATUS" }],
                [{ text: l[chat.lang].PUNISHMENT + ": " + punishText, callback_data: "NIGHT:PUNISHMENT" }]
            ];

            if(chat.nightMode.punishment > 0) {
                keyboard.push([{ text: l[chat.lang].DELETE + ": " + (chat.nightMode.delete !== false ? l[chat.lang].YES : l[chat.lang].NO), callback_data: "NIGHT:DELETE" }]);
                keyboard.push([
                    { text: l[chat.lang].START_TIME + ": " + startTime, callback_data: "NIGHT:START" },
                    { text: l[chat.lang].END_TIME + ": " + endTime, callback_data: "NIGHT:END" }
                ]);
            }

            keyboard.push([{ text: l[chat.lang].CLOSE_MENU_BUTTON, callback_data: "MENU" }]);

            GHbot.editMessageMarkup(page, chat.id, keyboard, cb.id);
        }

        // Toggle status
        else if(action == "STATUS") {
            chat.nightMode.punishment = chat.nightMode.punishment == 0 ? 1 : 0;
            db.chats.updateValue(chat.id, "nightMode", chat.nightMode);
            GHbot.answerCallbackQuery(cb.id, l[chat.lang].DONE || "Done");
            GHbot.emit("callback", {data: "NIGHT:MAIN", message: cb.message}, chat, user);
        }

        // Change punishment
        else if(action == "PUNISHMENT") {
            var keyboard = genPunishButtons("NIGHT:SETPUNISH:", l[chat.lang]);
            keyboard.push([{text: l[chat.lang].BACK_BUTTON || "Back", callback_data: "NIGHT:MAIN"}]);
            GHbot.editMessageMarkup(page, chat.id, keyboard, cb.id);
        }

        // Set punishment
        else if(action == "SETPUNISH") {
            handlePunishmentCallback(GHbot, cb, chat, user, splitData[2], splitData[3], "nightMode", "NIGHT:MAIN");
        }

        // Toggle delete
        else if(action == "DELETE") {
            chat.nightMode.delete = !chat.nightMode.delete;
            db.chats.updateValue(chat.id, "nightMode", chat.nightMode);
            GHbot.answerCallbackQuery(cb.id, l[chat.lang].DONE || "Done");
            GHbot.emit("callback", {data: "NIGHT:MAIN", message: cb.message}, chat, user);
        }

        // Set start time
        else if(action == "START") {
            chat.getCached(user.id).waitingReply = cb.data;
            db.chats.updateValue(chat.id, "users", chat.users);
            
            GHbot.answerCallbackQuery(cb.id);
            GHbot.sendMessage(user.id, chat.id, l[chat.lang].SEND_NIGHT_START_TIME || "Send start time in HH:MM format (UTC):");
        }

        // Set end time
        else if(action == "END") {
            chat.getCached(user.id).waitingReply = cb.data;
            db.chats.updateValue(chat.id, "users", chat.users);
            
            GHbot.answerCallbackQuery(cb.id);
            GHbot.sendMessage(user.id, chat.id, l[chat.lang].SEND_NIGHT_END_TIME || "Send end time in HH:MM format (UTC):");
        }
    });

    /**
     * Handle time input
     */
    GHbot.onMessage((msg, chat, user) => {
        if(!msg.chat.isGroup) return;
        var waitingReply = chat.users[user.id]?.waitingReply;
        if(!waitingReply || !waitingReply.startsWith("NIGHT:")) return;

        var action = waitingReply.split(":")[1];
        var timeText = (msg.text || "").trim();

        // Parse time (HH:MM format)
        var timeMatch = timeText.match(/^(\d{1,2}):(\d{2})$/);
        if(!timeMatch) {
            GHbot.sendMessage(user.id, chat.id, l[chat.lang].INVALID_TIME_FORMAT || "Invalid format. Use HH:MM (e.g., 22:00)");
            return;
        }

        var hour = parseInt(timeMatch[1]);
        var minute = parseInt(timeMatch[2]);

        if(hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            GHbot.sendMessage(user.id, chat.id, l[chat.lang].INVALID_TIME_RANGE || "Hour must be 0-23 and minute 0-59");
            return;
        }

        if(!chat.nightMode) chat.nightMode = {punishment: 0, PTime: null, delete: true, startHour: 22, startMinute: 0, endHour: 8, endMinute: 0};

        if(action == "START") {
            chat.nightMode.startHour = hour;
            chat.nightMode.startMinute = minute;
            GHbot.sendMessage(user.id, chat.id, l[chat.lang].START_TIME_SET || "Start time set successfully");
        } else if(action == "END") {
            chat.nightMode.endHour = hour;
            chat.nightMode.endMinute = minute;
            GHbot.sendMessage(user.id, chat.id, l[chat.lang].END_TIME_SET || "End time set successfully");
        }

        db.chats.updateValue(chat.id, "nightMode", chat.nightMode);
        chat.users[user.id].waitingReply = null;
        db.chats.updateValue(chat.id, "users", chat.users);
        GHbot.deleteMessage(chat.id, msg.message_id);
    });

}

module.exports = main;
