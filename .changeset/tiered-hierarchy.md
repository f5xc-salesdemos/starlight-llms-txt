---
"@f5xc-salesdemos/starlight-llms-txt": minor
---

Add auto-tiered `.txt` hierarchy for progressive AI discovery. Every hint link in `llms.txt` now points to a `.txt` file. Content lives only at leaf nodes; intermediate tiers contain metadata hints. Replaces `customSets` and `perPageMarkdown` with a single `tieredHierarchy` option (enabled by default).
