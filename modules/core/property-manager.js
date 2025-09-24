class PropertyManager {
	/*
	 * set properties of a provided note.
	 * modes:
	 * - 'try' : if target property exists, do not change it, otherwise just create new
	 * - 'append' : if target property exists and has list type, append unique values to the end
	 * - 'force': if target property exists, delete all firstly, then set new values
	 */
	async set(note, props, mode = 'try') {
		await app.fileManager.processFrontMatter(note, async (frontmatter) => {
			for (const [key, value] of Object.entries(props)) {
				const targetPropValue = frontmatter[key];

				if (!targetPropValue) {
					const probablyPropType = this.#guessPropertyType(value);
					// set type manually only on new props, cause this metadata is used among all notes in vault
					app.metadataTypeManager.setType(key, probablyPropType);

					frontmatter[key] = value;
					continue;
				}

				if (mode === 'try') continue;
				if (mode === 'force') {
					frontmatter[key] = this.#parsePropertyValue(key, value);
					continue;
				}

				if (!['multitext', 'tags'].contains(this.#getPropertyType(key)))
					continue;

				const filtered = value.filter(
					(x) => !targetPropValue.contains(x)
				);
				frontmatter[key] = [...targetPropValue, ...filtered];
			}
		});
	}

	// get property value by key on provided note
	async read(note, key) {
		let value = null;
		await app.fileManager.processFrontMatter(note, (frontmatter) => {
			value = frontmatter[key];
		});
		return value;
	}

	// delete property on provided note
	async delete(note, key) {
		await app.fileManager.processFrontMatter(note, (frontmatter) => {
			delete frontmatter[key];
		});
	}

	// remove provided properties if they are array type on provided note
	async remove(note, props) {
		await app.fileManager.processFrontMatter(note, (frontmatter) => {
			for (const [key, value] of Object.entries(props)) {
				let targetValue = frontmatter[key];
				if (!targetValue) continue;

				if (!['multitext', 'tags'].contains(this.#getPropertyType(key)))
					continue;

				targetValue = targetValue.filter((x) => !value.contains(x));
				if (targetValue.length === frontmatter[key].length)
					delete frontmatter[key];
				else frontmatter[key] = targetValue;
			}
		});
	}

	// get all properties for provided note
	async list(note) {
		let copy = {};
		await app.fileManager.processFrontMatter(note, (frontmatter) => {
			copy = { ...frontmatter };
		});
		return copy;
	}

	async listAll() {
		return await app.metadataTypeManager.getAllProperties();
	}

	/*
	 * as scripts manually create notes, no default obsidian template expressions are parsed automatically
	 * moreover, there is a need to know whether note was created properly (templates where replaced),
	 * so those expressions are specifically different to default obsidian ones, and are fixed there
	 * rules:
	 * - {{currentDate}} - current date
	 */
	async fix(note) {
		const properties = await this.list(note);
		if (!properties) return;

		// replate date template expression for current date
		const date = window.customJS.DateExpressionParser.parse();
		for (const key in properties) {
			if (properties[key] === '{{currentDate}}') {
				await this.set(note, { [key]: date }, 'force');
			}
		}
	}

	#getPropertyType(key) {
		const info = app.metadataTypeManager.getPropertyInfo(key);
		return info.widget;
	}

	#parsePropertyValue(key, value) {
		const info = app.metadataTypeManager.getPropertyInfo(key);
		if (!info) return value;

		switch (info.widget) {
			case 'number':
				return Number(value);
			case 'date':
			case 'datetime':
				return new Date(value);
			case 'checkbox':
				return Boolean(value);
			case 'tags':
			case 'multitext':
				return Array.isArray(value) ? value : [value];
			case 'yaml':
				return value;
			case 'text':
			default:
				return String(value);
		}
	}

	#guessPropertyType(value) {
		if (value === null || value === undefined) return 'text';

		if (typeof value === 'string') {
			return value.startsWith('#') ? 'tags' : 'text';
		}

		if (typeof value === 'number') return 'number';
		if (typeof value === 'boolean') return 'checkbox';
		if (value instanceof Date) return 'date';

		if (Array.isArray(value)) {
			if (value.every((v) => typeof v === 'string' && v.startsWith('#')))
				return 'tags';
			return 'multitext';
		}

		if (typeof value === 'object') return 'yaml';
		return 'text';
	}
}
