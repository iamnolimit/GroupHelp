const LGHelpTemplate = require("../GHbot.js");
const {bold, punishmentToText, handlePunishmentCallback, genPunishButtons} = require("../api/utils/utils.js");
const {punishUser} = require("../api/utils/punishment.js");
const RM = require("../api/utils/rolesManager.js");

function main(args) {

    const GHbot = new LGHelpTemplate(args);
    const { TGbot, db, config } = GHbot;

    l = global.LGHLangs; //importing langs object

    /**
     * Check for banned words in messages
     * @param {LGHelpTemplate.LGHMessage} msg
     * @param {LGHelpTemplate.LGHChat} chat
     * @param {LGHelpTemplate.LGHUser} user
     */
    function checkBannedWords(msg, chat, user)
    {
        if(!msg.chat.isGroup) return;
        if(user.perms.words == 1) return; // User has permission to bypass
        if(!chat.bannedWords || chat.bannedWords.punishment == 0) return;
        if(!chat.bannedWords.list || chat.bannedWords.list.length == 0) return;

        var text = (msg.text || msg.caption || "").toLowerCase();
        if(!text) return;

        // Check if message contains any banned words
        var foundWords = [];
        for(let word of chat.bannedWords.list) {
            var wordLower = word.toLowerCase();
            if(text.includes(wordLower)) {
                foundWords.push(word);
            }
        }

        if(foundWords.length > 0) {
            var reason = l[chat.lang].BANNED_WORD_PUNISHMENT || "Banned word detected: " + foundWords[0];
            var target = RM.userToTarget(chat, user);
            var deleteMsg = chat.bannedWords.delete || false;
            
            punishUser(GHbot, chat, target, chat.bannedWords.punishment, chat.bannedWords.PTime, reason, deleteMsg ? msg.message_id : false);
        }
    }

    GHbot.onMessage(checkBannedWords);

    /**
     * Handle settings callback
     */
    GHbot.onCallback((cb, chat, user) => {
        if(!cb.data.startsWith("WORDSBAN:")) return;

        var page = cb.message?.message_id || null;
        var splitData = cb.data.split(":");
        var action = splitData[1];

        // Main settings menu
        if(action == "MAIN") {
            var status = chat.bannedWords.punishment == 0 ? l[chat.lang].OFF : l[chat.lang].ON;
            var punishText = punishmentToText(l[chat.lang], chat.bannedWords.punishment);
            var wordCount = (chat.bannedWords.list || []).length;

            var keyboard = [
                [{ text: l[chat.lang].STATUS + ": " + status, callback_data: "WORDSBAN:STATUS" }],
                [{ text: l[chat.lang].PUNISHMENT + ": " + punishText, callback_data: "WORDSBAN:PUNISHMENT" }]
            ];

            if(chat.bannedWords.punishment > 0) {
                keyboard.push([{ text: l[chat.lang].DELETE + ": " + (chat.bannedWords.delete ? l[chat.lang].YES : l[chat.lang].NO), callback_data: "WORDSBAN:DELETE" }]);
                keyboard.push([{ text: l[chat.lang].BANNED_WORDS_LIST + " (" + wordCount + ")", callback_data: "WORDSBAN:LIST" }]);
                keyboard.push([
                    { text: l[chat.lang].ADD_BUTTON, callback_data: "WORDSBAN:ADD" },
                    { text: l[chat.lang].REMOVE_BUTTON, callback_data: "WORDSBAN:REMOVE" }
                ]);
            }

            keyboard.push([{ text: l[chat.lang].CLOSE_MENU_BUTTON, callback_data: "MENU" }]);

            GHbot.editMessageMarkup(page, chat.id, keyboard, cb.id);
        }

        // Toggle status
        else if(action == "STATUS") {
            chat.bannedWords.punishment = chat.bannedWords.punishment == 0 ? 1 : 0;
            db.chats.updateValue(chat.id, "bannedWords", chat.bannedWords);
            GHbot.answerCallbackQuery(cb.id, l[chat.lang].DONE || "Done");
            GHbot.emit("callback", {data: "WORDSBAN:MAIN", message: cb.message}, chat, user);
        }

        // Change punishment
        else if(action == "PUNISHMENT") {
            var keyboard = genPunishButtons("WORDSBAN:SETPUNISH:", l[chat.lang]);
            keyboard.push([{text: l[chat.lang].BACK_BUTTON || "Back", callback_data: "WORDSBAN:MAIN"}]);
            GHbot.editMessageMarkup(page, chat.id, keyboard, cb.id);
        }

        // Set punishment
        else if(action == "SETPUNISH") {
            handlePunishmentCallback(GHbot, cb, chat, user, splitData[2], splitData[3], "bannedWords", "WORDSBAN:MAIN");
        }

        // Toggle delete
        else if(action == "DELETE") {
            chat.bannedWords.delete = !chat.bannedWords.delete;
            db.chats.updateValue(chat.id, "bannedWords", chat.bannedWords);
            GHbot.answerCallbackQuery(cb.id, l[chat.lang].DONE || "Done");
            GHbot.emit("callback", {data: "WORDSBAN:MAIN", message: cb.message}, chat, user);
        }

        // Show list
        else if(action == "LIST") {
            var words = chat.bannedWords.list || [];
            var text = words.length > 0 ? words.join(", ") : (l[chat.lang].EMPTY || "Empty");
            GHbot.answerCallbackQuery(cb.id, text, true);
        }

        // Add word prompt
        else if(action == "ADD") {
            chat.getCached(user.id).waitingReply = cb.data;
            db.chats.updateValue(chat.id, "users", chat.users);
            
            GHbot.answerCallbackQuery(cb.id);
            GHbot.sendMessage(user.id, chat.id, l[chat.lang].SEND_BANNED_WORD || "Send the word you want to ban:");
        }

        // Remove word prompt
        else if(action == "REMOVE") {
            chat.getCached(user.id).waitingReply = cb.data;
            db.chats.updateValue(chat.id, "users", chat.users);
            
            GHbot.answerCallbackQuery(cb.id);
            GHbot.sendMessage(user.id, chat.id, l[chat.lang].SEND_WORD_TO_UNBAN || "Send the word you want to unban:");
        }
    });

    /**
     * Handle word additions/removals
     */
    GHbot.onMessage((msg, chat, user) => {
        if(!msg.chat.isGroup) return;
        var waitingReply = chat.users[user.id]?.waitingReply;
        if(!waitingReply || !waitingReply.startsWith("WORDSBAN:")) return;

        var action = waitingReply.split(":")[1];
        var word = (msg.text || "").trim();

        if(!word) {
            GHbot.sendMessage(user.id, chat.id, l[chat.lang].INVALID_INPUT || "Invalid input");
            return;
        }

        if(!chat.bannedWords) chat.bannedWords = {punishment: 0, PTime: null, delete: false, list: []};
        if(!chat.bannedWords.list) chat.bannedWords.list = [];

        if(action == "ADD") {
            if(chat.bannedWords.list.includes(word)) {
                GHbot.sendMessage(user.id, chat.id, l[chat.lang].WORD_ALREADY_BANNED || "This word is already banned");
            } else {
                chat.bannedWords.list.push(word);
                db.chats.updateValue(chat.id, "bannedWords", chat.bannedWords);
                GHbot.sendMessage(user.id, chat.id, l[chat.lang].WORD_BANNED || "Word banned successfully");
            }
        } else if(action == "REMOVE") {
            var index = chat.bannedWords.list.indexOf(word);
            if(index == -1) {
                GHbot.sendMessage(user.id, chat.id, l[chat.lang].WORD_NOT_FOUND || "Word not found in banned list");
            } else {
                chat.bannedWords.list.splice(index, 1);
                db.chats.updateValue(chat.id, "bannedWords", chat.bannedWords);
                GHbot.sendMessage(user.id, chat.id, l[chat.lang].WORD_UNBANNED || "Word unbanned successfully");
            }
        }

        chat.users[user.id].waitingReply = null;
        db.chats.updateValue(chat.id, "users", chat.users);
        GHbot.deleteMessage(chat.id, msg.message_id);
    });

}

module.exports = main;
