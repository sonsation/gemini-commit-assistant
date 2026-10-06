# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.8] - 2025-08-14

### Added

- ⚡ **TypeScript Full Migration**: Completely rewrote the codebase from Bash to TypeScript with zero-runtime-dependencies standalone bundle (compiled in 6ms via `tsup`). Delivers 100% cross-platform compatibility (macOS/Linux/Windows).
- 🤖 **Multi-Provider Support**: Choose between Antigravity (`agy`) and Claude Code (`claude`) CLI
- 🎯 **Interactive TUI Selection Menu**: Arrow keys and numeric input navigation
- 🔄 **Message Regeneration**: Added interactive `Regenerate` option to retry AI generation on demand
- 🎫 **Branch Issue / Ticket Detection**: Auto-detects issue keys from branch names (`PROJ-123`, `#45`, `issue-12`) and includes them in commit titles
- 📊 **Diff Stat Optimization**: Includes `git diff --stat` in AI context for superior change analysis on large diffs
- ⚙️ **Project-level Configuration**: Local config support via `.aicrc` overriding global settings
- 📝 **Expanded Conventional Commits**: Added `fix:`, `test:`, and `perf:` types to AI prompt guidelines
- 🛡️ **Signal & Exit Handling**: Auto-restore terminal cursor and clean up temporary files via `trap`

### Fixed

- 🐛 **Multi-line Commit Retention**: Fixed issue where editor (`Edit message`) only committed the first line
- 🔍 **General File Parsing**: Replaced hardcoded extension regex in awk to support all programming languages
- 🔧 **Robust JSON Configuration**: Safe JSON parsing supporting whitespace variations
- 💻 **Terminal Cursor Restoration**: Fixed cursor remaining hidden after interrupting interactive menu

## [1.0.7] - 2024-12-19

### Changed

- 🔄 **Primary command changed from `ai-commit` to `aic`**
- 🏷️ `ai-commit` is now an alias for `aic` (backward compatibility maintained)
- 📚 Updated all documentation to reflect the new primary command
- 💡 Updated help messages and examples throughout the codebase
- 🔧 Modified git alias setup to use `git aic` instead of `git ai-commit`
- 📦 Updated postinstall messages to prioritize `aic` command

### Added

- 🌐 Smart language detection for postinstall messages (Korean/English)
- 📊 Display of Gemini CLI quota information (60 requests/minute + 1,000 requests/day)

### Fixed

- 🛠️ Improved installation experience with clearer command hierarchy

## [1.0.0] - 2024-12-19

### Added

- 🎉 Initial release of AI Commit CLI
- 🤖 AI-powered commit message generation using Google Gemini API
- 📝 Conventional Commits format support
- 🛡️ Smart fallback system when AI is unavailable
- 💬 Interactive options (edit, custom, cancel)
- 🔧 Automatic Gemini CLI installation guide
- 🌐 Comprehensive error handling for API and network issues
- 📦 Support for both global and local installation
- 🎯 Intelligent change analysis with file-specific descriptions
- ⚡ Fast processing with smart diff summarization for large changes

### Features

- **AI Analysis**: Intelligent git diff analysis using Gemini API
- **Format Control**: Automatic title/body separation with proper line breaks
- **Error Recovery**: Graceful degradation to rule-based messages
- **User Experience**: Clear installation guides and troubleshooting
- **Flexibility**: Multiple installation options and usage patterns

### Technical Details

- Node.js 16+ support
- Peer dependency on @google/gemini-cli
- Cross-platform compatibility (macOS, Linux, Windows)
- Efficient diff processing for repositories of any size
