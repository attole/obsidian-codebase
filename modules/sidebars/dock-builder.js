class DockBuilder {
	async run() {
		const data = await this.#getData('in my mind/utilities/layout/dock');

		if (!data || !data.config || data.files.length === 0) return;

		const { config, files } = data;
		let dockFiles = this.#formDockFiles(config.files, files);
		if (!dockFiles) return;

		this.#closeAllDockFiles(config.position);
		await this.#openDockFiles(dockFiles, config.position);
		this.#resizeDockFiles(dockFiles, config.position);
	}

	// // TODO get this data from db, not manual config
	async #getData(folderPath) {
		let files = window.customJS.FolderManager.getDirectNotes(folderPath);

		const configFile = files.find((file) => file.name === 'config.json');
		if (!configFile) return;

		files = files.filter((file) => file !== configFile);
		const config = JSON.parse(await app.vault.read(configFile));

		if (!config.position || !config.files) return;
		return { config, files };
	}

	#formDockFiles(configFiles, files) {
		let dockFiles = [];

		let sum = 0;
		for (const [key, value] of Object.entries(configFiles)) {
			if (Number.isNaN(value) || value < 0 || value > 100) continue;
			sum += value;
			if (sum > 100) return dockFiles;

			const file = files.find((file) => file.basename === key);
			if (file) dockFiles.push({ file, size: value });
		}

		return dockFiles.length !== 0 ? dockFiles : null;
	}

	async #openDockFiles(dockFiles, position) {
		for (const { file } of dockFiles) {
			const type = window.customJS.PathManager.getEntryType(file.path);

			await window.customJS.TabManager.openTab(type, {
				panel: position,
				split: true,
				filePath: file.path,
			});
		}
	}

	#resizeDockFiles(dockFiles, position) {
		const sidebar = document.querySelector(
			`.workspace-split.mod-sidedock.mod-${position}-split`
		);

		const modTopSize = 100 - dockFiles.reduce((acc, c) => acc + c.size, 0);

		const modTop = sidebar.querySelector('.workspace-tabs.mod-top');
		modTop.style.flexGrow = modTopSize;

		const tabs = Array.from(
			sidebar.querySelectorAll('.workspace-tabs:not(.mod-top)')
		);

		for (const index in tabs) {
			tabs[index].style.flexGrow = dockFiles[index].size;
		}
	}

	#closeAllDockFiles(position) {
		let sidebarSplit;
		if (position === 'left') sidebarSplit = app.workspace.getLeftLeaf(true);
		else sidebarSplit = app.workspace.getRightLeaf(true);

		sidebarSplit = sidebarSplit.parent.parent;
		if (!sidebarSplit) return;

		[...sidebarSplit.children].forEach((leaf) => {
			if (leaf.containerEl.classList.contains('mod-top')) return;
			leaf.detach();
		});
	}
}
