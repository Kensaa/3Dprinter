CREATE TABLE `Clients` (
	`id` integer PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`state` text NOT NULL,
	`connected` integer NOT NULL,
	`position` text,
	`fuel` integer,
	`progress` real,
	`partIndex` integer
);
