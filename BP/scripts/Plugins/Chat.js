import { world, system } from '@minecraft/server'

class Chat {
    constructor() {
        this.id = 'chat'
        this.name = 'Chat'
        this.core = false
        this.defaultEnabled = true
        this.enabled = false
        this.chatEvent = null;
    }
    load() {
        let cevent = world.beforeEvents.chatSend.subscribe((e) => {
            if (e.message.startsWith('!')) return;
            if (e.sender.playerPermissionLevel >= 2) {
                e.cancel = true
                system.run(() => {
                    world.sendMessage(`§r<§4${e.sender.name}§r> ${e.message}`)
                })
            }
        })
        this.chatEvent = cevent
    }
    unload() {
        if (this.chatEvent) world.beforeEvents.chatSend.unsubscribe(this.chatEvent)
    }
}

export { Chat }