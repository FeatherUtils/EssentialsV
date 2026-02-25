import { system, world } from '@minecraft/server'
import uiManager from './uiManager'
import { ModalFormData } from '@minecraft/server-ui'
import { PluginStorage } from './PluginStorage'
import { commands } from './Commands'

class PluginToggler {
    constructor() {
        this.name = 'Plugin Toggler'
        this.id = 'plugin_toggler'
        this.core = true
        this.defaultEnabled = true
        this.enabled = false;
        for (const p of PluginStorage.items) {
            if (world.getDynamicProperty(`enabled_${p.id}`) == undefined) world.setDynamicProperty(`enabled_${p.id}`, p.defaultEnabled)
        }
    }
    load() {
        uiManager.addUI('plugins', 'Plugins', (player) => {
            let form = new ModalFormData();
            form.title('Plugins')
            for (const Plugin of PluginStorage.items) {
                form.toggle(`${Plugin.name ?? Plugin.id}`, { defaultValue: Plugin.enabled })
            }
            form.show(player).then((res) => {
                if (res.canceled) return;
                for (const i in PluginStorage.items) {
                    if (PluginStorage.items[i].core == true) continue;
                    if (res.formValues[i] == false && PluginStorage.items[i].enabled == true) PluginStorage.items[i].unload()
                    if (PluginStorage.items[i].enabled == false && res.formValues[i] == true) try {PluginStorage.items[i].load()} catch {continue;}
                    PluginStorage.items[i].enabled = res.formValues[i]
                    world.setDynamicProperty(`enabled_${PluginStorage.items[i].id}`, PluginStorage.items[i].enabled)
                    if (res.formValues[i] == false) player.info(`Disabled plugin ${PluginStorage.items[i].name ?? PluginStorage.items[i].id}`)
                }
                uiManager.open(player, 'config_menu')
            })
        })
    }
    unload() { }
}

export default PluginToggler