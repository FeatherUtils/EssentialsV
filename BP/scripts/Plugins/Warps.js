import { commands } from './Commands'
import { prismarineDb } from '../Libraries/PrismarineDB/index'
import { world, system } from '@minecraft/server'
import { SegmentedStoragePrismarine } from '../Libraries/PrismarineDB/Storage/segmented'


class Warps {
    constructor() {
        this.name = 'Warps'
        this.id = 'warps'
        this.core = false
        this.defaultEnabled = true
        this.enabled = false
    }
    async load() {
        this.db = prismarineDb.customStorage('Warps', SegmentedStoragePrismarine)
        await this.db.waitLoad();
        commands.addCommand('warp', 'Warp to a server warp', 'Teleportation', async ({ msg, args }) => {
            if (!this.db.findFirst({ warp: args.join(' ') })) return msg.sender.error('This warp does not exist!')
            msg.sender.setDynamicProperty('backLocation', msg.sender.location)
            msg.sender.setDynamicProperty('backDimension', msg.sender.dimension.id)
            let success = await this.warp(args.join(' '), msg.sender)
            if (success) msg.sender.success('Teleported!')
        })
        commands.addCommand('setwarp', 'Set a warp that players can teleport to', 'Teleportation', ({ msg, args }) => {
            this.setwarp(args.join(' '), msg.sender.location, msg.sender.dimension.id)
            msg.sender.success('Set warp successfully!')
        }, false, 'warpManage', ['addwarp', 'createwarp'])
        commands.addCommand('delwarp', 'Remove a warp', 'Teleportation', ({ msg, args }) => {
            this.delwarp(args.join(' '))
            msg.sender.success('Deleted warp')
        }, false, 'warpManage', ['deletewarp', 'removewarp'])
        commands.addCommand('listwarp', 'List all warps', 'Teleportation', ({ msg, args }) => {
            let warps = this.db.findDocuments()
            let text = ['-=-=-§eWarps§r-=-=-']
            for (const warp of warps) {
                text.push(`§e${warp.data.warp}`)
            }
            msg.sender.sendMessage(text.join('§r\n'))
        }, false, null)
    }
    async warp(warp, player) {
        return new Promise(async (resolve, reject) => {
            let w = this.db.findFirst({ warp })
            if (!w) return;
            if (prismarineDb.permissions.hasPermission(player, 'bypasscooldown')) return player.teleport(w.data.loc, { dimension: world.getDimension(w.data.dim) }), resolve(true)
            let loc = player.location
            for (let i = 5; i !== 0; i--) {
                player.info(`Teleporting in ${i} seconds!`)
                await system.waitTicks(20)
                if (player.location.x !== loc.x) return player.error('You moved in the 5 seconds!'), resolve(false)
                if (player.location.z !== loc.z) return player.error('You moved in the 5 seconds!'), resolve(false)
            }
            player.teleport(w.data.loc, { dimension: world.getDimension(w.data.dim) })
            resolve(true)
        })
    }
    setwarp(warp, loc, dim) {
        let w = this.db.findFirst({ warp })
        if (w) {
            w.data.loc = loc
            w.data.dim = dim
            this.db.overwriteDataByID(w.id, w.data)
            return;
        } else {
            this.db.insertDocument({
                warp,
                loc,
                dim
            })
        }
    }
    delwarp(warp) {
        let w = this.db.findFirst({ warp })
        this.db.deleteDocumentByID(w.id)
    }
    unload() {
        commands.removeCommand('warp')
        commands.removeCommand('setwarp')
        commands.removeCommand('delwarp')
    }
}

export { Warps }