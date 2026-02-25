import { system, world, World, Player, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, CommandResult } from '@minecraft/server'
import './Plugins/loader'
import { PluginStorage, getPluginByID } from './Plugins/PluginStorage'
World.prototype.error = function (msg) {
    this.sendMessage(`§4ERROR §8>> §r§7${msg}`)
}
Player.prototype.error = function (msg) {
    this.sendMessage(`§4ERROR §8>> §r§7${msg}`)
}
Player.prototype.info = function (msg) {
    this.sendMessage(`§eINFO §8>> §r§7${msg}`)
}
Player.prototype.success = function (msg) {
    this.sendMessage(`§aSUCCESS §8>> §r§7${msg}`)
}

function isPlayer(se) {
    if (!se) return false;
    if (se.typeId !== 'minecraft:player') return false;
    return true;
}

system.beforeEvents.startup.subscribe((init) => {
    init.customCommandRegistry.registerCommand({
        name: "essentials:config",
        description: "Open the config menu",
        permissionLevel: CommandPermissionLevel.GameDirectors,
    }, (origin) => {
        let uiManager = getPluginByID("ui_manager")
        if (uiManager.enabled === false) return;
        if (!isPlayer(origin.sourceEntity)) return;
        uiManager.open(origin.sourceEntity, 'config_menu')
    })
    init.customCommandRegistry.registerCommand({
        name: "essentials:setwarp",
        description: "Set a warp that players can teleport to",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        mandatoryParameters: [
            {
                name: "name",
                type: CustomCommandParamType.String
            }
        ]
    }, (origin, name) => {
        let warps = getPluginByID('warps')
        if (!isPlayer(origin.sourceEntity)) return;
        if (warps.enabled === false) return origin.sourceEntity.error('Warps are not enabled!');
        warps.setwarp(name, origin.sourceEntity.location, origin.sourceEntity.dimension.id)
        origin.sourceEntity.success('Set warp successfully!')
    })
    init.customCommandRegistry.registerCommand({
        name: "essentials:warp",
        description: "Warp to a set server location",
        permissionLevel: CommandPermissionLevel.Any,
        mandatoryParameters: [
            {
                name: 'name',
                type: CustomCommandParamType.String
            }
        ]
    }, (origin, name) => {
        system.run(async () => {
            if (!isPlayer(origin.sourceEntity)) return;
            let warps = getPluginByID('warps')
            if (warps.enabled === false) return origin.sourceEntity.error('Warps are not enabled!');
            if (!warps.db.findFirst({ warp: name })) return origin.sourceEntity.error('This warp does not exist!')
            origin.sourceEntity.setDynamicProperty('backLocation', origin.sourceEntity.location)
            origin.sourceEntity.setDynamicProperty('backDimension', origin.sourceEntity.dimension.id)
            let success = await warps.warp(name, origin.sourceEntity)
            if (success) origin.sourceEntity.success('Teleported!')
        })
    })
    init.customCommandRegistry.registerCommand({
        name: "essentials:listwarp",
        description: "List server warps",
        permissionLevel: CommandPermissionLevel.Any,
    }, (origin) => {
        if (!isPlayer(origin.sourceEntity)) return;
        let warpsplugin = getPluginByID('warps')
        let warps = warpsplugin.db.findDocuments()
        if (warps.enabled === false) return origin.sourceEntity.error('Warps are not enabled!');
        let text = ['-=-=-§eWarps§r-=-=-']
        for (const warp of warps) {
            text.push(`§e${warp.data.warp}`)
        }
        origin.sourceEntity.sendMessage(text.join('§r\n'))
    })
    init.customCommandRegistry.registerCommand({
        name: "essentials:delwarp",
        description: "Delete a warp",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        mandatoryParameters: [
            {
                name: 'warp',
                type: CustomCommandParamType.String
            }
        ]
    }, (origin, name) => {
        if (!isPlayer(origin.sourceEntity)) return;
        let warps = getPluginByID('warps')
        if (warps.enabled == false) return { status: CustomCommandStatus.Failure, message: "Warps are not enabled" }
        if (!warps.db.findFirst({ warp: name })) return origin.sourceEntity.error('This warp does not exist!')
        warps.delwarp(name)
        return { status: CustomCommandStatus.Success, message: "§aDeleted warp successfully" }
    })
    init.customCommandRegistry.registerCommand({
        name: "essentials:spawn",
        description: "Teleport to Spawn",
        permissionLevel: CommandPermissionLevel.Any
    }, (origin) => {
        system.run(async () => {
            if (!isPlayer(origin.sourceEntity)) return;
            let warps = getPluginByID('warps')
            if (warps.enabled == false) return { status: CustomCommandStatus.Failure, message: "Warps are not enabled" }
            if (!warps.db.findFirst({ warp: 'spawn' })) return origin.sourceEntity.error('The "spawn" warp does not exist!')
            origin.sourceEntity.setDynamicProperty('backLocation', origin.sourceEntity.location)
            origin.sourceEntity.setDynamicProperty('backDimension', origin.sourceEntity.dimension.id)
            let success = await warps.warp('spawn', origin.sourceEntity)
            if (success) origin.sourceEntity.success('Teleported!')
        })
    })
    init.customCommandRegistry.registerCommand({
        name: "essentials:heal",
        description: "Heal a player or yourself",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        optionalParameters: [
            {
                name: "player",
                type: CustomCommandParamType.PlayerSelector
            }
        ]
    }, (origin, players) => {
        system.run(() => {
            if (!players) {
                if (!isPlayer(origin.sourceEntity)) return;
                let health = origin.sourceEntity.getComponent('health')
                health.resetToMaxValue()
            } else {
                for (const player of players) {
                    let health = player.getComponent('health')
                    health.resetToMaxValue()
                }
            }
        })
    })
    init.customCommandRegistry.registerCommand({
        name: 'essentials:back',
        description: 'Go back to the previous location you were before teleporting',
        permissionLevel: CommandPermissionLevel.Any
    }, (origin) => {
        system.run(async () => {
            if (!isPlayer(origin.sourceEntity)) return;
            let back = getPluginByID('back')
            if(!back.enabled) return origin.sourceEntity.error('Back is disabled!')
            let success = await back.back(origin.sourceEntity)
            if(success) return origin.sourceEntity.success('Teleported back to last location!')
        })
    })
})