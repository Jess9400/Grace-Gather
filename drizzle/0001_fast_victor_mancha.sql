CREATE TABLE `profiles` (
	`user` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`region` text NOT NULL,
	`country` text NOT NULL,
	`intent` text NOT NULL,
	`email` text NOT NULL,
	`notifications` integer DEFAULT 0 NOT NULL,
	`updated` integer NOT NULL
);
