Thank you for your contribution! Please fill out the short checklist below before requesting review.

Summary

- Brief description of the change and why it is needed.

CI & tests

- This repository runs CI on pull requests. Note: GitHub evaluates workflow files from the base branch, so a workflow added only in your feature branch may not run on the PR until the workflow exists in `main`.
- If you want CI to run for pushes to your feature branch immediately, include a `push` trigger in your workflow or run tests locally:
  - npm install
  - npm test

Branch cleanup

- We use GitHub's native "Automatically delete head branches" option. If you prefer the repo to delete merged branches automatically, enable that in the repository Settings > Options.
- If your org requires an automated branch-deletion action, note that the maintainers will review and add it.

Checklist

- I added tests (if applicable) or verified existing tests pass locally.
- I updated documentation when changing behavior or CI requirements.
- I confirmed the branch can be deleted after merge (or noted why it should be retained).

Linked issues / PRs

- Fixes: # (issue number)

Optional notes for reviewers

- Any extra context, manual steps for verification, or deployment notes.
