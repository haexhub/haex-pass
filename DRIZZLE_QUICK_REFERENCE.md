# HaexHub Drizzle with IPC: Quick Reference Guide

## How It Works in One Diagram

```
Extension Code
    ↓
db.select().from(table)  // Drizzle ORM
    ↓
Drizzle generates SQL + calls proxy callback
    ↓
SDK callback sends: postMessage({ haextension.db.query, sql, params })
    ↓
HaexHub main app receives postMessage
    ↓
Routes to Tauri: invoke('extension_sql_select', { sql, params })
    ↓
Rust backend:
  1. Execute SQL on SQLite
  2. Get column names from prepared statement
  3. Map each row to JSON object with column names as keys
  4. Return: [{ col1: val1, col2: val2, ... }]
    ↓
HaexHub SDK callback processes response
    ↓
Drizzle applies schema types based on column names
    ↓
Frontend gets fully typed result
```

## Key Code Locations

### 1. Extension Frontend - Send Query
**File:** `haexhub-sdk/src/client.ts` (lines 94-148)

```typescript
// This callback is called by Drizzle when it needs to execute SQL
async (sql, params, method) => {
  if (method === "run") {
    // INSERT/UPDATE/DELETE
    await this.request("haextension.db.execute", { query: sql, params })
  } else {
    // SELECT
    const result = await this.request("haextension.db.query", { query: sql, params })
    // Format response based on what Drizzle expects
    if (method === "get") return result.rows[0]
    if (method === "values") return result.rows.map(r => Object.values(r))
    return result.rows  // "all"
  }
}
```

### 2. HaexHub Main - Route IPC
**File:** `haex-hub/src/composables/extensionMessageHandler.ts` (lines 357-416)

```typescript
// Receives postMessage from extension iframe
case 'haextension.db.query': {
  const rows = await invoke('extension_sql_select', {
    sql: params.query,
    params: params.params,
    publicKey: extension.publicKey,
    name: extension.name,
  })
  return { rows, rowsAffected: 0 }
}

case 'haextension.db.execute': {
  await invoke('extension_sql_execute', {
    sql: params.query,
    params: params.params,
    publicKey: extension.publicKey,
    name: extension.name,
  })
  return { rows: [], rowsAffected: 1 }
}
```

### 3. Rust Backend - Execute & Map
**File:** `haex-hub/src-tauri/src/extension/database/mod.rs` (lines 190-294)

```rust
// SELECT query handler
#[tauri::command]
pub async fn extension_sql_select(
    sql: &str,
    params: Vec<JsonValue>,
    ...,
) -> Result<Vec<JsonValue>, ExtensionError> {
    with_connection(&state.db, |conn| {
        let mut prepared_stmt = conn.prepare(&sql)?;
        
        // KEY: Get column names
        let column_names: Vec<String> = prepared_stmt
            .column_names()
            .into_iter()
            .map(|s| s.to_string())
            .collect();
        
        // Execute and map each row to JSON
        let rows = prepared_stmt.query_map(params, |row| {
            row_to_json_value(row, &column_names)  // Maps columns by name
        })?;
        
        // Collect results
        let mut results = Vec::new();
        for row_result in rows {
            results.push(row_result?);
        }
        Ok(results)
    })
}

// Convert a single SQLite row to JSON object
fn row_to_json_value(row: &rusqlite::Row, columns: &[String]) -> Result<JsonValue, Error> {
    let mut map = serde_json::Map::new();
    for (i, col_name) in columns.iter().enumerate() {
        let value = row.get::<_, rusqlite::types::Value>(i)?;
        let json_value = match value {
            Null => JsonValue::Null,
            Integer(i) => json!(i),
            Real(f) => json!(f),
            Text(s) => json!(s),
            Blob(b) => json!(b.to_vec()),
        };
        map.insert(col_name.clone(), json_value);  // Column name as key!
    }
    Ok(JsonValue::Object(map))
}
```

## What Happens When You Write Drizzle Code

### Your Code:
```typescript
const item = await db
  .select()
  .from(haexPasswordsItemDetails)
  .where(eq(haexPasswordsItemDetails.id, "123"))
  .get()
```

### Drizzle Generates:
```typescript
sql = 'SELECT "id", "title", "username", ... FROM "haex_passwords_item_details" WHERE "id" = ?'
params = ["123"]
method = "get"
```

### SDK Sends:
```json
{
  "id": "req_1",
  "method": "haextension.db.query",
  "params": {
    "query": "SELECT ...",
    "params": ["123"]
  }
}
```

### HaexHub Routes To Rust:
```rust
invoke('extension_sql_select', {
  sql: 'SELECT "id", "title", "username", ... FROM "haex_passwords_item_details" WHERE "id" = ?',
  params: ["123"],
  publicKey: "...",
  name: "..."
})
```

### Rust Executes & Returns:
```json
[
  {
    "id": "123",
    "title": "My Password",
    "username": "user@example.com"
  }
]
```

### SDK Processes (method === "get"):
```typescript
return result.rows[0]  // First row
// Returns: { id: "123", title: "My Password", username: "user@example.com" }
```

### Drizzle Applies Schema:
```typescript
// Column names match schema properties
// Drizzle knows the types from SelectHaexPasswordsItemDetails
// TypeScript infers: SelectHaexPasswordsItemDetails
type Result = {
  id: string
  title: string | null
  username: string | null
  // ... all other schema fields
}
```

## The Magic: Automatic Column Mapping

Drizzle's column mapping works through **JSON object property names**:

1. **Schema Definition:**
   ```typescript
   sqliteTable("table_name", {
     id: text().primaryKey(),
     title: text(),
     username: text(),
   })
   ```

2. **Rust Returns JSON with matching keys:**
   ```json
   { "id": "...", "title": "...", "username": "..." }
   ```

3. **Drizzle Matches:**
   - JSON key `id` → Schema property `id` → Type: `text` (string)
   - JSON key `title` → Schema property `title` → Type: `text` (string)
   - JSON key `username` → Schema property `username` → Type: `text` (string)

4. **Result is Typed:**
   ```typescript
   const result: SelectTableName = { id, title, username }
   ```

**This works because the Rust code uses `prepared_stmt.column_names()` to get the exact column names from SQLite and uses them as JSON keys.**

## IPC Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Extension (sandboxed iframe)                                     │
│                                                                   │
│  db.select().from(table).where(...).get()                        │
│           ↓                                                       │
│    Drizzle ORM builds SQL                                        │
│           ↓                                                       │
│    Calls proxy callback(sql, params, "get")                      │
│           ↓                                                       │
│    SDK client sends: window.parent.postMessage({                │
│      id: "req_1",                                               │
│      method: "haextension.db.query",                            │
│      params: { query: "SELECT...", params: [...] }             │
│    }, "*")                                                       │
└─────────────────────────────────────────────────────────────────┘
              ↓ postMessage
┌─────────────────────────────────────────────────────────────────┐
│ HaexHub Main App (parent window)                                │
│                                                                   │
│  window.addEventListener('message', (event) => {               │
│    if (event.data.method === 'haextension.db.query') {         │
│      invoke('extension_sql_select', {                          │
│        sql: event.data.params.query,                           │
│        params: event.data.params.params,                       │
│        publicKey, name                                          │
│      })                                                         │
│    }                                                            │
│  })                                                             │
└─────────────────────────────────────────────────────────────────┘
              ↓ invoke()
┌─────────────────────────────────────────────────────────────────┐
│ Tauri Backend (Rust)                                            │
│                                                                   │
│  #[tauri::command]                                              │
│  pub async fn extension_sql_select(                             │
│    sql, params, publicKey, name                                 │
│  ) {                                                            │
│    let column_names = prepared_stmt.column_names()             │
│    let results = []                                             │
│    for row in query_results {                                   │
│      let json_row = {                                           │
│        "col1": row[0],    // column_names[0]                    │
│        "col2": row[1],    // column_names[1]                    │
│        ...                                                      │
│      }                                                          │
│      results.push(json_row)                                     │
│    }                                                            │
│    return results                                               │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
              ↓ Result: Vec<JsonValue>
┌─────────────────────────────────────────────────────────────────┐
│ HaexHub Main App (continued)                                    │
│                                                                   │
│  // SDK callback processes result                               │
│  if (method === "get") {                                        │
│    return rows[0] ?? null  // Return first row only             │
│  }                                                              │
│  if (method === "all") {                                        │
│    return rows             // Return all rows                   │
│  }                                                              │
│  if (method === "values") {                                     │
│    return rows.map(r => Object.values(r))  // Array of arrays   │
│  }                                                              │
│                                                                   │
│  // Send back to extension                                      │
│  event.source.postMessage({                                    │
│    id: "req_1",                                                │
│    result: { rows, rowsAffected, lastInsertId }               │
│  }, "*")                                                        │
└─────────────────────────────────────────────────────────────────┘
              ↓ postMessage
┌─────────────────────────────────────────────────────────────────┐
│ Extension (sandboxed iframe)                                     │
│                                                                   │
│  // SDK client receives response                                │
│  window.addEventListener('message', (event) => {              │
│    if (pendingRequests.has(event.data.id)) {                   │
│      resolve(event.data.result)  // Resolves proxy callback    │
│    }                                                            │
│  })                                                             │
│           ↓                                                       │
│    // Drizzle continues with the rows                           │
│    // Applies schema types                                      │
│    // Returns: SelectTableName (strongly typed)                 │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Checklist

- [ ] Define schema using `sqliteTable()` from `drizzle-orm/sqlite-core`
- [ ] Extract types with `typeof schema.$inferSelect` and `$inferInsert`
- [ ] In extension: Create `db` with `drizzle(dummyExecutor, { schema })`
- [ ] Call SDK's `initializeDatabase(schema)` to get Drizzle instance
- [ ] Use `db.select()`, `db.insert()`, etc. normally
- [ ] Rust backend: Use `prepared_stmt.column_names()` when mapping results
- [ ] Rust backend: Create JSON objects with column names as keys
- [ ] SDK: Format callback response based on Drizzle's `method` parameter

## Common Drizzle Methods → IPC Mapping

| Drizzle Call | Generated SQL | Method | IPC Endpoint | Response |
|---|---|---|---|---|
| `db.select().from(t)` | SELECT... | `"all"` | `haextension.db.query` | `rows: [{ ... }, { ... }]` |
| `db.select().from(t).get()` | SELECT... | `"get"` | `haextension.db.query` | SDK returns `rows[0]` |
| `db.insert(t).values(...)` | INSERT... | `"run"` | `haextension.db.execute` | `{ rowsAffected: 1 }` |
| `db.update(t).set(...).where(...)` | UPDATE... | `"run"` | `haextension.db.execute` | `{ rowsAffected: N }` |
| `db.delete(t).where(...)` | DELETE... | `"run"` | `haextension.db.execute` | `{ rowsAffected: N }` |
| `db.transaction(async (tx) => {})` | Multiple | Multiple | Multiple | Result depends on statements |

## Debugging Tips

1. **Check SDK logs:** Look for `[Drizzle Proxy] SQL:` in console
2. **Check HaexHub logs:** Look for `[ExtensionHandler]` in main app console
3. **Check Tauri logs:** Look for debug output from Rust backend
4. **Verify column names:** Ensure JSON keys exactly match schema properties
5. **Check parameter count:** Use `?` placeholders that match param array length
6. **Test raw SQL first:** Use `client.query(sql, params)` to test before using ORM

## Performance Considerations

1. **Batch operations:** Use transactions for multiple inserts/updates
2. **Limit results:** Add WHERE clauses instead of fetching all rows
3. **Indexes:** Add indexes to columns frequently used in WHERE clauses
4. **Lazy loading:** Don't load all data upfront, use pagination
5. **Connection pooling:** Handled by Tauri backend automatically
