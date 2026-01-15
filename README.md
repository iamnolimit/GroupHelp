Project discontinued

---

# LibreGroupHelp

Open-Source re-creation of telegram group manager Group Help in NodeJS based on [node-telegram-api](https://github.com/yagop/node-telegram-bot-api).

An official instance of bot is running on [@LibreGroupHelpBot](https://t.me/LibreGroupHelpBot)

[The Wiki for users and developers is avaiable Here](https://sp3rick.github.io/GroupHelp/)

## Installation:

Be sure to have installed a recent version of [NodeJS](https://nodejs.org/)

Verify NodeJS installation with `node -v`

Set your bot token using configuration file, look at [config documentation](https://sp3rick.github.io/GroupHelp/wiki/configuration/).

Open a terminal inside LibreGroupHelp folder and run this commands

```bash
npm install
```

Now you should be ready to run LibreGroupHelp using:
```bash
node index.js
```


## What is done

✅ Completed and working

🟡 Not fully implemented (work in progress)

❌ Not implemented at all

```
✅ Roles and permissions hirarchy
❌ Custom roles
✅ Moderation commands
❌ Support moderation for channels users
❌ Support for anonymous admins
🟡 Bot support
❌ Bot help (how to use)
❌ Bot clones support
❌ UTC Time settings
✅ Langs and lang settings
✅ Rules
✅ Welcome
✅ Anti-flood
✅ Anti-spam
✅ Goodbye
✅ Alphabets
✅ Captcha (1 mode)
❌ Checks settings
✅ @Admin mention (NEW!)
❌ Blocks settings
✅ Media blocks
❌ Anti-NSFW
✅ Warns settings
✅ Night mode (NEW!)
❌ Tag settings
✅ Link settings
❌ Approve mode
❌ Message Deletion settings
❌ Topics settings
✅ Banned words (NEW!)
❌ Recurring messages
❌ Members management
❌ Masked users settings
❌ Discussion group settings
❌ Personal commands
❌ Magic Strickers/GIFs
✅ Max message length settings (NEW!)
✅ Log channel (NEW!)
❌ Staff group
❌ Group statistics
✅ General commands permissions editor
✅ Remove user-data from group (/forget)
❌ Remove user-data from bot
❌ User privacy mode
✅ Crypto prices external api
```

## New Features Added

### 1. Banned Words Filter (`bannedWords.js`)
- Configure banned words that trigger punishments
- Customizable punishment (warn/kick/mute/ban)
- Optional message deletion
- Add/remove words via bot interface

### 2. Night Mode (`nightMode.js`)
- Restrict messages during specified hours (UTC)
- Configurable start and end times
- Customizable punishment for violations
- Users with "night" permission can bypass

### 3. Message Length Limit (`messageLength.js`)
- Set maximum message length in characters
- Configurable punishment for long messages
- Range: 10-10000 characters
- Users with "length" permission can bypass

### 4. @Admin Mention (`adminMention.js`)
- Notify all admins when @admin is mentioned
- Direct message notifications with link to message
- Optional confirmation in group
- Only notifies admins with equal/higher level

### 5. Log Channel (`logChannel.js`)
- Send logs to a designated channel
- Configurable log types:
  - Punishments
  - Role changes
  - Settings changes
  - User joins/leaves
  - Deleted messages
- Easy channel setup via forwarded message

All features are accessible via the Settings menu (use /settings command).
✅ Langs and lang settings
✅ Rules
✅ Welcome
✅ Anti-flood
✅ Anti-spam
✅ Goodbye
✅ Alphabets
✅ Captcha (1 mode)
❌ Checks settings
❌ @Admin
❌ Blocks settings
✅ Media blocks
❌ Anti-NSFW
✅ Warns settings
❌ Nigth mode
❌ Tag settings
✅ Link settings
❌ Approve mode
❌ Message Deletion settings
❌ Topics settings
❌ Banned words
❌ Recurring messages
❌ Members management
❌ Masked users settings
❌ Discussion group settings
❌ Personal commands
❌ Magic Strickers/GIFs
❌ Max message length settings
❌ Log channel
❌ Staff group
❌ Group statistics
✅ General commands permissions editor
✅ Remove user-data from group (/forget)
❌ Remove user-data from bot
❌ User privacy mode
✅ Crypto prices external api
```

## Updating

To update LibreGroupHelp you need to backup ./database folder and ./config.json, then repeat installation process and paste there again both file and folder, you may need to add some config.json parameters manually if has been added

## Contribute

[Documentation](https://sp3rick.github.io/GroupHelp/documentation/) is the section you are looking for if you want to contribute to LibreGroupHelp

## Ask a question

If you have any questions about LibreGroupHelp, feel free to open an issue or ask directly in our telegram group [@LGHChat](https://t.me/LGHChat).
