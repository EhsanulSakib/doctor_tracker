# Module 5.1 — README: Walkthrough

## What a good README does here
The specification grades the README as "the primary technical documentation" and fixes five sections: Description, Setup Guide (with `.env.example`), System Architecture, Technical Decisions (two deep dives) and Visual Evidence. The README keeps those five, in that order, then adds what the evaluation criteria look for:
- query optimization: the index tables plus real `explain()` output;
- the security checklist;
- scalability;
- the API, testing and deployment.

## How it was kept accurate
- **Copy facts from the source, not from memory:** variables from the Zod env schema, scripts from `package.json`, indexes from the models, plans from `npm run db:explain`, cookie and rate-limit values from their modules.
- **Diagrams as Mermaid,** so they live in the repo and render on GitHub: one for services and data flow, one for the sign-in / refresh sequence, one for the data model.
- **Technical decisions follow problem → what we built → trade-offs accepted.** A decision without its cost reads like marketing.

## Screenshots without Playwright
The same headless-Chrome DevTools helper used for the browser checks drives the production build:
- sign in, open each screen, emulate the device (`Emulation.setDeviceMetricsOverride`, 2× density, touch for phones);
- capture with `Page.captureScreenshot` as WebP (quality 88): sharp text, ~2 MB for all 18;
- crop the top-bar panels to the open panel's `getBoundingClientRect()`;
- blur the focused element before each capture so no stray focus ring appears.

## Checkpoint summary
README done to the spec, screenshots in `docs/screenshots/`, deployment left to the user (settings in the README). **All milestones complete**, pending the user's review and deployment.
