import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, debounce } from 'obsidian';

interface MetadataHiderSettings {
	hideEmptyEntryInSiderbar: boolean;
	propertiesVisible: string;
	propertiesInvisible: string;
	propertyHideAll: string;
}

const DEFAULT_SETTINGS: MetadataHiderSettings = {
	hideEmptyEntryInSiderbar: false,
	propertiesVisible: "",
	propertiesInvisible: "",
	propertyHideAll: "hide",
}

export default class MetadataHider extends Plugin {
	settings: MetadataHiderSettings;
	styleTag: HTMLStyleElement;


	async onload() {
		await this.loadSettings();
		this.addSettingTab(new MetadataHiderSettingTab(this.app, this));
		this.updateCSS();
	}

	onunload() {
		this.styleTag.remove();
	}

	debounceUpdateCSS = debounce(this.updateCSS, 1000, true);
	updateCSS() {
		this.styleTag = document.createElement('style');
		this.styleTag.id = 'css-metadata-hider';
		console.log(document.getElementsByTagName('head'))
		let headElement: HTMLElement = document.getElementsByTagName('head')[0];
		const existingStyleTag = headElement.querySelector('#' + this.styleTag.id) as HTMLStyleElement | null;

		if (existingStyleTag) {
			existingStyleTag.parentNode?.removeChild(existingStyleTag);
		}

		headElement.appendChild(this.styleTag);
		this.styleTag.innerText = genSnippetCSS(this);
	}


	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


}

function genCSS(properties: string, cssPrefix: string, cssSuffix: string, parentSelector: string = ""): string {
	if (properties.trim() === "") {
		return ``;
	}
	let body: string[] = [];
	parentSelector = parentSelector ? parentSelector + " " : "";
	for (let property of properties.split(',')) {
		body.push(`${parentSelector} .metadata-container > .metadata-content > .metadata-properties > .metadata-property[data-property-key="${property.trim()}"]`);
	}
	const sep = " ";
	return cssPrefix + sep + body.join(',' + sep) + sep + cssSuffix + sep + sep;
}

function genSnippetCSS(plugin: MetadataHider): string {
	const s = plugin.settings;
	const mod_root = s.hideEmptyEntryInSiderbar ? "" : ".mod-root ";
	const content: string[] = [
		/* * Hide the metadata that is empty */
		`${mod_root}.metadata-property:has(.metadata-property-value .mod-truncate:empty),`,
		`${mod_root}.metadata-property:has(`,
		`		.metadata-property-value`,
		`			input.metadata-input[type="number"]:placeholder-shown`,
		`	),`,
		`${mod_root}.metadata-property[data-property-type="text"]:has(input[type="date"]),`,
		`${mod_root}.metadata-property:has(`,
		`		.metadata-property-value`,
		`			.multi-select-container`,
		`			> .multi-select-input:first-child`,
		`	) {`,
		`	display: none;`,
		`}`,
		/* * visualize the last metadata property.`
		 * Make sure to enable Button: add document attribution */
		`${mod_root}div.view-content`,
		`	div.metadata-content`,
		`	> div.metadata-properties`,
		`	> div.metadata-property:last-child {`,
		`	display: flex;`,
		`}`,
		``,
	];


	if (s.propertyHideAll.trim()) {
		content.push([
			`${mod_root}.metadata-container:has(`,
			`	.metadata-property[data-property-key="${s.propertyHideAll.trim()}"] input[type="checkbox"]:checked`,
			`  ) {`,
			`  display: none;`,
			`}`,
			``,
		].join('\n'));
	}

	content.push(genCSS(plugin.settings.propertiesInvisible, '/* * Custom: Force invisible */',
		' { display: none; }', mod_root))
	content.push(genCSS(plugin.settings.propertiesVisible, '/* * Custom: Force visible */',
		' { display: flex; }', mod_root))

	return content.join(' ')
}

class MetadataHiderSettingTab extends PluginSettingTab {
	plugin: MetadataHider;
	debouncedGenerate: Function;

	constructor(app: App, plugin: MetadataHider) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getLang(): string {
		let lang = window.localStorage.getItem('language');
		if (lang == null || ["en", "zh", "zh-TW"].indexOf(lang) == -1) { lang = "en"; }
		return lang;
	}

	display(): void {
		const { containerEl } = this;
		const lang = this.getLang();

		containerEl.empty();

		new Setting(containerEl)
			.setName({ en: 'Hide empty metadata properties also in sidebar', zh: "侧边栏也隐藏值为空的文档属性（元数据）", "zh-TW": "側邊欄也隱藏空白文件屬性（元數據）" }[lang] as string)
			.setDesc('')
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.hideEmptyEntryInSiderbar)
					.onChange(async (value) => {
						this.plugin.settings.hideEmptyEntryInSiderbar = value;
						await this.plugin.saveSettings();
						this.plugin.debounceUpdateCSS();
					});
			});

		new Setting(containerEl)
			.setName({ en: "Always display metadata properties", zh: "永远显示的文档属性（元数据）", "zh-TW": "永遠顯示的文件屬性（元數據）" }[lang] as string)
			.setDesc({ en: "separated by comma (`,`)", zh: "英文逗号分隔（`,`）。如：“tags, aliases”", "zh-TW": "以逗號分隔（`,`）" }[lang] as string)
			.addTextArea((text) =>
				text
					.setValue(this.plugin.settings.propertiesVisible)
					.onChange(async (value) => {
						this.plugin.settings.propertiesVisible = value;
						await this.plugin.saveSettings();;
						this.plugin.debounceUpdateCSS();
					})
			);
		new Setting(containerEl)
			.setName({ en: "Always hide metadata properties", zh: "永远隐藏的文档属性（元数据）", "zh-TW": "永遠隱藏的文件屬性（元數據）" }[lang] as string)
			.setDesc({ en: "separated by comma (`,`)", zh: "英文逗号分隔（`,`）。如：“tags, aliases”", "zh-TW": "以逗號分隔（`,`）" }[lang] as string)
			.addTextArea((text) =>
				text
					.setValue(this.plugin.settings.propertiesInvisible)
					.onChange(async (value) => {
						this.plugin.settings.propertiesInvisible = value;
						await this.plugin.saveSettings();
						this.plugin.debounceUpdateCSS();
					})
			);
		new Setting(containerEl)
			.setName({ en: "Hide the whole metadata properties table", zh: "隐藏整个文档属性（元数据）表格", "zh-TW": "隱藏整個文檔屬性（元數據）表格" }[lang] as string)
			.setDesc({ en: `when its value is true`, zh: `当该属性值为真时`, "zh-TW": `當該屬性值為真時` }[lang] as string)
			.addSearch((cb) => {
				cb.setPlaceholder({ en: "entry name", zh: "文档属性名称", "zh-TW": "文件屬性名稱", }[lang] as string)
					.setValue(this.plugin.settings.propertyHideAll)
					.onChange(async (newValue) => {
						this.plugin.settings.propertyHideAll = newValue;
						await this.plugin.saveSettings();
						this.plugin.debounceUpdateCSS();
					});
			})


		let noteEl = containerEl.createEl("p", {
			text: {
				en: `Note: the last metadata property will always be visible, in order to ensure the normal usage of "Add property".`,
				zh: `注意：最后一个文档属性将始终可见，以确保正常使用“添加文档属性”。`,
				"zh-TW": `注意：最後一個文档屬性將始終可見，以確保正常使用「添加文档屬性」。`,
			}[lang] as string
		}); //, even if it is hidden by the above settings.
		noteEl.setAttribute("style", "color: gray; font-style: italic; margin-top: 30px;")
	}
}
