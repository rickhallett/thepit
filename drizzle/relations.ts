import { relations } from "drizzle-orm/relations";
import { shortLinks, shortLinkClicks } from "./schema";

export const shortLinkClicksRelations = relations(shortLinkClicks, ({one}) => ({
	shortLink: one(shortLinks, {
		fields: [shortLinkClicks.shortLinkId],
		references: [shortLinks.id]
	}),
}));

export const shortLinksRelations = relations(shortLinks, ({many}) => ({
	shortLinkClicks: many(shortLinkClicks),
}));