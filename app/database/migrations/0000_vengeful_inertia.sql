CREATE TABLE `b4401f13f65e576b8a30ff9fd83df82a8bb707e1994d40c99996fe88603cefca__haex-pass__haex_passwords_item_details` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`username` text,
	`password` text,
	`note` text,
	`icon` text,
	`tags` text,
	`url` text,
	`otp_secret` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `b4401f13f65e576b8a30ff9fd83df82a8bb707e1994d40c99996fe88603cefca__haex-pass__haex_passwords_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`description` text,
	`icon` text,
	`order` integer,
	`color` text,
	`parent_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` integer,
	FOREIGN KEY (`parent_id`) REFERENCES `b4401f13f65e576b8a30ff9fd83df82a8bb707e1994d40c99996fe88603cefca__haex-pass__haex_passwords_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `b4401f13f65e576b8a30ff9fd83df82a8bb707e1994d40c99996fe88603cefca__haex-pass__haex_passwords_item_history` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text,
	`changed_property` text,
	`old_value` text,
	`new_value` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`item_id`) REFERENCES `b4401f13f65e576b8a30ff9fd83df82a8bb707e1994d40c99996fe88603cefca__haex-pass__haex_passwords_item_details`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `b4401f13f65e576b8a30ff9fd83df82a8bb707e1994d40c99996fe88603cefca__haex-pass__haex_passwords_item_key_values` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text,
	`key` text,
	`value` text,
	`updated_at` integer,
	FOREIGN KEY (`item_id`) REFERENCES `b4401f13f65e576b8a30ff9fd83df82a8bb707e1994d40c99996fe88603cefca__haex-pass__haex_passwords_item_details`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `b4401f13f65e576b8a30ff9fd83df82a8bb707e1994d40c99996fe88603cefca__haex-pass__haex_passwords_group_items` (
	`group_id` text,
	`item_id` text,
	PRIMARY KEY(`item_id`, `group_id`),
	FOREIGN KEY (`group_id`) REFERENCES `b4401f13f65e576b8a30ff9fd83df82a8bb707e1994d40c99996fe88603cefca__haex-pass__haex_passwords_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `b4401f13f65e576b8a30ff9fd83df82a8bb707e1994d40c99996fe88603cefca__haex-pass__haex_passwords_item_details`(`id`) ON UPDATE no action ON DELETE cascade
);
