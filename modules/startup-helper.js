class StartupHelper {
	#shiftEnterEvent = {
		propName: 'shiftEnter',
		event: {
			name: 'keyup',
			isMatchFn: (event) => event.code === 'Enter' && event.shiftKey,
		},
	};

	#shiftSpaceEvent = {
		propName: 'shiftSpace',
		event: {
			name: 'keyup',
			isMatchFn: (event) => event.code === 'Space' && event.shiftKey,
		},
	};

	#inputFields = [
		'.prompt-input',
		'input[type="search"][enterkeyhint="search"]',
		'.modal-content input',
	];

	setupEditorObservables() {
		const shiftSpaceOb = this.#getEditorObservable(this.#shiftSpaceEvent, [
			window.customJS.DateObserver,
			window.customJS.LinkObserver,
		]);

		const shiftEnterOb = this.#getEditorObservable(this.#shiftEnterEvent, [
			window.customJS.EmptyLineObserver,
		]);

		return [shiftEnterOb, shiftSpaceOb];
	}

	setupDomObservables() {
		this.#setupDomObservableInternal(this.#shiftSpaceEvent, [
			{
				handler: window.customJS.DateObserver,
				selectors: this.#inputFields,
			},
		]);
	}

	#getEditorObservable(event, observers) {
		if (!event || !observers || observers.length === 0) return;

		const editorObservable = window.customJS
			.createEditorObservableInstance()
			.listen(event.event, event.propName);

		observers.forEach((observer) => editorObservable.register(observer));
		return editorObservable;
	}

	#setupDomObservableInternal(event, observers) {
		if (!observers || observers.length === 0) return;

		const domObservable = window.customJS
			.createDomObservableInstance()
			.listen(event.event, event.propName);

		observers.forEach((observer) => domObservable.register(observer));
		domObservable.on();
	}

	// TODO get this settigs from db
	async #syncLocalGraphSettings() {
		await app.workspace.iterateAllLeaves((leaf) => {
			(async () => {
				const view = leaf.view;
				if (view.getViewType() === 'localgraph') {
					const state = view.getState(); //remove later
					state.options.linkDistance = 0; //remove later
					//get state from db
					try {
						await view.setState(state);
					} catch {}
				}
			})();
		});
	}
}
