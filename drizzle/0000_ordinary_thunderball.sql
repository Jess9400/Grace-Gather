CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`item` text NOT NULL,
	`user` text NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`created` integer NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `comments_item` ON `comments` (`item`,`created`);--> statement-breakpoint
CREATE TABLE `interests` (
	`series` text NOT NULL,
	`user` text NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`series`, `user`)
);
--> statement-breakpoint
CREATE TABLE `likes` (
	`item` text NOT NULL,
	`user` text NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`item`, `user`)
);
