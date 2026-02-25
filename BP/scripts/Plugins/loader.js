import { prismarineDb } from '../Libraries/PrismarineDB/index'
import uiManager from './uiManager'
import { ConfigMenu } from './ConfigMenu'
import { world, system } from '@minecraft/server'
import { Chat } from './Chat'
import { commands } from './Commands'
import { Warps } from './Warps'
import { PluginStorage } from './PluginStorage'
import PluginToggler from './PluginToggler'

class Back {
    constructor() {
        this.name = 'Back'
        this.id = 'back'
        this.core = false
        this.defaultEnabled = true
        this.enabled = false
    }
    load() {
        commands.addCommand('back', 'Go back to your previous location before teleporting', 'Teleportation', async ({ msg }) => {
            if (!this.enabled) return msg.sender.error('Back is disabled!')
            let success = await this.back(msg.sender)
            if (success) msg.sender.success('Teleported back to your last location!')
        }, false, null)
    }
    back(player) {
        return new Promise(async (resolve) => {
            let location = player.getDynamicProperty('backLocation')
            let dimensionID = player.getDynamicProperty('backDimension')
            if (!dimensionID || !location) return player.error('You have not teleported yet'), resolve(false)
            player.setDynamicProperty('backLocation', player.location)
            player.setDynamicProperty('backDimension', player.dimension.id)
            if (prismarineDb.permissions.hasPermission(player, 'bypasscooldown')) return player.teleport(location, { dimension: world.getDimension(dimensionID) }), resolve(true)
            let loc = player.location
            for (let i = 5; i !== 0; i--) {
                player.info(`Teleporting in ${i} seconds!`)
                await system.waitTicks(20)
                if (player.location.x !== loc.x) return player.error('You moved in the 5 seconds!'), resolve(false)
                if (player.location.z !== loc.z) return player.error('You moved in the 5 seconds!'), resolve(false)
            }
            player.teleport(location, { dimension: world.getDimension(dimensionID) })
            resolve(true)
        })
    }
    unload() {
        commands.removeCommand('back')
    }
}

class ErrorHandling {
    constructor() {
        this.name = 'Error Handler'
        this.id = 'error_handler'
        this.defaultEnabled = true
        this.enabled = false;
        this.core = true;
        this.failed = [];
    }
    load() {
        this.failed = [];
        this.enabled = true
        prismarineDb.getEventHandler('PluginLoad').on('Failed', (d) => {
            this.failed.push(d)
            world.error(`${d.plugin ? d.plugin.name ? d.plugin.name : d.plugin.id : 'An unknown plugin'} failed to load!\n§7Diagnostic data:\n${d.error}\n${d.error.stack}`)
        })
    }
    unload() {
        world.error('You cannot unload the Error Handler');
    }
}

class GuhDestroyer {
    constructor() {
        this.name = 'GuhDestroyer'
        this.id = 'guhdestroyer'
    }
    load() {
        DestroyGuhAndRestorePluh
    }
    unload() {
        world.sendMessage("Saved from pluh!")
    }
}

let plugins = [
    new ErrorHandling,
    uiManager,
    new ConfigMenu,
    new PluginToggler,
    commands,
    new Chat,
    new Warps,
    new Back
]

if (false) plugins.push(new GuhDestroyer)

function load(plugin) {
    return new Promise((resolve, reject) => {
        if (!plugin.id) {
            world.error(`An unknown plugin does not have an ID. It will not be loaded`);
            return resolve(false)
        }
        try {
            plugin.load()
            resolve(true)
        } catch (e) {
            prismarineDb.getEventHandler('PluginLoad').emit('Failed', {
                plugin,
                error: e
            })
            try {
                plugin.unload()
            } catch { }
            resolve(false)
        }
    })

}

async function loadPlugins() {
    let loadedPlugins = [];
    for (const plugin of plugins) {
        let isLoaded = await load(plugin)
        if (isLoaded) {
            plugin.enabled = plugin.defaultEnabled
            if (!plugin.enabled) plugin.unload()
            loadedPlugins.push(plugin)
        }
    }
    let successtext = []
    successtext.push(`§4EssentialsV loaded §e${loadedPlugins.length} §4plugins.§r\n§ePlugins loaded:`)
    for (const p of loadedPlugins) {
        successtext.push(`§7${p.name}`)
    }
    PluginStorage.items = loadedPlugins
    world.sendMessage(successtext.join('§r\n'))
}

system.run(async () => {
    await loadPlugins();
})
