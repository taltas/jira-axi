# Jira CLI Benchmark Results

## Status

Results: pending. No benchmark matrix was run because Jira authentication was
unavailable in the validation environment:

- `jira me` requested a Jira API token.
- The local `jira-axi issue list` reported `CONFIG_REQUIRED` for
  `JIRA_BASE_URL`, `JIRA_EMAIL`, and `JIRA_API_TOKEN`.
- `opencode run "reply ready"` succeeded.

No comparison numbers are reported or implied.

Run the authenticated matrix with three repeats:

```sh
pnpm --dir bench-jira run bench -- matrix --repeat 3
```

Then review `bench-jira/results/report.md` before replacing this published
report. Mutation tasks are excluded unless `--include-mutations` is supplied
with an explicit `JIRA_BENCH_PROJECT_KEY`.
