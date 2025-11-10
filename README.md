# HaexPass - Password Manager

A modern, secure password manager built as a HaexHub extension.

## About

HaexPass is currently in early development. The goal is to create a user-friendly password manager that integrates seamlessly with HaexHub, providing secure local storage for your passwords with group organization and quick search capabilities.

## Planned Features

- 🔐 **Secure Password Storage** - All passwords stored locally in encrypted database
- 📁 **Group Management** - Organize passwords into groups and subgroups
- 🔍 **Quick Search** - Find passwords instantly through HaexHub's search
- 🎨 **Modern UI** - Clean, intuitive interface built with Nuxt UI
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🌐 **Multi-language Support** - Adapts to HaexHub's language settings
- 🌙 **Theme Support** - Automatically matches HaexHub's theme

## Tech Stack

- **Framework**: [Nuxt 4](https://nuxt.com/)
- **UI Components**: [Nuxt UI](https://ui.nuxt.com/)
- **Database ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Extension SDK**: [@haexhub/sdk](https://github.com/haexhub/sdk)

## Development Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Run Development Server

```bash
pnpm dev
```

Then load the extension in HaexHub:
1. Open HaexHub
2. Navigate to Extensions
3. Click "Load Dev Extension"
4. Select this project directory

### 3. Build for Production

```bash
pnpm build
pnpm ext:build
```

This creates a signed `.haextension` file ready for distribution.

## Release Process

Create a new release using the automated scripts:

```bash
# Patch release (0.1.6 → 0.1.7)
pnpm release:patch

# Minor release (0.1.6 → 0.2.0)
pnpm release:minor

# Major release (0.1.6 → 1.0.0)
pnpm release:major
```

The script automatically:
1. Updates version in `package.json`
2. Creates a git commit
3. Creates a git tag
4. Pushes to remote

GitHub Actions will then automatically build and package the extension as a signed `.haextension` file.

## Security

- All passwords stored in local SQLite database
- Extension isolated from other extensions by HaexHub's permission system
- Cryptographically signed with Ed25519
- Fully offline - no network requests
- Private key excluded from repository

## License

ISC

## Links

- **HaexHub SDK**: [github.com/haexhub/sdk](https://github.com/haexhub/sdk)
- **Demo Extensions**: See SDK README for implementation examples
