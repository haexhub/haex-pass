# HaexHub Drizzle with IPC: Complete Documentation Index

Welcome! This directory contains comprehensive documentation on how HaexHub implements Drizzle ORM with Inter-Process Communication (IPC).

## Documentation Files

### 1. IMPLEMENTATION_SUMMARY.md (START HERE)
**Length:** ~5 minutes read  
**Best for:** Getting the big picture quickly

- What you need to know about HaexHub's Drizzle implementation
- The three critical code paths (Frontend → IPC → Backend)
- Complete flow example with step-by-step execution
- Common issues and solutions
- Quick reference tables

**When to read:** First thing - gives you the foundational understanding

---

### 2. DRIZZLE_QUICK_REFERENCE.md (FOR LOOKUPS)
**Length:** ~8 minutes read  
**Best for:** Quick implementation lookups and debugging

- How it works in one diagram
- Key code locations with exact line numbers
- What happens when you write Drizzle code (step-by-step)
- The magic: automatic column mapping explained
- IPC flow diagram with all components
- Drizzle methods → IPC mapping table
- Implementation checklist
- Debugging tips

**When to read:** While implementing features or debugging issues

---

### 3. DRIZZLE_IPC_ANALYSIS.md (DETAILED REFERENCE)
**Length:** ~20 minutes read  
**Best for:** Deep dive into implementation details

Complete analysis including:
- Architecture flow diagram
- SDK client implementation (lines 84-152)
- IPC request mechanism (lines 314-350)
- HaexHub extension message handler (lines 357-416)
- Tauri backend SQL execution (lines 190-274)
- Row-to-JSON conversion (lines 276-294)
- Vault store Drizzle setup (lines 40-73, 134-187)
- Example extension using Drizzle
- Result format specification
- Type inference chain
- Key implementation details
- Request/response flow example
- Advantages of the architecture
- Critical files reference table

**When to read:** When you need to understand how something works in detail

---

## Quick Navigation

### "I want to understand the basics"
1. Read: **IMPLEMENTATION_SUMMARY.md**
2. Then: **DRIZZLE_QUICK_REFERENCE.md** - "The Magic" section

### "I'm implementing a new extension"
1. Check: **DRIZZLE_QUICK_REFERENCE.md** - "Implementation Checklist"
2. Reference: Tables in **DRIZZLE_QUICK_REFERENCE.md** for method mapping
3. Debug with: "Debugging Tips" section

### "I need to debug something"
1. Check: **DRIZZLE_QUICK_REFERENCE.md** - "Common Issues and Solutions"
2. Verify: "Debugging Tips" section
3. Deep dive: **DRIZZLE_IPC_ANALYSIS.md** - specific section

### "I want to understand the architecture"
1. Read: **IMPLEMENTATION_SUMMARY.md** - "The Three Critical Code Paths"
2. Study: **DRIZZLE_QUICK_REFERENCE.md** - "IPC Flow Diagram"
3. Deep dive: **DRIZZLE_IPC_ANALYSIS.md** - "Architecture Flow Diagram" and each section

### "I need to modify the implementation"
1. Read: **DRIZZLE_IPC_ANALYSIS.md** - entire document
2. Reference: "Critical Files Reference" table
3. Check: Exact line numbers for each component

---

## Key Concepts Quick Reference

### The Core Insight
```
Column Names from SQLite → JSON Keys → Schema Properties → Types
```

Drizzle's automatic column mapping works because the Rust backend:
1. Gets column names from `prepared_stmt.column_names()`
2. Uses them as JSON object keys
3. Drizzle matches these keys to schema properties
4. Types are automatically applied

### The Three Layers
```
Frontend (Extension)
    ↓ Drizzle ORM
Frontend (Main App)
    ↓ postMessage IPC
Backend (Rust)
    ↓ SQLite execution
Database
```

### Method Routing
```
Drizzle method → IPC endpoint
- "run" (mutations) → haextension.db.execute
- "get" (single row) → haextension.db.query (return rows[0])
- "all" (all rows) → haextension.db.query (return rows)
- "values" (arrays) → haextension.db.query (return Object.values())
```

---

## Critical Code Locations

| What | Where | Lines | See Doc |
|------|-------|-------|---------|
| SDK Drizzle init | `haexhub-sdk/src/client.ts` | 84-152 | QUICK_REF, ANALYSIS |
| SDK IPC request | `haexhub-sdk/src/client.ts` | 314-350 | QUICK_REF, ANALYSIS |
| HaexHub routing | `haex-hub/src/composables/extensionMessageHandler.ts` | 357-416 | QUICK_REF, ANALYSIS |
| Rust execution | `haex-hub/src-tauri/src/extension/database/mod.rs` | 190-274 | QUICK_REF, ANALYSIS |
| Row mapping | `haex-hub/src-tauri/src/extension/database/mod.rs` | 276-294 | QUICK_REF, ANALYSIS |
| Main app vault | `haex-hub/src/stores/vault/index.ts` | 40-73, 134-187 | ANALYSIS |

---

## Common Tasks

### Task: Create a new table schema
1. Read: QUICK_REF - "Implementation Checklist"
2. Reference: ANALYSIS - Section 5 example
3. Ensure: Column names in schema match actual table columns

### Task: Query data using Drizzle
1. Check: QUICK_REF - "Common Drizzle Methods" table
2. Write: Code following Drizzle syntax
3. Type safety: Automatically provided from schema

### Task: Debug a query not returning data
1. Check: QUICK_REF - "Debugging Tips"
2. Verify: JSON keys match schema properties
3. Check: Parameter count matches `?` placeholders
4. Inspect: Console logs from [Drizzle Proxy] section

### Task: Understand why a type is wrong
1. Check: IMPLEMENTATION_SUMMARY - "Result Format Specification"
2. Verify: Column types in schema
3. Check: JSON values from Rust match expected types

### Task: Optimize database performance
1. Read: DRIZZLE_IPC_ANALYSIS - "Advantages of This Architecture"
2. Check: QUICK_REF - "Performance Considerations"
3. Use: Transactions for batch operations

---

## Document Statistics

| Document | Type | Length | Time to Read |
|----------|------|--------|--------------|
| IMPLEMENTATION_SUMMARY.md | Conceptual | 9.4 KB | 5-7 min |
| DRIZZLE_QUICK_REFERENCE.md | Reference | 16 KB | 8-10 min |
| DRIZZLE_IPC_ANALYSIS.md | Detailed | 18 KB | 15-20 min |

**Total:** 43.4 KB, ~30-40 minutes to read all

---

## Key Takeaways

1. **Extensions use Drizzle ORM normally** with full TypeScript type safety
2. **Queries go through IPC** (postMessage) to HaexHub main app
3. **HaexHub routes to Rust backend** via Tauri commands
4. **Rust executes SQL and maps results** using column names as JSON keys
5. **Drizzle automatically applies types** based on schema matching column names
6. **Results arrive fully typed** ready to use in the frontend

---

## Getting Help

### If you're confused about...

**How data flows from frontend to backend?**
→ See IMPLEMENTATION_SUMMARY.md section "Complete Flow Example"

**How Drizzle's column mapping works?**
→ See DRIZZLE_QUICK_REFERENCE.md section "The Magic: Automatic Column Mapping"

**Exact code implementing a feature?**
→ See DRIZZLE_IPC_ANALYSIS.md sections 1-3

**Where a specific piece of code is?**
→ See "Critical Code Locations" table above

**How to implement something?**
→ See DRIZZLE_QUICK_REFERENCE.md section "Implementation Checklist"

**A specific error or issue?**
→ See DRIZZLE_QUICK_REFERENCE.md section "Common Issues and Solutions"

---

## Document Convention

Across all documents:
- **File paths** are absolute: `/home/haex/Projekte/...`
- **Line numbers** are accurate to source files
- **Code snippets** are real code from the repository
- **Diagrams** use ASCII art for clarity
- **Tables** organize reference information
- **Sections** are clearly labeled and cross-referenced

---

**Last Updated:** October 30, 2024  
**Covers:** HaexHub Drizzle with IPC implementation  
**Scope:** Frontend SDK, Main app, and Rust backend integration
