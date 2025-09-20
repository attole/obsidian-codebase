class TabsHeaderHider {
	run() {
		const sidebars = document.querySelectorAll(
			'.workspace-split.mod-sidedock'
		);

		sidebars.forEach((sidebar) => {
			const tabs = Array.from(
				sidebar.querySelectorAll('.workspace-tabs:not(.mod-top)')
			);

			if (tabs.length === 0) return;

			// remove header icons on first tab
			const firstTabHeaderInner = tabs[0].querySelector(
				'.workspace-tab-header-container-inner'
			);
			if (firstTabHeaderInner) firstTabHeaderInner.style.display = 'none';

			// remove header for every later tab
			tabs.slice(1).forEach((tab) => {
				const header = tab.querySelector(
					'.workspace-tab-header-container'
				);

				if (header) header.style.display = 'none';
			});

			console.log(tabs);
		});
	}
}
