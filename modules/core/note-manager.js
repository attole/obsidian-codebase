class NoteManager {
	get #pathManager() {
		return window.customJS.createPathManagerInstance();
	}
	get #folderManager() {
		return window.customJS.createFolderManagerInstance();
	}

	// check if note exist by provided path. handle missing '.md' extension
	doNoteExistByPath(path) {
		return !!this.getNoteByPath(path);
	}

	// check if note exist by provided name. handle missing '.md' extension
	doNoteExistByName(name) {
		return this.getNotesByName(name).length > 0;
	}

	// ensure the note by provided path is existing. handle missing '.md' extension
	async ensureNote(path) {
		if (this.doNoteExistByPath(path)) return this.getNoteByPath(path);
		return await this.createNoteByFullPath({ path });
	}

	// get note by provided path. handle missing '.md' extension
	getNoteByPath(path) {
		if (this.#pathManager.inferPathType(path) === 'file') return;
		path = this.#pathManager.ensureNoteExtension(path);
		if (this.#pathManager.getEntryType(path) !== 'note') return;
		return app.vault.getAbstractFileByPath(path);
	}

	// get all notes by provided name. handle missing '.md' extension
	getNotesByName(name) {
		name = this.#pathManager.ensureNoteExtension(name);
		return app.vault.getFiles().filter((f) => f.name === name) || [];
	}

	// get all notes by provide tags
	getNotesByTags(...tags) {
		let notes = this.getAllNotes();
		return notes.filter((note) => {
			const cache = app.metadataCache.getFileCache(note);
			const noteTags = cache.frontmatter?.tags;
			if (!noteTags) return false;

			return tags.every((t) => noteTags.contains(t));
		});
	}

	// get all notes
	getAllNotes() {
		return app.vault.getFiles().filter((f) => f.name.endsWith('.md')) || [];
	}

	/*
	 * open note by provided name. handle missing '.md' extension
	 * - 'all: true' - open all found notes, 'all: false' - open only first one
	 * split:
	 * - none or 'false': open in active tab
	 * - 'true': open in new tab on right split
	 * - '{direction: 'vertical | 'horizontal' }: open in a split on that direction
	 */
	async openNotesByName({ name, all = false, split = false }) {
		const notes = this.getNotesByName(name);
		if (notes.length === 0) {
			const error = `openNotesByName: no notes by ${name} name exist`;
			console.error(error);
			new Notice(error);
			return;
		}

		if (!all || notes.length === 1) {
			const note = await this.openNote(notes[0], split);
			return all ? [note] : note;
		}

		await notes.forEach(async (note) => {
			await this.openNote(note, split);
		});
		return notes;
	}

	/*
	 * open note by provided path. handle missing '.md' extension
	 * split:
	 * - none or 'false': open in active tab
	 * - 'true': open in new tab on right split
	 * - '{direction: 'vertical | 'horizontal' }: open in a split on that direction
	 */
	async openNoteByPath(path, split = false) {
		const note = this.getNoteByPath(path);
		if (!note) {
			const error = `openNoteByPath: no notes under ${path} exists`;
			console.error(error);
			new Notice(error);
			return;
		}

		return await this.openNote(note, split);
	}

	/*
	 * open provided note
	 * split:
	 * - none or 'false': open in active tab
	 * - 'true': open in new tab on right split
	 * - '{direction: 'vertical | 'horizontal' }: open in a split on that direction
	 */
	async openNote(note, split = false) {
		await window.customJS.TabManager.ensureAnyTabExist();

		let leaf;
		if (split === true) {
			leaf = app.workspace.getLeaf('split', 'vertical');
		} else if (typeof split == Object && split.direction) {
			leaf = app.workspace.getLeaf('split', split.direction);
		} else leaf = app.workspace.getLeaf(true);

		await leaf.openFile(note);
		return leaf;
	}

	/*
	 * create note by provided path, name and content. handle missing '.md' extension
	 * options:
	 *  - 'try': if target note exists, return it, otherwise create the note
	 *  - 'safe': if target note exists, create a new note with a unique name
	 *  - 'force' and 'append: true': if target note exists, append content from the source note into it
	 *  - 'force' and 'append: false': if target note exists, delete its content first, than create target note
	 */
	async createNote({ folderPath, name, content = '', options }) {
		return await this.createNoteByFullPath({
			path: this.#pathManager.buildNotePath(folderPath, name),
			content,
			options,
		});
	}

	/*
	 * create note by provided full path and content. handle missing '.md' extension
	 * options:
	 *  - 'try': if target note exists, return it, otherwise create the source note
	 *  - 'safe': if target note exists, create a new note with a unique name
	 *  - 'force' and 'append: true': if target note exists, append content from the source note into it
	 *  - 'force' and 'append: false': if target note exists, delete its content first, than create target note
	 */
	async createNoteByFullPath({ path, content = '', options }) {
		path = this.#pathManager.ensureNoteExtension(path);
		await this.#folderManager.ensureFolder(
			this.#pathManager.getParentFolderPath(path)
		);

		const mode = (options && options.mode) || 'try';
		const append = options && options.append;

		if (mode === 'safe') {
			path = this.#pathManager.getUniquePath(path);
		} else {
			const existing = this.getNoteByPath(path);
			if (existing) {
				if (mode === 'try') existing;

				if (append) {
					await this.appendToNote(path, content);
					return this.getNoteByPath(path);
				}

				await this.deleteNote(existing);
			}
		}

		return await app.vault.create(path, content);
	}

	/*
	 * create note by provided folder path, name and template path. handle missing '.md' extension
	 * options:
	 *  - 'try': if target note exists, return it, otherwise create the source note
	 *  - 'safe': if target note exists, create a new note with a unique name
	 *  - 'force' and 'append: true': if target note exists, append content from the source note into it
	 *  - 'force' and 'append: false': if target note exists, delete its content first, than create target note
	 */
	async createNoteByTemplate({ folderPath, name, templatePath, options }) {
		return await this.createNoteByFullPathByTemplate({
			path: this.#pathManager.buildNotePath(folderPath, name),
			templatePath,
			options,
		});
	}

	/*
	 * create note by provided full path and template path. handle missing '.md' extension
	 * options:
	 *  - 'try': if target note exists, return it, otherwise create the source note
	 *  - 'safe': if target note exists, create a new note with a unique name
	 *  - 'force' and 'append: true': if target note exists, append content from the source note into it
	 *  - 'force' and 'append: false': if target note exists, delete its content first, than create target note
	 */
	async createNoteByFullPathByTemplate({ path, templatePath, options }) {
		const templateNote = this.getNoteByPath(templatePath);
		if (!templateNote) {
			const error = `createNoteByFullPathByTemplate: template file "${templatePath}" not found.`;
			console.error(error);
			new Notice(error);
			return;
		}

		let content = await app.vault.read(templateNote);
		content = content.replace(
			'{{date}}',
			window.customJS.DateExpressionParser.parse()
		);
		return this.createNoteByFullPath({ path, content, options });
	}

	/*
	 * rename note by provided path. handle missing '.md' extension
	 * options:
	 *  - 'try': if target note exists, return it, otherwise rename the source note
	 *  - 'safe': if target note exists, create a new note with a unique name
	 *  - 'force' and 'append: true': if target note exists, append all content from source note into it
	 *  - 'force' and 'append: false': if target note exists, delete it first, then rename source
	 */
	async renameNote(path, newName, options) {
		const sourceNote = this.getNoteByPath(path);
		if (!sourceNote) {
			const error = `renameNote: no source note under ${path} exists`;
			console.error(error);
			new Notice(error);
			return;
		}

		if (sourceNote.name === this.#pathManager.ensureNoteExtension(newName))
			return sourceNote;

		let targetPath = this.#pathManager.buildNotePath(
			this.#pathManager.getParentFolderPath(path),
			newName
		);

		return await this.#moveNoteInternal(sourceNote, targetPath, options);
	}

	/*
	 * move note to provided folder. handle missing '.md' extension
	 *  options:
	 *  - 'try': if target note exists, return it, otherwise move the source note
	 *  - 'safe': if target note exists, create a new note with a unique name
	 *  - 'force' and 'append: true': if target note exists, append all content from source note into it
	 *  - 'force' and 'append: false': if target note exists, delete it first, then move source
	 */
	async moveNote(path, newFolderPath, options) {
		const sourceNote = this.getNoteByPath(path);
		if (!sourceNote) {
			const error = `moveNote: no source note under ${path} exists`;
			console.error(error);
			new Notice(error);
			return;
		}

		if (
			this.#pathManager.getParentFolderPath(sourceNote.path) ===
			newFolderPath
		)
			return sourceNote;

		await this.#folderManager.ensureFolder(newFolderPath);

		const targetPath = this.#pathManager.buildNotePath(
			newFolderPath,
			this.#pathManager.getBaseName(path)
		);

		return await this.#moveNoteInternal(sourceNote, targetPath, options);
	}

	// merge two provided notes by appending content of second one into first one
	async mergeNotes(note1, note2) {
		const content = await app.vault.read(note2);
		return await this.appendToNote(note1, content);
	}

	//  append content to provided note
	async appendToNote(targetNote, text) {
		if (!text) return targetNote;

		const sourceContent = await app.vault.read(targetNote);
		const combinedContent = sourceContent + '\n---\n' + content;
		await app.vault.modify(targetNote, combinedContent);
		return targetNote;
	}

	//  delete provided note
	async deleteNote(note) {
		if (!note) return;

		await this.app.vault.delete(note);
		return true;
	}

	async #moveNoteInternal(sourceNote, targetPath, options) {
		const mode = (options && options.mode) || 'try';
		const append = options && options.append;
		if (mode === 'safe') {
			targetPath = this.#pathManager.getUniquePath(targetPath);
		} else {
			const targetNote = this.getNoteByPath(targetPath);
			if (targetNote) {
				if (mode === 'try') return targetNote;

				if (append) {
					await this.mergeNotes(targetNote, sourceNote);
					return this.getNoteByPath(targetPath);
				}
				await this.deleteNote(targetNote);
			}
		}

		await app.fileManager.renameFile(sourceNote, targetPath);
		return this.getNoteByPath(targetPath);
	}
}
