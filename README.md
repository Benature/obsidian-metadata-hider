# Metadata Hider

Hide metadata property if its value is empty.

This plugin will automatically generate a css file in `./obsidian/snippets`, which helps you to hide specific metadata properties.

## Settings

- Enable Snippet
- Always display metadata properties
- Always hide metadata properties


## Install

This plugin is in the progress of plugin community release.

### Install by [BRAT Plugin](https://obsidian.md/plugins?id=obsidian42-brat)

- First install [BRAT Plugin](https://obsidian.md/plugins?id=obsidian42-brat):
- In BRAT Plugin, click `Add Beta plugin`
- Enter https://github.com/Benature/obsidian-metadata-hider
- Enable `Metadata Hider` in `Community plugins`

### Manually install

- Download latest version in [Releases](https://github.com/Benature/obsidian-metadata-hider/releases/latest)
- Copy over `main.js`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/metadata-hider/`
- Reload plugins in `Community plugins` and enable `Metadata Hider`

## How to build

- `git clone https://github.com/Benature/obsidian-metadata-hider` clone this repo.
- `npm i`  install dependencies
- `npm run dev` to start compilation in watch mode.
- `npm run build`  to build production.
