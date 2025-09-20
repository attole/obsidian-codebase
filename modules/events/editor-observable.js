class EditorObservable {
	#event;
	#propName;
	#handlers = new Set();

	register(...handlers) {
		handlers.forEach((handler) => this.#handlers.add(handler));
	}

	deregister(...handlers) {
		handlers.forEach((handler) => this.#handlers.delete(handler));
	}

	listen(event, propName) {
		this.#event = event;
		this.#propName = propName ?? isMatchFn.toString();
		return this;
	}

	// attach to user active editor and fire handlers on set event
	on(editor) {
		if (!this.#event) {
			const error = 'editorObservable: no event was set to listen to';
			console.error(error);
			new Notive(error);
			return;
		}

		if (this.#handlers.length === 0) {
			const error = 'editorObservable: no handlers were registered';
			console.error(error);
			new Notive(error);
			return;
		}

		const dom = editor.cm.dom;
		if (dom.dataset[this.#propName]) return;
		dom.dataset[this.#propName] = 'true';

		dom.addEventListener(this.#event.name, (event) => {
			if (!this.#event.isMatchFn(event)) return;
			this.#handlers.forEach((handler) => handler.edit(editor, event));
		});
	}
}
