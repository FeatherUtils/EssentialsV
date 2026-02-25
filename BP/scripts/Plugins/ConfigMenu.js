import { world } from '@minecraft/server'
import uiManager from './uiManager'
import { commands } from './Commands'

class ConfigMenu {
    constructor() {
        this.name = 'Core UIs'
        this.id = 'coreuis'
        this.core = true
        this.defaultEnabled = true
        this.enabled = false
    }
    async load() {
        const { ChestFormData } = await import('../Libraries/ChestUI/extensions/forms')
        uiManager.addUI('config_menu', 'Config Menu', (player) => {
            let form = new ChestFormData('small');
            form.title('Config Menu')
            form.button(4 + 9, 'Plugins', 'Configure plugins', 'minecraft:anvil', 1, false, () => {
                uiManager.open(player, 'plugins')
            })
            form.show(player)
        })
        commands.addCommand('config', 'Open the Config Menu', 'Admin', ({ msg }) => {
            uiManager.open(msg.sender, 'config_menu')
        }, true, 'config')
        this.enabled = true
    }
    unload() { }
}

export { ConfigMenu }