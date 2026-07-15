# ICM Mobile CMS contract

ICM Mobile accepts a provider-neutral JSON endpoint described by `icm-content.schema.json`. The app normalizes alternate field names and also accepts a raw WordPress REST posts array, including `_embedded` featured media.

Configure an endpoint using one of these options, in priority order:

1. Add `?cms=https://example.org/mobile-content` to the prototype URL for testing.
2. Set `window.ICM_APP_CONFIG.cmsEndpoint` before the app script loads.
3. Store `icm-cms-endpoint` in local storage.
4. Add `<meta name="icm-cms-endpoint" content="https://example.org/mobile-content">`.

Multiple comma-separated endpoints are supported and tried in order. Production endpoints must use HTTPS. Native fetching is used inside Expo, avoiding WebView CORS limitations. A successful normalized response is cached for offline use for up to 30 days; the bundled content and prayer timetable remain the final offline fallback.

## WordPress

The quickest WordPress setup is a small public REST route that returns `icm-content.example.json`'s shape. A normal endpoint such as `/wp-json/wp/v2/posts?_embed=1` also works for news, while Advanced Custom Fields may expose `news`, `jummah_shifts`, `donation`, `site`, and `prayer_times`. The adapter recognizes common camelCase and snake_case variants.

For news artwork, publish `imageWidth` and `imageHeight` whenever the provider does not return dimensions automatically. Use `imageFit: "contain"` for flyers, schedules, and text-heavy posters; use `imageFit: "cover"` for photography. Optional `imageFocalX` and `imageFocalY` values run from 0 to 100. WordPress featured-media dimensions are detected automatically, and WordPress posters default to `contain` so text is not cropped.

## News editor fields

Only `title` is required. Editors may also provide `summary`, `date`, `category`, `image`, `imageAlt`, and `url`. Items appear in the order returned by the CMS. The app supplies safe defaults for omitted category, date, summary, and artwork. Draft, private, trashed, archived, explicitly unpublished, and duplicate records are removed automatically.

The app recognizes both camelCase and snake_case fields, so `imageWidth`/`image_width` and `imageFit`/`image_fit` work without provider-specific mobile code.

The example payload deliberately includes landscape, portrait, square, and missing-image entries. Clients should also tolerate a broken image URL, missing summary, invalid date, long title, duplicate item, empty Jummah shift, unknown extra fields, offline response, non-JSON response, and responses larger than the documented 2 MB client limit.

When the standard ICM WordPress posts endpoint is used, the app also reads the public Friday schedule and latest Friday-announcement image from the ICM homepage. This supplements the old post archive with the current Jummah shifts without requiring administrator credentials. A dedicated canonical endpoint remains the preferred long-term setup.

Do not place WordPress administrator credentials, write tokens, or private API keys in the mobile endpoint. The app only needs anonymous read access.
