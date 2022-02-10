# Obsidian FETA 🧀

**F**older JSON **E**xpor**T** **A**ddon - _It's dairy free!_

## Overview

[Obsidian Publish](https://obsidian.md/publish) allows you to turn your notes into a nicely formatted static site, but it has limited configuration and can't fully take advantage of [Obsidian](https://obsidian.md/)'s rich plugin ecosystem. Instead of a silky smooth publishing, FETA is a tool for gooier, greasier note exports that aren't as polished but include output from all plugins that add to the reading view and could be combined with a static site generator of your own to publish your notes as you see fit.

## Install

Use [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. Install and enable BRAT.
2. In Obsidian, run the "Add a beta plugin for testing" command.
3. Paste in `OfficerHalf/obsidian-feta`.
4. Enable the plugin in settings.

## Use

FETA registers a command, `Export folder to JSON` and adds an icon to the ribbon that executes that command. Executing the command opens a modal with the following options:

### Export root path 📁

The top level folder where FETA will look for notes to export. All notes in this folder and any nested folders will be included in the export.

### Required tag 🏷️

Limit exported notes to those that include this tag. Leave blank for no required tag.

### Required frontmatter key 🔑

Limit exported notes to those that include this YAML frontmatter key. The value of the key does not matter, only whether the key is present. Leave blank for no required key.

### Render HTML 🐮

Disable for low-fat mode. When disabled only the raw markdown file is exported, no further processing will be done on notes.

### Export images 🖼️

Images contained in the root folder and nested folders will be exported into an `attachments` folder in the same location as the exported JSON file. Note that only images inside the root folder's tree are included whether they are referenced in a note or not.

Supported filetypes: `jpg`, `jpeg`, `png`, `webp`, `gif`, `bmp`, `svg`

### Export file 📤

The full output path to the exported JSON file. Defaults to `<your-vault-folder>/.obsidian/plugins/feta/export.json` if left blank.

### Show ribbon icon 🧀

Add or remove the convenient cheese icon from the ribbon.

## TODO

- Post process notes to update image paths and link paths for better prep for deployment.

## Contribute

Please open a PR and fix my bugs. 🐛

To develop:

- Clone this repo and install:  
  `npm install`
- Ensure the plugin directory exists in the vault being used for development:  
  `mkdir /path/to/your/vault/.obsidian/plugins/feta`
- Start the development build:  
  `npm run dev -- /path/to/your/vault`
- Reload Obsidian after making code changes (or use the [hot reload plugin](https://github.com/pjeby/hot-reload)!)
