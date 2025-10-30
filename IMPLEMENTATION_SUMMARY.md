# HaexHub Drizzle with IPC: Implementation Summary

## What You Need to Know

HaexHub implements Drizzle ORM for extensions using a **three-layer architecture** that bridges frontend and backend:

1. **Frontend (Extension)**: Uses Drizzle ORM with full TypeScript type safety
2. **Frontend (Main App)**: Routes IPC messages to Tauri backend
3. **Backend (Rust)**: Executes SQL and maps results to JSON with column names

## The Core Insight: Column Name Preservation

**The automatic column mapping in Drizzle works because:**

1. Rust's SQLite adapter provides `prepared_stmt.column_names()`
2. This is used as JSON object keys when returning results
3. Drizzle matches these JSON keys to schema properties
4. TypeScript types are automatically applied

Example:
```
Schema property "username" 
  → JSON key "username" 
  → Type from schema: string | null
  → Result: { username: "user@example.com" }
```

## The Three Critical Code Paths

### Path 1: Frontend → IPC (Extension sends query)

**File:** `/home/haex/Projekte/haexhub-sdk/src/client.ts` (lines 94-148)

Drizzle calls a callback that:
1. Intercepts SQL before execution
2. Routes to HaexHub main app via `window.parent.postMessage()`
3. For queries: calls `haextension.db.query`
4. For mutations: calls `haextension.db.execute`

```typescript
async (sql, params, method) => {
  if (method === "run") {
    // Mutations
    return this.request("haextension.db.execute", { query: sql, params })
  } else {
    // Queries
    const result = this.request("haextension.db.query", { query: sql, params })
    // Format based on method (get, all, values)
    return formatForDrizzle(result.rows, method)
  }
}
```

### Path 2: Main App → Rust (Handler routes to backend)

**File:** `/home/haex/Projekte/haex-hub/src/composables/extensionMessageHandler.ts` (lines 357-416)

Main app receives postMessage and:
1. Identifies which extension sent it
2. Extracts SQL and params
3. Routes to appropriate Tauri command
4. Returns formatted response

```typescript
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
  await invoke('extension_sql_execute', { ... })
  return { rows: [], rowsAffected: 1 }
}
```

### Path 3: Rust Backend → Database (Execute and map)

**File:** `/home/haex/Projekte/haex-hub/src-tauri/src/extension/database/mod.rs` (lines 190-294)

Rust backend:
1. Executes SQL on SQLite
2. Gets column names from prepared statement
3. Converts each row to JSON object with column names as keys
4. Returns `Vec<JsonValue>`

```rust
let column_names = prepared_stmt.column_names()  // ["id", "title", ...]
let rows = prepared_stmt.query_map(params, |row| {
    row_to_json_value(row, &column_names)  // Maps by column name
})?;

fn row_to_json_value(row, columns) {
    let mut map = serde_json::Map::new();
    for (i, col_name) in columns.iter().enumerate() {
        let value = row.get(i)?;
        map.insert(col_name.clone(), value_to_json(value));
    }
    JsonValue::Object(map)
}
// Returns: [{ "id": "123", "title": "...", "username": "..." }]
```

## Complete Flow Example

**Your Extension Code:**
```typescript
const item = await db
  .select()
  .from(haexPasswordsItemDetails)
  .where(eq(haexPasswordsItemDetails.id, "uuid-123"))
  .get()
// Expected result: { id: string, title: string | null, username: string | null, ... }
```

**Step-by-Step Execution:**

1. Drizzle builds SQL:
   ```sql
   SELECT "id", "title", "username" FROM "table" WHERE "id" = ?
   ```

2. SDK callback intercepts (method = "get"):
   ```typescript
   // Sends postMessage to parent window
   window.parent.postMessage({
     id: "req_1",
     method: "haextension.db.query",
     params: { query: "SELECT...", params: ["uuid-123"] }
   }, "*")
   ```

3. HaexHub main app receives and routes:
   ```typescript
   invoke('extension_sql_select', {
     sql: "SELECT...",
     params: ["uuid-123"],
     publicKey: extension.publicKey,
     name: extension.name
   })
   ```

4. Rust backend executes:
   ```rust
   // column_names = ["id", "title", "username"]
   // row = [Value::Text("uuid-123"), Value::Text("My Password"), Value::Text("user@example")]
   // Returns:
   [JsonValue::Object({
     "id": "uuid-123",
     "title": "My Password", 
     "username": "user@example"
   })]
   ```

5. Main app receives result and sends back:
   ```typescript
   event.source.postMessage({
     id: "req_1",
     result: { 
       rows: [{"id": "uuid-123", "title": "...", "username": "..."}],
       rowsAffected: 0 
     }
   }, "*")
   ```

6. SDK callback processes (method = "get"):
   ```typescript
   // Returns first row only
   return rows[0]  // { id: "uuid-123", title: "...", username: "..." }
   ```

7. Drizzle applies schema:
   ```typescript
   // Matches JSON keys to schema columns
   // Applies types from SelectHaexPasswordsItemDetails
   const result: SelectHaexPasswordsItemDetails = {
     id: "uuid-123",
     title: "My Password",
     username: "user@example",
     // ... all other schema fields
   }
   ```

## Result Format Specification

The database result always follows this structure:

```typescript
interface DatabaseQueryResult {
  rows: unknown[]           // Array of row objects
  rowsAffected?: number     // For mutations
  lastInsertId?: number     // For inserts
}
```

Each row in `rows` is a JSON object:
```json
{
  "column_name_1": value_1,
  "column_name_2": value_2,
  ...
}
```

Where `column_name_X` matches the actual SQL column name from the table.

## Key Implementation Requirements

For automatic column mapping to work:

1. **Schema Definition** must have properties matching column names:
   ```typescript
   sqliteTable("table_name", {
     column_name_1: type,
     column_name_2: type,
   })
   ```

2. **JSON Keys** returned from Rust must match column names exactly:
   ```json
   { "column_name_1": value, "column_name_2": value }
   ```

3. **Type Inference** happens automatically:
   ```typescript
   // Drizzle infers types from schema
   typeof SelectTableName = {
     column_name_1: TypeFromSchema,
     column_name_2: TypeFromSchema,
   }
   ```

## Files to Understand

| File | Purpose | Key Lines |
|------|---------|-----------|
| `haexhub-sdk/src/client.ts` | SDK Drizzle initialization and callback | 84-152, 314-350 |
| `haex-hub/src/composables/extensionMessageHandler.ts` | IPC message routing | 36-218, 357-416 |
| `haex-hub/src-tauri/src/extension/database/mod.rs` | SQL execution and JSON mapping | 106-294 |
| `haex-hub/src/stores/vault/index.ts` | Main app Drizzle setup (example) | 40-73, 134-187 |

## Method Routing Reference

Drizzle's proxy callback receives different `method` values:

| Method | Use Case | Route | Response Format |
|--------|----------|-------|-----------------|
| `"get"` | `.get()` on SELECT | `haextension.db.query` | Return first row: `rows[0]` |
| `"all"` | `.all()` or implicit on SELECT | `haextension.db.query` | Return all rows: `rows` |
| `"values"` | Internal, rarely used | `haextension.db.query` | Return as arrays: `rows.map(r => Object.values(r))` |
| `"run"` | INSERT, UPDATE, DELETE | `haextension.db.execute` | Return metadata: `{ rowsAffected, lastInsertId }` |

## Testing Your Implementation

1. **Schema Definition:**
   ```bash
   ✓ Columns in schema match table columns
   ✓ Types match actual column types
   ```

2. **SDK Integration:**
   ```bash
   ✓ Drizzle callback intercepts SQL
   ✓ postMessage sends to parent window
   ✓ Response received and processed correctly
   ```

3. **HaexHub Integration:**
   ```bash
   ✓ postMessage received and routed
   ✓ Tauri command invoked with correct params
   ✓ Extension identified by publicKey and name
   ```

4. **Rust Backend:**
   ```bash
   ✓ SQL parsed and executed
   ✓ Column names extracted
   ✓ JSON response has correct keys
   ```

5. **Type Safety:**
   ```bash
   ✓ TypeScript recognizes all schema properties
   ✓ Types match expected values
   ✓ IDE autocomplete works
   ```

## Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "column does not exist" | JSON key name mismatch | Verify `column_names()` output matches JSON keys |
| `undefined` results | Schema property missing | Add property to schema matching column name |
| Parameter mismatch | Wrong number of placeholders | Count `?` in SQL, should match params.length |
| Timeout | Request not being routed | Check postMessage event listener in main app |
| Type errors | Schema types don't match data | Verify column types in schema definition |

## Performance Notes

1. **IPC Overhead:** One round-trip per query (unavoidable for security)
2. **Batching:** Use transactions for multiple operations
3. **JSON Serialization:** All data goes through JSON, avoid very large blobs
4. **Connection Pooling:** Handled by Tauri backend, no action needed

## Security Boundaries

1. **Extension can't access other extensions' tables** - enforced by table naming prefix
2. **Extension can't bypass permissions** - validated before SQL execution
3. **Extension can't execute arbitrary commands** - only SQL allowed
4. **IPC uses wildcard origin** - acceptable because extensions are sandboxed by iframe

---

**See DRIZZLE_IPC_ANALYSIS.md for detailed code examples and architecture diagrams.**
**See DRIZZLE_QUICK_REFERENCE.md for quick lookup of implementation details.**
