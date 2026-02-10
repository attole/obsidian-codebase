class ClipboardManager {
	async tryInsertFromClipboard(editor, parser = null) {
		let text = await navigator.clipboard.readText();
		if (!text?.length) return false;

		if (parser) {
			const newText = await parser.parseText({ input: text });
			if (newText === text) return;
			text = newText;
		}

		const cursor = editor.getCursor();

		editor.replaceRange(text, cursor);
		editor.setCursor({
			line: cursor.line,
			ch: cursor.ch + text.length,
		});

		await navigator.clipboard.writeText('');
		return true;
	}
}
