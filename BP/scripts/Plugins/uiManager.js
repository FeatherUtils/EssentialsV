import { functionStore } from "../Libraries/PrismarineDB/index";
import { ActionFormData } from "@minecraft/server-ui";
import { system } from '@minecraft/server'

function preview() {
    return true;
}

class UIManager {
    #store
    #descriptions
    #altStore
    #uis
    constructor() {
        this.name = 'UI Manager'
        this.id = 'ui_manager'
        this.defaultEnabled = true
        this.enabled = false;
        this.core = true;
    }
    get uis() {
        return [...this.#store.getList()].map((_, index) => {
            const a = [...this.#altStore.getList()][index];
            return {
                id: _,
                altId: a || null,
                ui: function () { },
                desc: this.#descriptions.get(_)
            };
        });
    }
    load() {
        this.#store = functionStore.getStore("uis");
        this.#altStore = functionStore.getStore("uis_alt");
        this.#descriptions = new Map();
        this.#uis = {};
        this.enabled = true
        system.afterEvents.scriptEventReceive.subscribe((e) => {
            if (e.id !== 'essentials:open') return;
            this.open(e.sourceEntity, e.message)
        })
    }
    unload() { }
    addUI(id, desc, ui) {
        this.#descriptions.set(id, desc);
        let names = id.split(' | ');
        let mainName = names[0];
        this.#store.add(mainName, ui);
        this.#uis[mainName] = "MAIN";
        if (names.length > 1) {
            this.#altStore.add(names.slice(1).join(' | '), ui);
            this.#uis[names.slice(1).join(' | ')] = "ALT"
        }
    }
    open(player, id, ...data) {
        system.run(() => {
            let name = id.split(' | ')[0];
            let type = this.#uis[name];
            if (!type) {
                let form = new ActionFormData();
                if (preview) {
                    form.title("")
                    form.header(`§c§lERROR`)
                    form.divider()
                    form.label(`Error while opening UI: ${name} does not exist.`)
                } else {
                    form.body(`§c§lERROR§r§c\nError while opening UI: ${name}. It does not exist`)
                }
                form.button("Exit", null)
                form.show(player)
                return;
            }
            player.runCommand(`scriptevent feather:uiOpened A UI was opened by ${player.name} with ID ${name}`)
            if (type == "MAIN") {
                try {
                    this.#store.call(name, player, ...data);
                } catch (e) {
                    let form = new ActionFormData();
                    form.title("")
                    if (preview) {
                        form.header(`§c§lERROR`)
                        form.divider()
                        form.label(`§c${e}`)
                        form.divider()
                        form.label(`§c${e.stack}`)
                    } else {
                        form.body(`§c§lError§r§c\n${e}\n${e.stack}`)
                    }
                    form.button("Exit", null)
                    form.show(player)
                }
            } else if (type == "ALT") {
                try {
                    this.#altStore.call(name, player, ...data);
                } catch (e) {
                    let form = new ActionFormData();
                    form.title("")
                    if (preview) {
                        form.header(`§c§lERROR`)
                        form.divider()
                        form.label(`§c${e}`)
                        form.divider()
                        form.label(`§c${e.stack}`)
                    } else {
                        form.body(`§c§lError§r§c\n${e}\n${e.stack}`)
                    }
                    form.button("Exit", null)
                    form.show(player)
                }
            }
        })
    }
}
export default new UIManager