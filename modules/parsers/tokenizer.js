class Tokenizer {
	/*
	 * class uses internal fields to support method chaining
	 * must be used via a new instance to ensure proper isolation of the state
	 */
	#tokens = null;
	#text = null;

	tokenize(text, pattern) {
		this.#text = text;
		this.#tokens = pattern ? text.match(pattern) : text.split(/\s+/);
		return this;
	}

	map(fn) {
		if (!this.#text) {
			const error = 'tokenizer: no data were loaded';
			console.error(error);
			new Notice(error);
			return;
		}

		this.#tokens = (this.#tokens || []).map((token) => {
			return {
				input: token,
				output: fn(token),
			};
		});

		return this;
	}

	replaceAndCollect() {
		if (!this.#text) {
			const error = 'tokenizer: no data were loaded';
			console.error(error);
			new Notice(error);
			return;
		}

		this.#tokens = this.#tokens.filter(
			(pair) => pair.output && pair.input != pair.output
		);

		if (this.#tokens.length === 0) return this.#text;

		let newText = this.#text;
		for (const token of this.#tokens) {
			newText = newText.replace(token.input, token.output);
		}

		return newText;
	}
}
