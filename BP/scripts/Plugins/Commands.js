import { prismarineDb } from "../Libraries/PrismarineDB/index";
import { system, world } from "@minecraft/server";

function getPrefix() {
    return '!'
}

class Commands {
    constructor() {
        this.name = 'Commands'
        this.id = 'commands'
        this.core = true
        this.defaultEnabled = true
        this.enabled = false
    }
    async load() {
        world.beforeEvents.chatSend.subscribe((e) => {
            if (e.message.startsWith('!')) {
                e.cancel = true
                this.runCommand(e)
            }
        })
        this.Database = prismarineDb.nonPersistentTable('Commands')
        await this.Database.waitLoad()
        this.addCommand(
            "help",
            "Get a list of commands and how to use them",
            "Help",
            ({ msg, args }) => {
                let d = false;
                if (args[0]) {
                    let t = false
                    let cmd = this.Database.findFirst({ uniqueId: args[0] })
                    if (!cmd) t = true
                    if (!t) {
                        const aliasText = cmd.data.aliases?.length
                            ? `\n§bAliases§8: §7${cmd.data.aliases.map((a) => `${getPrefix()}${a}`).join(" ")}`
                            : "";
                        let scs = this.Database.findDocuments({ parent: args[0], type: 'SUBCOMMAND' })
                        const subcommandText = scs.length ? `\n§r${scs.map((sc) => ` §8- §e${getPrefix()}§e${cmd.data.uniqueId} §b${sc.data.uniqueId} §8| §7${sc.data.description}`)}` : ''
                        let mesg = `§e${getPrefix()}${cmd.data.uniqueId} §8| §7${cmd.data.description}${aliasText}${subcommandText}`
                        msg.sender.sendMessage(mesg)
                        d = true
                    }
                }
                if (d) return;
                const cmds = this.Database.findDocuments();
                const categories = [];

                for (const cmd of cmds) {
                    if (cmd.data.type === 'SUBCOMMAND') continue;
                    let category = categories.find((c) => c.name === cmd.data.category);
                    if (!category) {
                        category = { name: cmd.data.category, cmds: [] };
                        categories.push(category);
                    }
                    category.cmds.push(cmd.data);
                }

                const pre = getPrefix();
                const lines = [];

                for (const cat of categories) {
                    let c = 0
                    for (const cmd of cat.cmds) {
                        if (
                            cmd.permission &&
                            !prismarineDb.permissions.hasPermission(msg.sender, cmd.permission)
                        ) {
                            continue;
                        }

                        if (cmd.type === 'SUBCOMMAND') continue;

                        if (c == 0) lines.push(`§8-=-§b${cat.name}§8-=-§r`);

                        c++

                        const aliasText = cmd.aliases?.length
                            ? ` §7${cmd.aliases.map((a) => `${pre}${a}`).join(" ")}`
                            : "";
                        let scs = this.Database.findDocuments({ parent: cmd.uniqueId, type: 'SUBCOMMAND' })
                        const subcommandText = scs.length ? `${scs.map((sc) => `\n§r§8- §b${getPrefix()}${cmd.uniqueId} §e${sc.data.uniqueId} §8| §7${sc.data.description}`).join('')}` : ''
                        lines.push(
                            `§b${pre}${cmd.uniqueId}${aliasText} §8| §7${cmd.description}${subcommandText}`
                        );
                    }
                }
                msg.sender.sendMessage(lines.join("\n"));
            },
            false,
            null,
            ["cmds"]
        );
        this.enabled = true
    }
    unload() { }
    addSubcommand(parent, uniqueId, description, func, closeChat) {
        if (this.Database.findFirst({ uniqueId, type: 'SUBCOMMAND', parent })) throw new Error('ID is not unique')
        if (typeof func !== 'function') throw new Error('Function entry is not of type "function"')
        this.Database.insertDocument({
            parent,
            uniqueId,
            description,
            func,
            closeChat,
            type: 'SUBCOMMAND'
        })
    }
    addCommand(uniqueId, description, category, func, closeChat = false, permission = null, aliases = null) {
        if (this.Database.findFirst({ uniqueId })) throw new Error('ID is not unique!')
        if (typeof func !== "function") throw new Error('That is NOT a function')
        this.Database.insertDocument({
            uniqueId,
            description,
            category,
            func,
            closeChat,
            permission,
            aliases,
            type: 'COMMAND'
        })
        return true;
    }
    removeCommand(uniqueId) {
        let id = this.Database.findFirst({
            uniqueId
        })
        if (!id) throw new Error('Could not find command. Maybe you spelled it wrong')
        let index = this.Database.data.find(_ => _.id == id)
        this.Database.data.splice(index, 1)
        this.Database.save()
        let scs = this.Database.findDocuments({ type: 'SUBCOMMAND', parent: uniqueId })
        for (const sc of scs) {
            let index2 = this.Database.data.find(_ => _.id == sc.id)
            this.Database.data.splice(index2, 1)
            this.Database.save()
        }
    }
    runCommand(msg) {
        system.run(() => {
            if (!msg.message.startsWith(getPrefix())) return;
            let parsed = this.parseArgs(msg.message)
            if (!parsed) throw new Error('Broken parseArgs.. guh.')
            let commandName = parsed[0].replace(getPrefix(), '')
            let args = parsed.slice(1)
            let command = this.Database.findFirst({ uniqueId: commandName })
            if (!command) {
                for (const cmd of this.Database.findDocuments()) {
                    if (cmd.data.aliases) {
                        let alias = cmd.data.aliases.find(_ => _ == commandName)
                        if (!alias) continue;
                        command = cmd
                    } else continue;
                }
                if (!command) return msg.sender.error('No command found with the name: ' + commandName + '. Try using ' + getPrefix() + 'help for a list of commands')
            }
            if (command.data.type === 'SUBCOMMAND') return;
            if (command.data.permission) {
                if (!prismarineDb.permissions.hasPermission(msg.sender, command.data.permission)) return msg.sender.error('You do not have the required permissions to run this command.')
            }
            let sc = this.Database.findFirst({ uniqueId: args[0], type: 'SUBCOMMAND', parent: commandName })

            if (sc) {
                console.log('found sc')
                if (sc.data.closeChat) {
                    msg.sender.info('Close chat and move to run command!')
                    const player = msg.sender
                    let ticks = 0;
                    let initialLocation = { x: player.location.x, y: player.location.y, z: player.location.z };

                    let interval = system.runInterval(() => {
                        ticks++;

                        if (ticks >= (20 * 10)) {
                            system.clearRun(interval);
                            player.error("Timed out. You didn't move!");
                        }

                        if (player.location.x !== initialLocation.x ||
                            player.location.y !== initialLocation.y ||
                            player.location.z !== initialLocation.z) {

                            system.clearRun(interval);
                            sc.data.func({ msg, args: args.slice(1) })
                        }
                    }, 1);
                } else {
                    sc.data.func({ msg, args: args.slice(1) })
                }
                return;
            }
            if (command.data.closeChat) {
                msg.sender.info('Close chat and move to run command!')
                const player = msg.sender
                let ticks = 0;
                let initialLocation = { x: player.location.x, y: player.location.y, z: player.location.z };

                let interval = system.runInterval(() => {
                    ticks++;

                    if (ticks >= (20 * 10)) {
                        system.clearRun(interval);
                        player.error("Timed out. You didn't move!");
                    }

                    if (player.location.x !== initialLocation.x ||
                        player.location.y !== initialLocation.y ||
                        player.location.z !== initialLocation.z) {

                        system.clearRun(interval);
                        command.data.func({ msg, args })
                    }
                }, 1);
            } else {
                command.data.func({ msg, args })
            }
        })
    }
    parseArgs(str) {
        const args = [];
        let i = 0;

        while (i < str.length) {
            if (str[i] === '"') {
                // quoted string
                let end = ++i;
                let value = "";
                while (end < str.length) {
                    if (str[end] === '"' && str[end - 1] !== "\\") break;
                    value += str[end++];
                }
                args.push(value);
                i = end + 1;
            }
            else if (/\s/.test(str[i])) {
                i++; // skip spaces
            }
            else {
                // normal word
                let value = "";
                while (i < str.length && !/\s/.test(str[i])) {
                    value += str[i++];
                }
                args.push(value);
            }
        }

        return args;
    }
}

var commands = new Commands();

export { commands, getPrefix }