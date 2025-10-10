class Tokenizer {
	/*
	 * class uses internal fields to support method chaining
	 * must be used via a new instance to ensure proper isolation of the state
	 */
	#tokens = null;
	#text = null;

	tokenize(text, pattern) {
		this.#text = text;
		this.#tokens =
			(pattern ? text.match(pattern) : text.split(/\s+/)) || [];

		if (!this.#tokens) return this;

		let lastIndex = 0;
		this.#tokens = this.#tokens.map((token) => {
			const start = text.indexOf(token, lastIndex);
			if (start === -1) return { input: token, position: null };

			const end = start + token.length;
			lastIndex = end;

			return {
				input: token,
				position: { start, end },
			};
		});

		return this;
	}

	map(fn) {
		if (!this.#text) {
			const error = 'tokenizer: no data were loaded';
			console.error(error);
			new Notice(error);
			return;
		}

		this.#tokens = this.#tokens.map((token) => {
			return {
				input: token.input,
				output: fn(token.input),
				position: token.position,
			};
		});

		return this;
	}

	async mapAsync(fn) {
		if (!this.#text) {
			const error = 'tokenizer: no data were loaded';
			console.error(error);
			new Notice(error);
			return;
		}

		const result = await Promise.all(
			this.#tokens.map(async (token) => {
				return {
					input: token.input,
					output: await fn(token.input),
					position: token.position,
				};
			})
		);

		this.#tokens = result;

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
			(pair) => pair?.output && pair.input != pair.output && pair.position
		);

		if (this.#tokens.length === 0) return this.#text;

		let newText = '';
		let lastIndex = 0;

		for (const token of this.#tokens) {
			newText += this.#text.slice(lastIndex, token.position.start);
			newText += token.output;
			lastIndex = token.position.end;
		}

		newText += this.#text.slice(lastIndex);
		return newText;
	}
}
