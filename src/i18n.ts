const EN = {
	command: {
	},
	setting: {
		entries: {
			hide: {
				tableInactive: "Hide in property table",
				tableActive: "Always hide in property table",
				fileProperties: "Hide in file properties (side dock)",
				allProperties: "Hide in all properties (side dock)",
			}
		}
	}

}

const ZH = {
	command: {

	},
	setting: {
		entries: {
			hide: {
				tableInactive: "隐藏在属性表格中",
				tableActive: "总是隐藏在属性表格中",
				fileProperties: "隐藏在文件属性中（侧边栏）",
				allProperties: "隐藏在所有属性中（侧边栏）",
			}
		}
	}
}


export class Locals {
	static get() {
		const lang = window.localStorage.getItem("language");
		switch (lang) {
			case "zh":
				return ZH;
			case "zh-tw":
				return ZH;
			default:
				return EN;
		}
	}
}
