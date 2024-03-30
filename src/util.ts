export function string2list(properties: string): string[] {
	return properties.replace(/\n|^\s*,|,\s*$/g, "").replace(/,,+/g, ",").split(",").map(p => p.trim());
}
