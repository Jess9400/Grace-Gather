# Daily publisher links

This implementation features at most one previously unfeatured publisher link
per UTC day. It is not an import of newly written daily stories: Christian Faith
Stories says it adds a story about once a week, and most of its library is older.
Its original stories are shared with permission, but the site notes exceptions;
this integration links to publisher PDFs rather than copying their content.
Articles are not automatically reviewed by Grace & Gather. More trusted sources,
editorial quality checks, alerting, accessibility and real-world end-to-end
testing are still needed before treating this as the requested finished feed.

Older stories new to the app were approved on 10 November 2026. The migration
expects a deployment-specific Vault entry named
`daily_story_project_url`; it intentionally does not hard-code a project URL.
Without that setting the scheduler cannot call the function.

The scheduled endpoint accepts no story data and reads only the hard-coded
publisher catalogue. A service-only database lease permits one fetch attempt
per 50 minutes and at most one publication per UTC day. This avoids sending a
reusable secret through `pg_net`'s request queue. Monitor HTTP responses and
expiry of the source's library; the job cannot promise a new story on days when
the source is unavailable or its catalogue is exhausted.

Source information: https://christianfaithstories.org/faq/
Catalogue: https://christianfaithstories.org/library-of-devotional-stories/
