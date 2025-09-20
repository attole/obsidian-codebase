class FolderManager {
	get #pathManager() {
		return window.customJS.createPathManagerInstance();
	}

	// check if folder exist by provided path. any paths with extensions are ignored
	doFolderExist(path) {
		if (this.#pathManager.inferPathType(path) !== 'folder') return;
		return !!this.getFolder(path);
	}

	// ensure the folder by provided path is existing. any paths with extensions are ignored
	async ensureFolder(path) {
		if (this.doFolderExist(path)) return this.getFolder(path);
		return await this.createFolder(path);
	}

	// get folder by provided path. any paths with extensions are ignored
	getFolder(path) {
		if (this.#pathManager.getEntryType(path) !== 'folder') return;
		if (path.endsWith('/')) path = path.slice(0, path.length - 1);

		return app.vault.getFolderByPath(path);
	}

	// get all folders, including root
	getAllFolders() {
		return app.vault.getAllFolders();
	}

	// get all direct childs by provided folder path. any paths with extensions are ignored
	getDirectNotes(path) {
		const folder = this.getFolder(path);
		if (!folder) return [];

		return folder.children.filter(
			(c) => this.#pathManager.getEntryType(c.path) !== 'folder'
		);
	}

	// get all notes (direct and deeper) by provided folder path. any paths with extensions are ignored
	getAllNotes(path) {
		const folder = this.getFolder(path);
		if (!folder) return [];

		const result = [];
		const recurse = (f) => {
			for (const child of f.children) {
				if (this.#pathManager.getEntryType(child.path) !== 'folder') {
					result.push(child);
				} else recurse(child);
			}
		};

		recurse(folder);
		return result;
	}

	/*
	 * create a folder by provided path. any paths with file extensions are ignored
	 * mode:
	 *  - 'try': return the existing folder if is exists, otherwise create it
	 *  - 'safe': if folder exists, create and return new folder with a unique name
	 *  - 'force': if folder exists, delete it first, then create and return new folder
	 */
	async createFolder(path, mode = 'try') {
		if (this.#pathManager.inferPathType(path) !== 'folder') return;

		if (mode === 'safe') {
			path = this.#pathManager.getUniquePath(path);
		} else {
			const existing = this.getFolder(path);
			if (existing) {
				if (mode === 'try') return existing;
				await this.app.vault.delete(existing, true);
			}
		}

		try {
			return await app.vault.createFolder(path);
		} catch (err) {
			const error = `createFolder: failed to create folder for ${path}.\nError: ${err}`;
			console.error(error);
			new Notice(error);
		}
	}

	/*
	 * rename a folder and its content from and to provided path. any paths with file extensions are ignored
	 * options:
	 *  - 'try': if target folder exists, return it, otherwise rename the folder
	 *  - 'safe': if target folder exists, move all the source entries into a uniquely named folder
	 *  - 'force' and 'append: true': if target folder exists, append all the source entries into it
	 *  - 'force' and 'append: false': if target folder exists, delete it and its content first, then rename source
	 */
	async renameFolder(path, newName, options) {
		const sourceFolder = this.getFolder(path);
		if (!sourceFolder) {
			const error = `renameFolder: no source folder under ${path} exists`;
			console.error(error);
			new Notice(error);
			return;
		}

		if (this.#pathManager.getBaseName(path) === newName)
			return sourceFolder;

		const targetFolderPath = this.#pathManager.buildPath(
			this.#pathManager.getParentFolderPath(path),
			newName
		);

		return await this.#moveFolderInternal(
			sourceFolder,
			targetFolderPath,
			options
		);
	}

	/*
	 * move a folder and its content from and to provided path. any paths with file extensions are ignored
	 * options:
	 *  - 'try': if target folder exists, return it, otherwise move the folder
	 *  - 'safe': if target folder exists, move all the source entries into a uniquely named folder
	 *  - 'force' and 'append: true': if target folder exists, append all the source entries into it
	 *  - 'force' and 'append: false': if target folder exists, delete it and its content first, then move source
	 */
	async moveFolder(path, newPath, options) {
		if (
			this.#pathManager.inferPathType(path) !== 'folder' ||
			this.#pathManager.inferPathType(newPath) !== 'folder'
		)
			return;

		const sourceFolder = this.getFolder(path);
		if (!sourceFolder) {
			const error = `moveFolder: no source folder under ${path} exists`;
			console.error(error);
			new Notice(error);
			return;
		}

		if (this.#pathManager.getParentFolderPath(path) === newPath)
			return sourceFolder;

		const targetFolderPath = this.#pathManager.buildPath(
			newPath,
			this.#pathManager.getBaseName(path)
		);

		return await this.#moveFolderInternal(
			sourceFolder,
			targetFolderPath,
			options
		);
	}

	// delete provided folder.
	async deleteFolder(folder) {
		if (!folder) return;

		await this.app.vault.delete(folder, true);
		return true;
	}

	async #moveFolderInternal(sourceFolder, targetFolderPath, options) {
		const mode = (options && options.mode) || 'try';
		const append = options && options.append;
		let targetFolder = null;

		if (mode === 'safe') {
			targetFolder = await this.createFolder(
				this.#pathManager.getUniquePath(targetFolderPath)
			);
		} else {
			targetFolder = this.getFolder(targetFolderPath);
			if (targetFolder) {
				if (mode === 'try') return targetFolder;

				if (!append) {
					targetFolder = await this.createFolder(
						targetFolder,
						'force'
					);
				}
			} else {
				targetFolder = this.createFolder(targetFolderPath);
			}
		}

		await this.#moveRecursively(sourceFolder, targetFolder);
		await this.deleteFolder(sourceFolder);
		return targetFolder;
	}

	async #moveRecursively(sourceFolder, targetFolder) {
		for (const child of sourceFolder.children) {
			const childType = this.#pathManager.getEntryType(child.path);

			if (childType === 'note') {
				await this.moveNote(child.path, newFolder.path, {
					mode: 'safe',
				});
				continue;
			}
			if (childType === 'folder') {
				await this.moveFolder(child.path, newFolder.path, {
					mode: 'force',
				});
				continue;
			}

			const newFilePath = this.#pathManager.buildNotePath(
				targetFolder,
				this.#pathManager.getBaseName(child)
			);

			await app.fileManager.renameFile(child, newFilePath);
		}
	}
}
