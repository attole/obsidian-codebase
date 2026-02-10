# Obsidian Codebase

> Personal codebase powering my Obsidian vault with custom scripts, utilities, and integrations.
> Still in active development, would be drastically changed, but already a core part of my daily workflow.

---

## Features

- **Plugin-driven**
  - This codebase **requires specific Obsidian plugins** to run — without them, nothing works.
- **[CustomJS](https://github.com/saml-dev/obsidian-custom-js) integration**
  - Class-based modules (no DI/constructors; pure classes or explicit instances).
- **[QuickAdd](https://github.com/chhoumann/quickadd) support**
  - `module.exports` function-style scripts for commands and automation.
- **Event-driven architecture**
  - Observables on keyup events hooked into Obsidian’s editor and input fields
  - Observables on DOM elements mutations
  - **Mobile support:** Obsidian's editor and DOM listeners functionality implemented as inline commands on mobile.
- **Startup & scheduled automation**
  - On vault open: cleaning, opening, resizing, and executing scripts automatically.
- **Custom "dock" solution**
  - Stack of notes/files in the sidebar with changed UI and configurable resizing.
  - This functionality is desktop-only for now.
- **Editor & text enhancements**
  - Custom date expressions parsing
  - Links parsing
  - Multiple empty line handling for Markdown
  - Text section parsing and transformations
- **Extended cache and sections**
  - Extended default sections with headers, footers and handling empty lines
  - Lazy rebuild and memory-based usage
- **Clean architecture**
  - Heavy use of modern design patterns, modular decoupled code, and documentation/comments.

---

## Structure

- `executables/` – Directly executable scripts.
  - `commands/` -  QuickAdd commands
  - `mobile/` - CustomJS mobile commands
  - `startup/` - startup configuration
- `modules/` – Class-based modules for CustomJS (no constructor DI).
  - `core/` – Core functionality for basic entities: tab, path, note, section, folder, YAML property.
  - `daily-note/` – Functionality for the daily notes concept.
  - `empty-line/` - Functionality for empty line concept.
  - `events/` – Observables, listeners, and auto parsers.
  - `extended-cache/` - Functionality for extended cache system.
  - `parsers/` – Parsers for date expressions, links, and tokenization.
  - `sidebars/` – All sidebar-related functionality: dock, calendar, headers.

---

## Status

- **Development**: ongoing
- **Current size**: ~2.5k [LOC](https://codetabs.com/count-loc/count-loc-online.html)
- **Goal**: Build a personal convenient environment inside Obsidian, centralizing all my data, calendar, ideas, and thoughts. Designed for **keyboard-heavy use** and **data-relation-driven workflows**.

---

## Tech & Tools

- **Core plugins (required for code execution):**

  - CustomJS
  - QuickAdd
  - [Dataview](https://github.com/blacksmithgu/obsidian-dataview)

- **Supported / integrated plugins:**

  - [Full Calendar](https://github.com/obsidian-community/obsidian-full-calendar) (small UI fixes)
  - Others as needed for extended functionality

- **Language**: JavaScript
- **Persistence**: Custom JSON-based DB
- **Versioning**: Git integration for automated backups

---

## Notes

This project is **not a public package** — it is a **showcase of my skills** and a **clean, modular solution** tailored to my workflow and needs in Obsidian.
The architecture emphasizes **observable-based event handling**, decoupled design, reusability, automation and qol features suited to personal vault management.
In the future, it will be rewritten into multiple publicly available plugins usable by anyone, with this repository containing only minor personal tweaks and fixes.

---

## Roadmap

- Implement auto deletion of empty lines from HTML tree on reading mode
- Enhance note templates by `imageNameKey` of hyphensed note name
- Enhance link parser to properly manage PascalCase camelCase tokens
- Refactor parsers to be as chainable configurable classes
- Decouple codebase into extended core plugin and multiple others independent TypeScript plugins with external configs
- More advanced entity solutions and concepts implementations
- Complete documentation

---

## License

Unlicensed — personal use only.
