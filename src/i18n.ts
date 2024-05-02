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
			},
			toggle: "Toggle",
			addEntryToHide: "Add metadata property entry to hide",
		},
		autoFold: {
			name: "Auto fold metadata properties table",
			desc: "Auto fold when opening a note."
		},
		headings: {
			hide: "Hide metadata properties",
		},
	}

}

const ZH = {
	command: {

	},
	setting: {
		entries: {
			hide: {
				tableInactive: "在属性表格中隐藏",
				tableActive: "总是在属性表格中隐藏",
				fileProperties: "在文件属性中隐藏（侧边栏）",
				allProperties: "在所有属性中隐藏（侧边栏）",
			},
			toggle: "开关",
			addEntryToHide: "添加要隐藏的元数据属性条目",
		},
		autoFold: {
			name: "自动折叠元数据属性表格",
			desc: "在打开笔记时自动折叠。"
		},
		headings: {
			hide: "隐藏元数据属性",
		},
	}
}


export class Locals {
	static get() {
		const lang = window.localStorage.getItem("language");
		switch (lang?.toLowerCase()) {
			case "zh":
				return ZH;
			case "zh-tw":
				return ZH;
			default:
				return EN;
		}
	}
}
