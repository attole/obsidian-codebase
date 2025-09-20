class Tokenizer {
	// Method chaining desing is chosen, and from outside tokenized is used as new instance each time
	// If ever change design - clear internall data at replaceAndCollect
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
