CREATE TABLE `confession_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text,
	`note` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `confession_blocks` (
	`actor` text NOT NULL,
	`target` text NOT NULL,
	PRIMARY KEY(`actor`, `target`)
);
--> statement-breakpoint
CREATE TABLE `confession_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`target` text NOT NULL,
	`reporter` text NOT NULL,
	`reason` text NOT NULL,
	`created` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `confession_report_once` ON `confession_reports` (`target`,`reporter`);--> statement-breakpoint
CREATE TABLE `confessions` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`parent` text,
	`author` text NOT NULL,
	`body` text NOT NULL,
	`theme` text NOT NULL,
	`response_type` text NOT NULL,
	`language` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` integer DEFAULT 2 NOT NULL,
	`signals` text DEFAULT '[]' NOT NULL,
	`closed` integer DEFAULT 0 NOT NULL,
	`thanked` integer DEFAULT 0 NOT NULL,
	`claimed_by` text,
	`claimed_until` integer DEFAULT 0 NOT NULL,
	`audio_type` text,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `confession_one_reply` ON `confessions` (`parent`);--> statement-breakpoint
CREATE INDEX `confession_queue` ON `confessions` (`status`,`priority`,`created`);--> statement-breakpoint
CREATE INDEX `confession_author` ON `confessions` (`author`,`created`);