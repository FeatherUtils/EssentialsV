const PluginStorage = {
    items: [],
};

function getPluginByID(id) {
    return PluginStorage.items.find(_ => _.id === id);
}

export { PluginStorage, getPluginByID };