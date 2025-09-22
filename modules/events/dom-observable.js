class DomObservable {
	/*
	 * class uses internal fields to support method chaining and subscriptions
	 * must be used via a new instance to ensure proper isolation of the state
	 */
	#event;
	#propName;
	#handlers = new Set();
	#observer;

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

	on() {
		if (this.#handlers.length === 0) {
			const error = 'domObservable: no handlers were registered';
			console.error(error);
			new Notive(error);
			return;
		}

		if (!this.#event) {
			const error = 'domObservable: no event was set to listen to';
			console.error(error);
			new Notive(error);
			return;
		}

		this.#patch();

		if (!this.#observer) {
			this.#observer = new MutationObserver(() => {
				setTimeout(() => this.#patch(), 50);
			});

			this.#observer.observe(document.body, {
				childList: true,
				subtree: true,
			});
		}
	}

	#patch() {
		this.#handlers.forEach((handler) => {
			if (!handler.selectors) return;
			handler.selectors.forEach((selector) => {
				this.#handleSelector(handler.handler, selector);
			});
		});
	}

	#handleSelector(handler, selector) {
		const elements = document.querySelectorAll(selector);
		if (elements.length === 0) return;

		elements.forEach((element) => {
			if (element.dataset[this.#propName]) return;
			element.dataset[this.#propName] = 'true';

			element.addEventListener(this.#event.name, (event) => {
				if (!this.#event.isMatchFn(event)) return;
				handler.patch(element, event);
			});
		});
	}
}
