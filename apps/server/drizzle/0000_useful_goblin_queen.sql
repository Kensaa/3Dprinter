CREATE TABLE `Clients` (
	`id` integer PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`connected` integer NOT NULL,
	`label` text NOT NULL,
	`chest_nbt` text NOT NULL,
	`state` text DEFAULT 'idle' NOT NULL,
	`position` text,
	`fuel` integer,
	`progress` real,
	`partIndex` integer
);
--> statement-breakpoint
CREATE TABLE `LockQueue` (
	`providerID` integer NOT NULL,
	`clientID` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`providerID`, `clientID`),
	FOREIGN KEY (`providerID`) REFERENCES `Clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`clientID`) REFERENCES `Clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `LockState` (
	`providerID` integer PRIMARY KEY NOT NULL,
	`clientID` integer NOT NULL,
	FOREIGN KEY (`providerID`) REFERENCES `Clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`clientID`) REFERENCES `Clients`(`id`) ON UPDATE no action ON DELETE no action
);
