class LinkParser {
	TOKENIZE_LINKS =
		/\[\[[^\]]+\]\]|\[[^\]]*\]\([^)]+\)|\([^)]+\)\[[^\]]*\]|\[[^\]]+\]\([^)]+\)|\([^\]]*\)\[[^)]+\]|\[[^\]]+\]\[[^\]]+\]/;

	#EMPTY_LINK = '[[in my mind/utilities/archive/EMPTY LINK|EMPTY LINK]]';

	#EXTERNAL_LINK_FORMAT = /^\[[^\]]+\]\(https?:\/\/[^\s)]+\)$/;
	#EXTERNAL_LINK_WRONG_FORMATS = [
		{
			regex: /^\((https?:\/\/[^\s)]+)\)\[([^\]]+)\]$/,
			order: [2, 1],
		},
		{
			regex: /^\[(https?:\/\/[^\s\]]+)\]\(([^\)]+)\)$/,
			order: [2, 1],
		},
		{
			regex: /^\(([^\)]+)\)\[(https?:\/\/[^\s\]]+)\]$/,
			order: [1, 2],
		},
		{
			regex: /^\[([^\]]+)\]\[(https?:\/\/[^\s)]+)\]$/,
			order: [1, 2],
		},
		{
			regex: /^\[(https?:\/\/[^\s\]]+)\]\[([^\]]+)\]$/,
			order: [2, 1],
		},
	];

	#INTERNAL_LINK_FORMAT = /^\[\[[^\]]+\/[^\]]+\]\]$/;
	#INTERNAL_LINK_PATTERNS = [
		{
			// link to header of itself
			regex: /^\[\[#([^\^\|\]]+)\|?([^\]]+)?\]\]$/,
			handler: ([link, header, alias]) =>
				alias ? link : `[[#${header}|${header.toLowerCase()}]]`,
		},
		{
			// link to section of itself
			regex: /^\[\[#\^([^\|\]]+)\|?([^\]]+)?\]\]$/,
			handler: ([link, section, alias]) =>
				alias ? link : `[[#^${section}|EMPTY]]`,
		},
		{
			// link to another note without alias
			regex: /^\[\[([^\#\^\|\]]+)\]\]$/,
			handler: ([_, path]) =>
				`[[${path}|${path.split('/').pop().toLowerCase()}]]`,
		},
		{
			// link to header of another note
			regex: /^\[\[([^\#\^\|\]]+)#([^\^\|\]]+)+\|?([^\]]+)?\]\]$/,
			handler: ([link, path, heading, alias]) =>
				!alias || path.split('/').pop() === alias
					? `[[${path}#${heading}|${heading.toLowerCase()}]]`
					: link,
		},
		{
			// link to section of another note
			regex: /^\[\[([^\#\|\]]+)(#\^[^\|\]]+)\|?([^\]]+)?\]\]$/,
			handler: ([link, path, section, alias]) =>
				!alias || path.split('/').pop() === alias
					? `[[${path}${section}|EMPTY]]`
					: link,
		},
	];

	parse({ input, returnEmptyMark = true, isMuted = false }) {
		if (!input) {
			if (returnEmptyMark) return this.#EMPTY_LINK;

			if (!isMuted) {
				const error = 'linkParser:  input - it is empty';
				new Notice(error);
				throw new Error(error);
			}
			return;
		}

		// external links
		if (this.#EXTERNAL_LINK_FORMAT.test(input)) return input;

		const wrongExternalFormatMatch = this.#EXTERNAL_LINK_WRONG_FORMATS.find(
			({ regex }) => regex.test(input)
		);

		if (wrongExternalFormatMatch) {
			return this.#tryParse(
				this.#parseExternalLink,
				{ format: wrongExternalFormatMatch, input },
				isMuted
			);
		}

		// internal links
		if (this.#INTERNAL_LINK_FORMAT.test(input)) {
			return this.#tryParse(this.#parseInternalLink, input, isMuted);
		}
	}

	#tryParse(fn, arg, isMuted) {
		try {
			return fn.call(this, arg);
		} catch (err) {
			if (isMuted) return;
			const error = `linkParser:  ${err}`;
			new Notice(error);
			throw error;
		}
	}

	#parseExternalLink({ format, input }) {
		const groups = input.match(format.regex);
		const [alias, link] = format.order.map((i) => groups[i]);
		return `[${alias}](${link})`;
	}

	#parseInternalLink(input) {
		for (const { regex, handler } of this.#INTERNAL_LINK_PATTERNS) {
			const match = input.match(regex);
			if (match) return handler(match);
		}
		return input;
	}
}
