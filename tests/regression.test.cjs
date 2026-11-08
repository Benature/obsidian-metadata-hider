const assert = require('node:assert/strict');
const { test } = require('node:test');
const Module = require('node:module');

class Plugin {
	constructor(app) {
		this.app = app;
	}
	addSettingTab() { }
	registerDomEvent() { }
	registerEvent() { }
}
class PluginSettingTab {
	constructor(app, plugin) {
		this.app = app;
		this.plugin = plugin;
	}
}

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
	if (request === 'obsidian') {
		return {
			Plugin,
			PluginSettingTab,
			Setting: class { },
			ButtonComponent: class { },
			ToggleComponent: class { },
			Notice: class { },
			debounce: (fn) => fn,
		};
	}
	return originalLoad.call(this, request, parent, isMain);
};
const { default: MetadataHider, genAllCSS } = require('../main.js');
Module._load = originalLoad;

function makeSettings(overrides = {}) {
	return {
		autoFold: false,
		hideEmptyEntry: true,
		hideEmptyEntryInSideDock: false,
		propertiesVisible: '',
		propertyHideAll: 'hide',
		hideWholeTableInSideDock: true,
		entries: [],
		...overrides,
	};
}

function makeCSS(overrides = {}) {
	return genAllCSS({ settings: makeSettings(overrides) });
}

test('#19: empty-property rules do not affect Bases metadata rows', () => {
	const css = makeCSS();
	const emptyRules = css.split('.metadata-container.is-active .metadata-property { display: flex !important; }')[1].split('display: none;')[0];
	const selectors = emptyRules.split(',').map(selector => selector.trim());

	assert.equal(selectors.length, 4);
	for (const selector of selectors) {
		assert.match(selector, /^\.metadata-container \.metadata-property/);
	}
	assert.match(css, /\.mod-sidedock \.metadata-container \.metadata-property \{ display: flex !important; \}/);
	assert.doesNotMatch(css, /\.mod-sidedock \.metadata-property \{ display: flex !important; \}/);
});

test('#13: always-visible properties override empty-number hiding', () => {
	const css = makeCSS({ propertiesVisible: 'answer' });
	assert.match(css, /\/\* \* Always visible \*\/\s+\.metadata-container > \.metadata-content > \.metadata-properties > \.metadata-property\[data-property-key="answer"\]\s+\{ display: flex !important; \}/);
});

test('#20: generated selectors use Obsidian lowercase property keys', () => {
	const css = makeCSS({
		propertiesVisible: 'VisibleKey, snake_case',
		propertyHideAll: 'HideAll',
		entries: [{
			name: ' CamelCase ',
			hide: { tableInactive: true, tableActive: false, fileProperties: true, allProperties: false },
		}],
	});

	for (const key of ['camelcase', 'visiblekey', 'snake_case', 'hideall']) {
		assert.ok(css.includes(`data-property-key="${key}"`), `missing lowercase key: ${key}`);
	}
	for (const key of ['CamelCase', 'VisibleKey', 'HideAll']) {
		assert.ok(!css.includes(`data-property-key="${key}"`), `retained mixed-case key: ${key}`);
	}
});

test('#20: all-properties hiding compares keys case-insensitively', () => {
	const added = [];
	const removed = [];
	const makeItem = (textContent) => ({
		querySelector: () => ({ textContent }),
		classList: {
			add: (name) => added.push([textContent, name]),
			remove: (name) => removed.push([textContent, name]),
		},
	});
	const items = [makeItem('camelcase'), makeItem('visible')];
	const originalActiveDocument = global.activeDocument;
	global.activeDocument = {
		querySelector: () => ({
			querySelectorAll: () => items,
		}),
	};

	try {
		const plugin = new MetadataHider({});
		plugin.settings = makeSettings({
			entries: [{
				name: 'CamelCase',
				hide: { tableInactive: false, tableActive: false, fileProperties: false, allProperties: true },
			}],
		});
		plugin.hideInAllProperties();
	} finally {
		global.activeDocument = originalActiveDocument;
	}

	assert.deepEqual(added, [['camelcase', 'mh-hide']]);
	assert.deepEqual(removed, [['visible', 'mh-hide']]);
});

test('community review: CSS is written to a snippet and enabled without a style element', async () => {
	const writes = [];
	const enabledSnippets = new Set();
	let loads = 0;
	const app = {
		vault: {
			configDir: '.obsidian',
			adapter: {
				exists: async () => false,
				mkdir: async () => { },
				write: async (path, content) => writes.push({ path, content }),
			},
		},
		customCss: {
			enabledSnippets,
			requestLoadSnippets: () => { loads += 1; },
		},
	};
	const plugin = new MetadataHider(app);
	plugin.settings = makeSettings({ propertiesVisible: 'tags' });
	plugin.hideInAllProperties = () => { };

	await plugin.updateCSS();

	assert.equal(writes.length, 1);
	assert.equal(writes[0].path, '.obsidian/snippets/metadata-hider-auto-gen.css');
	assert.ok(writes[0].content.includes('data-property-key="tags"'));
	assert.ok(enabledSnippets.has('metadata-hider-auto-gen'));
	assert.equal(loads, 1);
});

test('#17: existing settings preserve whole-table hiding in the side dock', async () => {
	const plugin = new MetadataHider({});
	plugin.loadData = async () => ({});
	await plugin.loadSettings();
	assert.equal(plugin.settings.hideWholeTableInSideDock, true);
});

test('#17: whole-table hiding can be limited to the main editor', () => {
	const everywhere = makeCSS({ hideWholeTableInSideDock: true });
	assert.ok(everywhere.includes('.metadata-container:has(.metadata-property[data-property-key="hide"] input[type="checkbox"]:checked)'));
	assert.ok(!everywhere.includes('.workspace-split:not(.mod-sidedock) .metadata-container:has(.metadata-property[data-property-key="hide"]'));

	const mainOnly = makeCSS({ hideWholeTableInSideDock: false });
	assert.ok(mainOnly.includes('.workspace-split:not(.mod-sidedock) .metadata-container:has(.metadata-property[data-property-key="hide"] input[type="checkbox"]:checked)'));
});

test('#14: trailing wildcards generate case-normalized prefix selectors', () => {
	const css = makeCSS({
		propertiesVisible: 'Icon-*',
		entries: [{
			name: 'Excalidraw-*',
			hide: { tableInactive: true, tableActive: false, fileProperties: true, allProperties: true },
		}],
	});

	assert.ok(css.includes('[data-property-key^="excalidraw-"]'));
	assert.ok(css.includes('[data-property-key^="icon-"]'));
	assert.ok(!css.includes('[data-property-key="excalidraw-*"]'));
});

test('#14: all-properties hiding supports prefix wildcards', () => {
	const added = [];
	const removed = [];
	const makeItem = (textContent) => ({
		querySelector: () => ({ textContent }),
		classList: {
			add: (name) => added.push(textContent),
			remove: (name) => removed.push(textContent),
		},
	});
	const items = [
		makeItem('excalidraw-plugin'),
		makeItem('Excalidraw-Export'),
		makeItem('excalidraw'),
		makeItem('visible'),
	];
	const originalActiveDocument = global.activeDocument;
	global.activeDocument = {
		querySelector: () => ({ querySelectorAll: () => items }),
	};

	try {
		const plugin = new MetadataHider({});
		plugin.settings = makeSettings({
			entries: [{
				name: 'Excalidraw-*',
				hide: { tableInactive: false, tableActive: false, fileProperties: false, allProperties: true },
			}],
		});
		plugin.hideInAllProperties();
	} finally {
		global.activeDocument = originalActiveDocument;
	}

	assert.deepEqual(added, ['excalidraw-plugin', 'Excalidraw-Export']);
	assert.deepEqual(removed, ['excalidraw', 'visible']);
});

test('PR #16: inactive hiding does not hide ordinary entries in an active editor', () => {
	const css = makeCSS({
		hideEmptyEntry: false,
		entries: [{
			name: 'private',
			hide: { tableInactive: true, tableActive: false, fileProperties: false, allProperties: false },
		}],
	});

	assert.match(css, /\.metadata-container:not\(\.is-active\) > \.metadata-content > \.metadata-properties > \.metadata-property\[data-property-key="private"\]/);
	assert.equal(css.split('data-property-key="private"').length - 1, 1);
});

test('#8: auto-fold waits for Properties to render in a newly created file', async (t) => {
	const fileOpenCallbacks = [];
	const scheduled = [];
	const executed = [];
	let metadataReady = false;
	const metadataElement = {
		classList: { contains: (name) => name === 'is-collapsed' && false },
	};
	const view = {
		containerEl: {
			querySelector: () => metadataReady ? metadataElement : null,
		},
	};
	const workspace = {
		getActiveViewOfType: () => view,
		onLayoutReady() { },
		on(event, callback) {
			if (event === 'file-open') fileOpenCallbacks.push(callback);
		},
	};
	const app = {
		workspace,
		commands: { executeCommandById: (id) => executed.push(id) },
	};
	const originalWindow = global.window;
	const originalActiveDocument = global.activeDocument;
	global.activeDocument = {};
	global.window = {
		setTimeout(callback, delay) {
			scheduled.push({ callback, delay });
			return scheduled.length;
		},
	};
	t.after(() => {
		global.window = originalWindow;
		global.activeDocument = originalActiveDocument;
	});

	const plugin = new MetadataHider(app);
	plugin.loadSettings = async () => {
		plugin.settings = makeSettings({ autoFold: true });
	};
	plugin.onload();
	await plugin.initialization;
	fileOpenCallbacks[0]();
	assert.deepEqual(executed, [], 'Properties is not ready yet');
	assert.equal(scheduled.length, 1, 'a missing Properties element schedules a retry');

	metadataReady = true;
	scheduled.shift().callback();
	assert.deepEqual(executed, ['editor:toggle-fold-properties']);
	assert.equal(scheduled.length, 0, 'folding stops the retry loop');
});

test('#12: auto-fold checks the active leaf in the current window', async (t) => {
	const fileOpenCallbacks = [];
	const executed = [];
	const workspace = {
		activeLeaf: null,
		onLayoutReady() { },
		on(event, callback) {
			if (event === 'file-open') fileOpenCallbacks.push(callback);
		},
	};
	const app = {
		workspace,
		commands: {
			executeCommandById: (id) => executed.push(id),
		},
	};
	const originalActiveDocument = global.activeDocument;
	global.activeDocument = {
		querySelector: () => {
			throw new Error('auto-fold must not query another window through the global document');
		},
	};
	t.after(() => {
		global.activeDocument = originalActiveDocument;
	});

	const plugin = new MetadataHider(app);
	plugin.loadSettings = async () => {
		plugin.settings = makeSettings({ autoFold: true });
	};
	plugin.onload();
	await plugin.initialization;
	assert.equal(fileOpenCallbacks.length, 1);

	const makeView = (collapsed) => ({
		containerEl: {
			querySelector: (selector) => {
				assert.equal(selector, '.metadata-container');
				return {
					classList: {
						contains: (name) => name === 'is-collapsed' && collapsed,
					},
				};
			},
		},
	});

	workspace.getActiveViewOfType = () => makeView(false);
	fileOpenCallbacks[0]();
	assert.deepEqual(executed, ['editor:toggle-fold-properties']);

	workspace.getActiveViewOfType = () => makeView(true);
	fileOpenCallbacks[0]();
	assert.equal(executed.length, 1, 'collapsed properties must not be toggled open');

	workspace.getActiveViewOfType = () => null;
	fileOpenCallbacks[0]();
	assert.equal(executed.length, 1, 'missing leaf must be a no-op');
});
