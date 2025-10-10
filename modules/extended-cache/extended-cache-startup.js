class ExtendedCacheStartup {
	load() {
		if (app.metadataCache._extendedFileCache) return;

		app.metadataCache._extendedFileCache = new Map();

		app.metadataCache.getExtendedFileCache = function (file) {
			return this._extendedFileCache.get(file.path);
		};

		app.metadataCache.setExtendedFileCache = function (file, cache) {
			this._extendedFileCache.set(file.path, cache);
		};

		app.metadataCache.clearExtendedFileCache = function (file) {
			if (file) {
				this._extendedFileCache.delete(file.path);
			} else {
				this._extendedFileCache.clear();
			}
		};

		app.metadataCache.on('changed', (file) => {
			this.#lazyRebuild(file);
		});

		app.vault.on('rename', (file) => {
			this.#lazyRebuild(file);
		});

		app.vault.on('delete', (file) => {
			this.#lazyRebuild(file);
		});
	}

	// delete in memory cache, to get it recalculated on next call
	#lazyRebuild(file) {
		const pathManager = window.customJS.PathManager;
		const fileType = pathManager.getEntryType(file.path);
		if (fileType !== 'note') return;

		app.metadataCache.clearExtendedFileCache(file);
	}
}
