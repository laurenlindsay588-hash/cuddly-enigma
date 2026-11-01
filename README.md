# hush 5.1.13

A responsive browser start page built with React, TypeScript, and Vite. Instagram, Facebook, YouTube, LinkedIn, Pinterest, and Reddit open their real websites in new tabs. No account or backend configuration is required.

The Chrome-inspired frame includes Explore, History, and Next up pages, back/forward controls for those pages, a Home button, and a collections bar. Enter an HTTP/HTTPS address or a Google search in either search bar; Enter and the arrow button open the destination in a new tab on the web or the native Safari sheet on iOS. Ctrl/Cmd+L focuses the top address bar when the host browser passes the shortcut to the app. No autocomplete requests are sent while typing. These controls do not replace the host browser's engine or external-page history.

Filter saved websites with **Find a bookmark, topic, or task**, browse by category, or add your own HTTP/HTTPS links. Addresses without a scheme default to HTTPS. Personal links are saved only in the current browser using local storage and can be removed from My links. Every destination uses a regular link with `target="_blank"` and `rel="noopener noreferrer"`.

Use **Settings** to choose light, dark, or device appearance, pick an accent preset, or choose a custom color. Star any built-in or personal website to add it to **Your favorites**. Select **Reorder**, then use the earlier/later arrows to arrange favorites with a mouse, touch, or keyboard. Settings also lets you hide the favorites section without losing its contents or order. Appearance, favorites, and their order are saved in this browser; existing personal links are preserved. If storage is unavailable, changes still work for the current visit and a notice explains they could not be saved.

**History** shows the last 50 unique destinations opened from website cards, favorites, or History itself, newest first with a local date and time. Reopening a destination moves it to the top; links still open in new tabs. This is hush activity only, not your browser’s browsing history. History is saved only in this browser. Pause recording in **Settings** (existing entries remain), or use **Clear history** and confirm to remove it. Clearing history leaves your links, favorites, and appearance intact.

## Explore with purpose

The catalog includes 30 real destinations across Social, Entertainment, Work, Learn, Create, and Everyday. Search matches names, addresses, descriptions, categories, and topic keywords; multiple words narrow the results together. Existing personal links, favorite order, appearance, and history retain their storage formats.

**Task trails** provide four ordered starting points: research a question, bring an idea to life, build a new skill, and make a plan. Select a trail to see its suggested sequence and destinations. Exit the trail, choose a category, or type a search to return to the wider catalog. These are curated suggestions, not tracked course progress.

**Next up** is a separate queue for websites you want to try. Use the Next up button on any card, including personal links. Add a next-step note (up to 240 characters), saved as you type. Opening a destination keeps it queued and follows the existing history setting. Done removes the entry and its note without changing favorites or history. Removing a personal link also removes its queue entry. The queue uses its own local storage key, `hush-next-up-v5`; it has no account, sync, or backend. When storage fails, the current visit still works and a notice explains that changes could not be saved.

All destinations open individually in new tabs. External services may offer accounts or paid plans; hush does not subscribe to or integrate with them. Be mindful of what you upload to external tools.

## Backup and restore

**Settings → Backup** exports your links, favorites, Next up queue, history, settings, scratchpad, and timer to `hush-backup.json`. Importing a backup replaces the current data in this browser and reloads the page. Backups are plain text; avoid sharing files that contain private notes.

## New in 5.1.13

**Settings** now follows Chrome's layout: a sidebar (Appearance, Privacy and history, Backup and restore, About hush) beside row-based cards with toggle switches. All saved data keeps its storage format.

## New in 3.2

A softer visual style and a bottom navigation bar on phones make Explore,
History, Next up, and **Tools** easier to reach. Tools includes a 5, 15, or
25-minute focus timer with pause, resume, and reset, plus an autosaving
scratchpad (10,000 characters). Both work offline using local storage with no
account or new backend. Existing links, favorites, settings, and history keep
their storage formats.

The timer stores its deadline so it catches up after backgrounding or reopening
the app. It shows completion in Tools when the app resumes; it does not send a
background alarm. The scratchpad stays in this app on this device and asks before
clearing. Clearing app data removes it. Storage failures are shown in the tools.

## Development

Use Node.js 22.18 or newer.

```bash
npm ci
npm run dev
```

## Verification and production build

```bash
npm test
npm run lint
npm run build
npm run preview
```

## AWS deployment

The workflow in `.github/workflows/aws.yml` builds the static site and deploys `dist/` to Amazon S3 on pushes to `main` or `master`, or via `workflow_dispatch`.

Set repository variables `AWS_REGION` and `AWS_S3_BUCKET`. Optionally set `CLOUDFRONT_DISTRIBUTION_ID` to invalidate a distribution after deployment. Configure the `AWS_ROLE_TO_ASSUME` secret for OIDC authentication, or both `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

## iOS app and IPA artifacts

The Capacitor iOS project in `ios/` packages this same interface and keeps personal
data on the device. It uses a public Netlify catalog API with a bundled offline
fallback. The website continues to work independently of the API.

On macOS with Xcode 26+, run `npm run ios:ipa` to build an unsigned device IPA.
The **Build iOS IPA** GitHub Actions workflow uploads an unsigned IPA
on pull requests, and supports a manually requested signed export when Apple
Developer credentials are configured. Unsigned IPAs require signing before device
installation. See [IPA artifact setup](docs/ios-ipa.md) for downloads, signing
secrets, local commands, and verification limits, or [iOS setup](docs/ios-and-api.md)
for running the app. IPA builds do not deploy an API.
