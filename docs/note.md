## Goal
Build an application that has an AI perform code review on a PR, lets the user cherry-pick only the valuable findings from the review list, and applies them to the PR as review comments.

## Background
AI code review is convenient, but it still sometimes generates unnecessary review comments.
Even when an AI reviews a PR from a junior engineer, the reviewee cannot judge whether the review is good or bad. Because of that, a senior engineer still has to review it, but reviewing everything in detail is a heavy burden — so I want to build an app that semi-automates that part.

## Design
- Dark theme
- Dashboard
- Simple
- Stylish and cool

## Required features
- Log in to GitHub to enable GitHub operations
  - Not needed if the Claude Agent SDK can integrate with Claude Code and reuse its auth (e.g. `gh`)
- View a per-repository list of PRs on GitHub
- Select a PR and run the review automatically by pressing a button
- Show the AI's review findings and their target code in a list
- Press a button to apply the selected review comments to the PR as review comments
- Adjust the review prompt sent to the AI
  - What to prioritize when reviewing, and from what perspective to review
  - Enter the prompt as text
