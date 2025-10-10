class DateExpressionParser {
	#WEEKDAY_UNITS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
	#DAY_UNITS = { d: 1, w: 7 };
	#CALENDAR_UNITS = { m: 'month', y: 'year' };

	#WEEKDAY_REGEX = new RegExp(
		`^(${Object.keys(this.#WEEKDAY_UNITS).join('|')})$`,
		'i'
	);
	#RELATIVE_DATE_REGEX = new RegExp(
		`^([+-])(\\d+)?(${[
			...Object.keys(this.#WEEKDAY_UNITS),
			...Object.keys(this.#DAY_UNITS),
			...Object.keys(this.#CALENDAR_UNITS),
		].join('|')})$`,
		'i'
	);

	parseText({ input, baseDate = new Date() }) {
		if (!input?.length) return input;

		const tokenizer = window.customJS.createTokenizerInstance();
		const regex = /[+-]?\d*[A-Za-z\\\/|]+|\b0\b/g;

		let newText = tokenizer
			.tokenize(input, regex)
			.map((token) =>
				this.parseToken({
					input: token,
					baseDate: baseDate,
					returnBaseOnEmpty: false,
					isMuted: true,
				})
			)
			.replaceAndCollect();

		return newText;
	}

	parseToken({
		input = null,
		baseDate = new Date(),
		returnBaseOnEmpty = true,
		isMuted = false,
	} = {}) {
		if (input == null || input.toString().trim() === '0') {
			if (returnBaseOnEmpty) return this.#format(baseDate);
			if (!isMuted) {
				const error =
					'dateExpressionParser: invalid input - it is empty';
				console.error(error);
				new Notice(error);
			}
			return;
		}

		input = input.toString().trim();
		if (this.#isValidISODate(input)) return input;

		try {
			return this.#parseInternal(input, baseDate);
		} catch (error) {
			if (isMuted) return input;
			console.error(error);
			new Notice(error);
		}
	}

	// check whether input is already in right format
	#isValidISODate(input) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
		const date = new Date(input);
		return !isNaN(date) && date.toISOString().startsWith(date);
	}

	#parseInternal(input, baseDate) {
		input = input.toLowerCase();

		// test signed only numeric values first, cause they do actually parsed without an error into normal dates
		if (/^[+-]?\d+(\.\d+)?$/.test(input)) {
			throw new Error(`dateExpressionParser: invalid input: ${input}`);
		}

		// normal full date in any format
		if (!Number.isNaN(new Date(input).valueOf())) {
			return this.#format(new Date(input));
		}

		// pure weekdays
		if (this.#WEEKDAY_REGEX.test(input)) {
			return this.#format(this.#parseWeekdays(input, baseDate));
		}

		// relative dates
		const match = input.match(this.#RELATIVE_DATE_REGEX);
		if (!match) {
			throw new Error(`dateExpressionParser: invalid input: ${input}`);
		}

		const [, directionStr, amountStr, unit] = match;
		const direction = directionStr === '-' ? -1 : 1;
		const offset = direction * Number(amountStr ?? 1);

		let result = new Date(baseDate);

		if (this.#WEEKDAY_REGEX.test(unit)) {
			result = this.#parseWeekdays(unit, baseDate);
			result.setDate(result.getDate() + 7 * offset);
		} else if (unit in this.#DAY_UNITS) {
			result.setDate(baseDate.getDate() + this.#DAY_UNITS[unit] * offset);
		} else if (this.#CALENDAR_UNITS[unit] === 'month') {
			result.setMonth(baseDate.getMonth() + offset);
		} else {
			result.setFullYear(baseDate.getFullYear() + offset);
		}

		return this.#format(result);
	}

	// get absolute date from weekday on currentDate week
	#parseWeekdays(input, currentDate) {
		const result = new Date(currentDate);

		let diff = this.#WEEKDAY_UNITS[input] - currentDate.getDay();
		if (diff < -3) diff += 7;
		else if (diff > 3) diff -= 3;

		result.setDate(currentDate.getDate() + diff);

		return result;
	}

	// convert to yyyy-mm-dd format
	#format(date) {
		return new Intl.DateTimeFormat('en-Ca').format(date);
	}
}
