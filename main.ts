import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, debounce } from 'obsidian';

interface MetadataHiderSettings {
	enableSnippet: boolean;
	propertiesVisible: string;
	propertiesInvisible: string;
}

const DEFAULT_SETTINGS: MetadataHiderSettings = {
	enableSnippet: true,
	propertiesVisible: "",
	propertiesInvisible: "",
}

export default class MetadataHider extends Plugin {
	settings: MetadataHiderSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new MetadataHiderSettingTab(this.app, this));
	}

	onunload() {

	}


	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


}

function genCSS(properties: string, cssPrefix: string, cssSuffix: string, parentSelector: string = ""): string {
	let body: string[] = [];
	for (let property of properties.split(',')) {
		body.push(`${parentSelector} .metadata-property[data-property-key="${property.trim()}"]`);
	}
	return cssPrefix + '\n' + body.join(', \n') + "\n" + cssSuffix + "\n\n";
}

async function genSnippetCSS(plugin: MetadataHider) {
	const content: string[] = [
		"/* * WARNING: This file will be overwritten by plugin `Metadata Hider`.",
		"   * DO NOT EDIT THIS FILE DIRECTLY!!!",
		"   * Do not edit this file directly!!!",
		"* /",
		"",
	];

	content.push(genCSS(plugin.settings.propertiesInvisible, '/* * Custom: Force invisible */',
		' { display: none !important; }', '.mod-root'))
	content.push(genCSS(plugin.settings.propertiesVisible, '/* * Custom: Force visible */',
		' { display: flex !important; }'))

	const vault = plugin.app.vault;
	const ob_config_path = vault.configDir;
	const snippets_path = ob_config_path + "/snippets";
	const css_filename = "metadata-hider-auto-gen"
	const path = `${snippets_path}/${css_filename}.css`;
	if (!(await vault.adapter.exists(snippets_path))) { await vault.adapter.mkdir(snippets_path); }
	if (await vault.adapter.exists(path)) { await vault.adapter.remove(path) }
	await plugin.app.vault.create(path, content.join('\n'));

	// Activate snippet
	if (plugin.settings.enableSnippet) {
		// @ts-ignore
		const customCss = plugin.app.customCss;
		customCss.enabledSnippets.add(css_filename);
		customCss.requestLoadSnippets();
	}

	// Ensure Style Settings reads changes
	plugin.app.workspace.trigger("parse-style-settings");
}

class MetadataHiderSettingTab extends PluginSettingTab {
	plugin: MetadataHider;
	debouncedGenerate: Function;

	constructor(app: App, plugin: MetadataHider) {
		super(app, plugin);
		this.plugin = plugin;
		this.debouncedGenerate = debounce(this.generateSnippet, 1000, true);
		// Generate CSS immediately rather than 1 second - feels laggy
		this.generateSnippet();
	}

	async generateSnippet() {
		await genSnippetCSS(this.plugin);
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Enable snippet')
			.setDesc('')
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.enableSnippet)
					.onChange(async (value) => {
						this.plugin.settings.enableSnippet = value;
						await this.plugin.saveSettings();
						await genSnippetCSS(this.plugin);
					});
			});

		new Setting(containerEl)
			.setName("Always display metadata properties")
			.setDesc("seperated by comma (`,`)")
			.addTextArea((text) =>
				text
					.setValue(this.plugin.settings.propertiesVisible)
					.onChange(async (value) => {
						this.plugin.settings.propertiesVisible = value;
						await this.plugin.saveSettings();
						await genSnippetCSS(this.plugin);
					})
			);
		new Setting(containerEl)
			.setName("Always hide metadata properties")
			.setDesc("seperated by comma (`,`)")
			.addTextArea((text) =>
				text
					.setValue(this.plugin.settings.propertiesInvisible)
					.onChange(async (value) => {
						this.plugin.settings.propertiesInvisible = value;
						await this.plugin.saveSettings();
						await genSnippetCSS(this.plugin);
					})
			);

	}
}
