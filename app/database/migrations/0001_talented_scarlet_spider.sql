CREATE TABLE `b4401f13f65e576b8a30ff9fd83df82a8bb707e1994d40c99996fe88603cefca__haex-pass__haex_passwords_binaries` (
	`hash` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `b4401f13f65e576b8a30ff9fd83df82a8bb707e1994d40c99996fe88603cefca__haex-pass__haex_passwords_item_binaries` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`binary_hash` text NOT NULL,
	`file_name` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `b4401f13f65e576b8a30ff9fd83df82a8bb707e1994d40c99996fe88603cefca__haex-pass__haex_passwords_item_details`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`binary_hash`) REFERENCES `b4401f13f65e576b8a30ff9fd83df82a8bb707e1994d40c99996fe88603cefca__haex-pass__haex_passwords_binaries`(`hash`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `b4401f13f65e576b8a30ff9fd83df82a8bb707e1994d40c99996fe88603cefca__haex-pass__haex_passwords_item_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`snapshot_data` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`modified_at` text,
	FOREIGN KEY (`item_id`) REFERENCES `b4401f13f65e576b8a30ff9fd83df82a8bb707e1994d40c99996fe88603cefca__haex-pass__haex_passwords_item_details`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `b4401f13f65e576b8a30ff9fd83df82a8bb707e1994d40c99996fe88603cefca__haex-pass__haex_passwords_snapshot_binaries` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_id` text NOT NULL,
	`binary_hash` text NOT NULL,
	`file_name` text NOT NULL,
	FOREIGN KEY (`snapshot_id`) REFERENCES `b4401f13f65e576b8a30ff9fd83df82a8bb707e1994d40c99996fe88603cefca__haex-pass__haex_passwords_item_snapshots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`binary_hash`) REFERENCES `b4401f13f65e576b8a30ff9fd83df82a8bb707e1994d40c99996fe88603cefca__haex-pass__haex_passwords_binaries`(`hash`) ON UPDATE no action ON DELETE cascade
);
