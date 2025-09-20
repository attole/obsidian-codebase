class PathManager {
	/*
	 * determine the type of entry by provided path WITHOUT checking the vault
	 * rules:
	 * - path ends with markdown file extension (.md) → return 'note'
	 * - path has a non-.md extension → return 'file'
	 * - path has no exension -> return 'folder'
	 */
	inferPathType(path) {
		if (!path) return;
		if (path.endsWith('.md')) return 'note';
		if (/\.[^\/]+$/.test(path)) return 'file';
		return 'folder';
	}

	/*
	 * determine the type of an REAL vault entry by provided path
	 * rules:
	 * - if the path points to a folder → return 'folder'
	 * - if the path points has folder end '/' -> return 'folder'
	 * - if the path is not point to folder and has no file extension -> append '.md'
	 * - if the path points to a markdown file (.md) → return 'note'
	 * - if the path points to a file with a non-.md extension → return 'file'
	 */
	getEntryType(path) {
		const folder = app.vault.getFolderByPath(path);
		if (folder instanceof obsidian.TFolder) return 'folder';
		if (path.endsWith('/')) return 'folder';
		if (!/\.[^\/]+$/.test(path)) path += '.md';
		const file = app.vault.getAbstractFileByPath(path);
		if (file instanceof obsidian.TFile) {
			if (path.endsWith('.md')) return 'note';
			return 'file';
		}
	}

	// check if entry exist. handle missing '.md' extension on notes
	doEntryExist(path) {
		const fileType = this.getEntryType(path);
		return !!fileType;
	}

	// get parent folder path for every file, even folder itself
	getParentFolderPath(path) {
		const parts = path.split('/');
		parts.pop();
		return parts.join('/');
	}

	// get base name of for file type
	getBaseName(path) {
		const name = path.split('/').pop() || '';
		return name.replace(/\..*$/, '');
	}

	// generate unique path by appending or incrementing a counter suffix '-n' to the basename, if entries by provided path already exists
	getUniquePath(basePath) {
		const doExist = this.doEntryExist(basePath);
		if (!doExist) return basePath;

		const fileType = this.inferPathType(basePath);
		const isFolder = fileType === 'folder';
		const extension = basePath.split('.').at(-1);

		const pattern = isFolder
			? /^(.*?)(?:-(\d+))?$/
			: `^(.*?)(?:-(\d+))?\.${extension}$`;

		const match = basePath.match(pattern);
		if (!match) {
			const error = `getUniquePath: internall error on ${basePath}`;
			console.error(error);
			new Notice(error);
			return;
		}

		let name = match[1];
		let num = match[2] ? parseInt(match[2], 10) : 1;
		let newPath = basePath;

		const exists = (path) =>
			isFolder
				? !!window.customJS.FolderManager.getFolder(path)
				: app.vault.getAbstractFileByPath(path);

		while (exists(newPath)) {
			newPath = isFolder
				? `${name}-${num}`
				: `${name}-${num}.${extension}`;
			num++;
		}

		return newPath;
	}

	// ensure that a path has a '.md' extension
	ensureNoteExtension(path) {
		return path.endsWith('.md') ? path : `${path}.md`;
	}

	// build path for file from its parts. do not add any extension
	buildPath(...parts) {
		return parts.flat().join('/').replace(/\/+/g, '/');
	}

	// build path for note. ensure note extension
	buildNotePath(...parts) {
		return this.ensureNoteExtension(this.buildPath(...parts));
	}
}
