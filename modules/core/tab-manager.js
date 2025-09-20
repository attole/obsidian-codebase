class TabManager {
	// ensure at least one active leaf exist, not to get error of no editor
	// used mostly after closeAllTabs()
	async ensureAnyTabExist() {
		if (app.workspace.rootSplit.children.length === 0) {
			await app.workspace.createLeafBySplit(
				app.workspace.rootSplit,
				'vertical'
			);
		}
	}

	/*
	 * open tab of provided type with provided options
	 * optios:
	 * - panel: 'left', 'right', 'main' - in which side to open tabs - sidebars or main. default is main
	 * - split:
	 * 		- none or 'false': open in main tab
	 * 		- 'true': open in a split with default direction for this panel
	 * 		- '{direction: 'vertical | 'horizontal' }: open in a split on that direction
	 *  	- filePath: if type set to 'markdown' or 'local-graph', then it is path to this note
	 * - active: whether opened tab would be set as active
	 * - pinned: whether opened tab would be pinned
	 *
	 * should not be used on any type of full from scratch layouts, because:
	 * - usage of empty side panels leaves is hard af,
	 * - no way to open some types of tabs (local-graph, some plugin ones) on sidepanels
	 * - no way to preserve state of tabs on sidebars, their settings, sizes, exact locations,
	 *   while obsidian do track this internally if not all tabs forcefully closed on reloads
	 */
	async openTab(type, options = {}) {
		const {
			panel,
			split = false,
			filePath,
			active = false,
			pinned = false,
		} = options;

		// no way to open local graph anywhere rather than in default splitscreen
		if (type === 'local-graph') {
			return this.#openLocalGraph(filePath);
		}

		const splitValue = !split
			? split
			: split.direction
			? ['split', split.direction]
			: true;

		try {
			let leaf = (() => {
				switch (panel) {
					case 'left':
						return app.workspace.getLeftLeaf(splitValue);
					case 'right':
						return app.workspace.getRightLeaf(splitValue);
					default:
						return app.workspace.getLeaf(splitValue);
				}
			})();

			let state = {};
			if (type === 'markdown' && filePath) {
				const doExist =
					window.customJS.NoteManager.doNoteExistByPath(filePath);
				if (!doExist) return;
				state.file = filePath;
			}

			if (type === 'file' && filePath) {
				const file = app.vault.getFileByPath(filePath);
				if (!file) return;
				return leaf.openFile(file);
			}

			await leaf.setViewState({ type, state, active, pinned });
			return leaf;
		} catch (err) {
			const error = `openTab: ${err}`;
			console.error(error);
			new Notice(error);
		}
	}

	closeActiveTab() {
		const activeLeaf = app.workspace.activeLeaf;
		if (activeLeaf) {
			activeLeaf.detach();
		}
	}

	// common types are: 'markdown', 'file-explorer', 'search', 'graph'
	closeAllTabs(type) {
		if (type) {
			app.workspace.detachLeavesOfType(type);
			return;
		}

		app.workspace.iterateAllLeaves((leaf) => {
			leaf.detach();
		});
	}

	pinActiveTab() {
		const leaf = app.workspace.activeLeaf;
		return this.pinTab(leaf);
	}

	pinTab(leaf) {
		if (!leaf) return;
		leaf.setPinned(true);
	}

	// open local graph for path (if none - active note)
	// however, on active note change local graph auto sync
	async #openLocalGraph(filePath) {
		if (!filePath) {
			const leaf = app.workspace.activeLeaf;
			if (leaf?.view instanceof obsidian.MarkdownView) {
				filePath = leaf.view.file.path;
			}
		}

		const doExist = window.customJS.NoteManager.doNoteExistByPath(filePath);
		if (!doExist) return;

		const leaf = app.workspace.activeLeaf;
		await window.customJS.NoteManager.openNoteByPath(filePath);

		app.workspace.setActiveLeaf(leaf);
		await app.commands.executeCommandById('graph:open-local');
		leaf.detach();
	}
}
