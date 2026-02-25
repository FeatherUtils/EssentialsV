import { world, system } from '@minecraft/server'
import { prismarineDb } from '../Libraries/PrismarineDB/index'
import { SegmentedStoragePrismarine } from '../Libraries/PrismarineDB/Storage/segmented'
import { getPluginByID } from './PluginStorage'
import { ChestFormData } from '../Libraries/ChestUI/extensions/forms.js'

class Economy {
    constructor() {
        this.name = 'EconomyHandler'
        this.id = 'economy_handler'
        this.core = true
        this.defaultEnabled = true
        this.enabled = false
    }
    async load() {
        this.Database = prismarineDb.customStorage('EconomyHandler', SegmentedStoragePrismarine)
        await this.Database.waitLoad();
        let defaultCurrency = this.Database.findFirst({ default: true })
        if (!defaultCurrency) this.Database.insertDocument({
            scoreboard: 'money',
            name: 'Money',
            default: true,
            symbol: '$',
            type: 'currency'
        })
        const uiManager = getPluginByID('ui_manager')
        uiManager.addUI('economy_editor', 'ee', (player) => {
            let form = new ChestFormData(54);
            form.title('Economy Editor')
            let currencies = this.getAll()
            for (const i in currencies) {
                form.button(i, currencies[i].data.name, [currencies[i].data.scoreboard], 'textures/items/emerald', 1, () => {
                    console.log('a')
                }, null, false)
            }
        })
    }
    create(scoreboard, name, symbol) {
        if (this.Database.findDocuments({ type: 'currency' }).length > 30) return false;
        this.Database.insertDocument({
            scoreboard,
            name,
            symbol,
            default: false,
            type: "currency"
        })
        return true;
    }
    getAll() {
        return this.Database.findDocuments({ type: 'currency' })
    }
    get(id) {
        return this.Database.getByID(id)
    }
    edit(id, scoreboard, name, symbol) {
        let doc = this.get(id)
        if (!doc) return;
        doc.data.scoreboard = scoreboard
        doc.data.name = name
        doc.data.symbol = symbol
        return this.Database.overwriteDataByID(id, doc.data);
    }
    del(id) {
        if (this.Database.getByID(id).data.default == true) return false;
        return this.Database.deleteDocumentByID(id);
    }
    unload() { }
}

export default Economy;