class ExtendedCacheManager {
	async getCache(note) {
		return (
			app.metadataCache.getExtendedFileCache(note) ??
			(await window.customJS.ExtendedCacheBuilder.build(note))
		);
	}

	async getSections(note, types = []) {
		const extendedCache = await this.getCache(note);
		if (!extendedCache) return {};

		if (types.length === 0) return extendedCache.sections;

		const result = {};
		for (const type of types) {
			const typedSections = structuredClone(
				extendedCache.sections.filter((s) => s.type === type)
			);

			typedSections.forEach((section) => delete section.type);
			result[type] = typedSections ?? [];
		}

		return result;
	}

	async getMetadata(note, types = []) {
		const extendedCache = await this.getCache(note);
		if (!extendedCache) return {};

		if (types.length === 0) return extendedCache.metadata;

		const result = {};
		for (const type of types) {
			result[type] = extendedCache.metadata[type] ?? [];
		}

		return result;
	}

	/*
	 * WARNING: for testing only!
	 *
	 * the extended cache is rebuilt lazily whenever obsidian's metadata cache updates
	 * there is generally no need to call this.
	 *
	 * this method does not force a full rebuild—it, but simply clears the existing cache
	 * for the given note, which will then be rebuilt based on the default cache
	 *
	 * in most cases, calling this will produce the same result as before
	 */
	updateCache(note) {
		console.error('FORCE CLEAR EXTENDED CACHE:', note);
		app.metadataCache.clearExtendedFileCache(note);
	}
}
