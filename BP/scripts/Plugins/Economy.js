import { world,system } from '@minecraft/server'
import { prismarineDb } from '../Libraries/PrismarineDB/index'
import { SegmentedStoragePrismarine } from '../Libraries/PrismarineDB/Storage/segmented'

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
        let defaultCurrency = this.Database.findFirst({default:true})
        if(!defaultCurrency) this.Database.insertDocument({
            scoreboard:'money',
            name:'Money',
            default:true,
            symbol: '$',
            type: 'currency'
        })
    }
    create(scoreboard,name,symbol) {
        this.Database.insertDocument({
            scoreboard,
            name,
            symbol,
            default:false,
            type: "currency"
        })
    }
    getAll() {
        return this.Database.findDocuments({type:'currency'})
    }
    get(id) {
        return this.Database.getByID(id)
    }
    del(id) {
        if(this.Database.getByID(id).data.default == true) return false;
        return this.Database.deleteDocumentByID(id);
    }
    unload() {}
}

export default Economy;