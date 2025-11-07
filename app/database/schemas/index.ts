import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
import manifest from "../../../haextension/manifest.json";

// Helper function to create prefixed table names
const getTableName = (name: string) => `${manifest.public_key}__${manifest.name}__${name}`;

export const haexPasswordsItemDetails = sqliteTable(
  getTableName("haex_passwords_item_details"),
  {
    id: text().primaryKey(),
    title: text(),
    username: text(),
    password: text(),
    note: text(),
    icon: text(),
    tags: text(),
    url: text(),
    otpSecret: text("otp_secret"),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updateAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
      () => new Date()
    ),
  }
);
export type InsertHaexPasswordsItemDetails =
  typeof haexPasswordsItemDetails.$inferInsert;
export type SelectHaexPasswordsItemDetails =
  typeof haexPasswordsItemDetails.$inferSelect;

export const haexPasswordsItemKeyValues = sqliteTable(
  getTableName("haex_passwords_item_key_values"),
  {
    id: text().primaryKey(),
    itemId: text("item_id").references(
      (): AnySQLiteColumn => haexPasswordsItemDetails.id,
      { onDelete: "cascade" }
    ),
    key: text(),
    value: text(),
    updateAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
      () => new Date()
    ),
  }
);
export type InserthaexPasswordsItemKeyValues =
  typeof haexPasswordsItemKeyValues.$inferInsert;
export type SelectHaexPasswordsItemKeyValues =
  typeof haexPasswordsItemKeyValues.$inferSelect;

export const haexPasswordsItemHistory = sqliteTable(
  getTableName("haex_passwords_item_history"),
  {
    id: text().primaryKey(),
    itemId: text("item_id").references(
      (): AnySQLiteColumn => haexPasswordsItemDetails.id,
      { onDelete: "cascade" }
    ),
    changedProperty:
      text("changed_property").$type<keyof typeof haexPasswordsItemDetails>(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  }
);
export type InserthaexPasswordsItemHistory =
  typeof haexPasswordsItemHistory.$inferInsert;
export type SelectHaexPasswordsItemHistory =
  typeof haexPasswordsItemHistory.$inferSelect;

export const haexPasswordsGroups = sqliteTable(
  getTableName("haex_passwords_groups"),
  {
    id: text().primaryKey(),
    name: text(),
    description: text(),
    icon: text(),
    order: integer(),
    color: text(),
    parentId: text("parent_id").references(
      (): AnySQLiteColumn => haexPasswordsGroups.id,
      { onDelete: "cascade" }
    ),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updateAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
      () => new Date()
    ),
  }
);
export type InsertHaexPasswordsGroups = typeof haexPasswordsGroups.$inferInsert;
export type SelectHaexPasswordsGroups = typeof haexPasswordsGroups.$inferSelect;

export const haexPasswordsGroupItems = sqliteTable(
  getTableName("haex_passwords_group_items"),
  {
    groupId: text("group_id").references(
      (): AnySQLiteColumn => haexPasswordsGroups.id,
      { onDelete: "cascade" }
    ),
    itemId: text("item_id").references(
      (): AnySQLiteColumn => haexPasswordsItemDetails.id,
      { onDelete: "cascade" }
    ),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.groupId] })]
);
export type InsertHaexPasswordsGroupItems =
  typeof haexPasswordsGroupItems.$inferInsert;
export type SelectHaexPasswordsGroupItems =
  typeof haexPasswordsGroupItems.$inferSelect;

// Zentrale Binary-Tabelle (dedupliziert via SHA-256 Hash)
export const haexPasswordsBinaries = sqliteTable(
  getTableName("haex_passwords_binaries"),
  {
    hash: text().primaryKey(), // SHA-256 hash als Primary Key
    data: text().notNull(), // Base64-encoded binary data
    size: integer().notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  }
);
export type InsertHaexPasswordsBinaries =
  typeof haexPasswordsBinaries.$inferInsert;
export type SelectHaexPasswordsBinaries =
  typeof haexPasswordsBinaries.$inferSelect;

// Entry → Binary Mapping (unterstützt mehrere Attachments pro Entry)
export const haexPasswordsItemBinaries = sqliteTable(
  getTableName("haex_passwords_item_binaries"),
  {
    id: text().primaryKey(),
    itemId: text("item_id")
      .references((): AnySQLiteColumn => haexPasswordsItemDetails.id, {
        onDelete: "cascade",
      })
      .notNull(),
    binaryHash: text("binary_hash")
      .references((): AnySQLiteColumn => haexPasswordsBinaries.hash, {
        onDelete: "cascade",
      })
      .notNull(),
    fileName: text("file_name").notNull(), // Dateiname kann pro Entry unterschiedlich sein
  }
);
export type InsertHaexPasswordsItemBinaries =
  typeof haexPasswordsItemBinaries.$inferInsert;
export type SelectHaexPasswordsItemBinaries =
  typeof haexPasswordsItemBinaries.$inferSelect;

// Entry History Snapshots (wie KeePass - komplette Entry-Snapshots)
export const haexPasswordsItemSnapshots = sqliteTable(
  getTableName("haex_passwords_item_snapshots"),
  {
    id: text().primaryKey(),
    itemId: text("item_id")
      .references((): AnySQLiteColumn => haexPasswordsItemDetails.id, {
        onDelete: "cascade",
      })
      .notNull(),
    // Snapshot-Daten als JSON (alle Entry-Felder außer Binaries)
    snapshotData: text("snapshot_data").notNull(), // JSON: { title, username, password, url, note, tags, otpSecret, keyValues, ... }
    // Timestamps
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    modifiedAt: text("modified_at"), // Wann wurde der Entry in diesem Zustand zuletzt geändert
  }
);
export type InsertHaexPasswordsItemSnapshots =
  typeof haexPasswordsItemSnapshots.$inferInsert;
export type SelectHaexPasswordsItemSnapshots =
  typeof haexPasswordsItemSnapshots.$inferSelect;

// Snapshot → Binary Mapping (für History-Attachments)
export const haexPasswordsSnapshotBinaries = sqliteTable(
  getTableName("haex_passwords_snapshot_binaries"),
  {
    id: text().primaryKey(),
    snapshotId: text("snapshot_id")
      .references((): AnySQLiteColumn => haexPasswordsItemSnapshots.id, {
        onDelete: "cascade",
      })
      .notNull(),
    binaryHash: text("binary_hash")
      .references((): AnySQLiteColumn => haexPasswordsBinaries.hash, {
        onDelete: "cascade",
      })
      .notNull(),
    fileName: text("file_name").notNull(),
  }
);
export type InsertHaexPasswordsSnapshotBinaries =
  typeof haexPasswordsSnapshotBinaries.$inferInsert;
export type SelectHaexPasswordsSnapshotBinaries =
  typeof haexPasswordsSnapshotBinaries.$inferSelect;
