# HaexPass - Password Manager Extension

A secure password manager built as a HaexHub extension using Nuxt 4, Nuxt UI, and Drizzle ORM.

## Features

- 🔐 **Secure Password Storage** - All passwords encrypted and stored locally
- 📁 **Group Management** - Organize passwords into groups and subgroups
- 🔍 **Quick Search** - Find passwords instantly with HaexHub's global search
- 🌙 **Theme Support** - Automatically adapts to HaexHub's light/dark theme
- 🌐 **Internationalization** - Multi-language support via HaexHub context
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🎨 **Modern UI** - Built with Nuxt UI and Tailwind CSS

## Tech Stack

- **Framework**: [Nuxt 4](https://nuxt.com/)
- **UI Components**: [Nuxt UI](https://ui.nuxt.com/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Extension SDK**: [@haexhub/sdk](https://github.com/haexhub/sdk)
- **Icons**: [Iconify](https://iconify.design/)

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Development

Run the extension in development mode:

```bash
pnpm dev
```

Then load the extension in HaexHub:
1. Open HaexHub
2. Go to Extensions
3. Click "Load Dev Extension"
4. Select the project directory

### 3. Build & Package

Build and sign the extension for production:

```bash
pnpm build
pnpm ext:build
```

This creates a signed `.haextension` file ready for distribution.

## Project Structure

```
haex-pass/
├── app/
│   ├── components/          # Vue components
│   │   ├── pass/           # Password manager specific components
│   │   └── ui/             # Reusable UI components
│   ├── composables/        # Vue composables
│   │   └── haexhub.ts      # HaexHub SDK integration
│   ├── database/           # Database layer
│   │   ├── index.ts        # Drizzle ORM setup
│   │   └── schemas/        # Database schemas
│   ├── pages/              # Nuxt pages (routes)
│   ├── stores/             # Pinia stores
│   │   ├── passwords/      # Password & group management
│   │   ├── search/         # Search functionality
│   │   └── ui/             # UI state (theme, locale)
│   ├── i18n.config.ts      # i18n configuration
│   └── app.vue             # Root component
├── haextension/
│   ├── manifest.json       # Extension manifest
│   ├── public.key          # Public signing key
│   ├── private.key         # Private key (not in git)
│   └── icon.svg            # Extension icon
├── haextension.config.json # Dev server config
└── nuxt.config.ts          # Nuxt configuration
```

## Database Schema

HaexPass uses Drizzle ORM with the following schema:

### Groups Table
- `id` - UUID primary key
- `name` - Group name
- `icon` - Icon identifier
- `parentId` - Parent group ID (for nesting)
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

### Password Items Table
- `id` - UUID primary key
- `groupId` - Foreign key to groups
- `title` - Item title
- `username` - Username/email
- `password` - Encrypted password
- `url` - Website URL
- `notes` - Additional notes
- `icon` - Item icon
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

## HaexHub SDK Integration

HaexPass demonstrates advanced HaexHub SDK usage:

### 1. Database with Drizzle ORM

```typescript
import * as schema from '~/database/schemas'

const { client } = useHaexHub()

// Initialize database with Drizzle schema
client.initializeDatabase(schema)

// Query using Drizzle
const groups = await client.db
  .select()
  .from(schema.groups)
  .where(eq(schema.groups.parentId, null))
```

### 2. Application Context

```typescript
const { state } = useHaexHub()

// Watch for theme/locale changes from HaexHub
watch(
  () => state.value.context,
  (newContext) => {
    if (newContext) {
      // Update theme
      currentTheme.value = newContext.theme || 'dark'

      // Update language
      const locale = locales.value.find((l) => l.code === newContext.locale)?.code
      setLocale(locale || defaultLocale)
    }
  },
  { immediate: true }
)
```

### 3. Search Integration

```typescript
// Register search handler
client.on('search.request', async (event) => {
  const { query, requestId } = event.data

  // Search passwords
  const results = passwords.value
    .filter(p => p.title.toLowerCase().includes(query.toLowerCase()))
    .map(p => ({
      id: p.id,
      title: p.title,
      description: p.username,
      icon: p.icon,
      type: 'password-item',
      score: calculateScore(p.title, query),
      action: {
        type: 'navigate',
        route: `/passwords/${p.groupId}`
      }
    }))

  // Respond with results
  await client.respondToSearch(requestId, results)
})
```

## Development

### Key Composables

#### `useHaexHub()`
Main composable for HaexHub SDK integration:
- Returns: `client`, `state`, `db`, `getTableName`
- Handles context subscription and theme/locale updates
- Initializes Drizzle ORM

### Key Stores

#### `usePasswordsGroupsStore()`
Manages password groups:
- `groups` - All groups with computed hierarchy
- `createGroup()` - Create new group
- `updateGroup()` - Update existing group
- `deleteGroup()` - Delete group and optionally its items

#### `usePasswordsItemsStore()`
Manages password items:
- `items` - All password items
- `createItem()` - Create new password
- `updateItem()` - Update existing password
- `deleteItem()` - Delete password

#### `useSearchStore()`
Handles HaexHub search integration:
- Registers search handler on mount
- Filters passwords based on query
- Returns formatted search results

## Security

- ✅ Passwords stored in local SQLite database
- ✅ Extension isolated from other extensions
- ✅ Cryptographic signing with Ed25519
- ✅ No network requests (fully offline)
- ✅ Private key excluded from repository

## License

ISC

## Links

- **HaexHub SDK**: [github.com/haexhub/sdk](https://github.com/haexhub/sdk)
- **Demo Projects**: See SDK README for framework-specific examples
