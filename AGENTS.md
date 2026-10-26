# Frontend Engineering Standards

## Architecture
- Use React, TypeScript, Vite, and reusable components.
- Keep components small and focused; separate UI, hooks, utilities, and API services.
- Use strict TypeScript types and avoid `any` unless justified.
- Keep dependencies minimal and document architectural decisions.

## Design
- Use shadcn/ui and Tailwind CSS consistently.
- Establish a coherent design system with accessible color contrast, typography, spacing, and reusable tokens.
- Support mobile, tablet, and desktop layouts.
- Support light and dark themes where appropriate.
- Include loading, error, empty, disabled, and success states.
- Use semantic HTML, keyboard navigation, visible focus indicators, and accessible form labels.
- Avoid excessive animations, gradients, unnecessary effects, and generic dashboard layouts.

## Functionality
- Every interactive control must have a real, appropriate action.
- Validate forms and show useful errors.
- Use typed API clients and handle network failures.
- Never hardcode fake production data or expose private credentials.
- Store secrets only in appropriate environment variables; remember that Vite variables prefixed with VITE_ are public to browser code.

## Testing
- Use Playwright MCP to inspect actual browser behavior.
- Test primary user journeys, navigation, form validation, keyboard accessibility, and responsive layouts.
- Run available lint, type-check, unit-test, and production-build commands.
- Fix failures and rerun the relevant checks.
- Never report tests as passed unless they were actually executed.


## Delivery
- Work incrementally and inspect existing files before changing them.
- Avoid overwriting user work without approval.
- Summarize changed files, dependencies, executed tests, failures, and remaining limitations.
- Do not claim production readiness based on a successful build alone.

# AI/ML Engineering Standards

For every AI/ML project, inspect the workspace and available tools before making changes.

1. Use Hugging Face MCP to discover relevant models, datasets, papers and documentation when available.
2. Use GitHub MCP for repository context when connected and authorized.
3. Never claim that a dataset, model, GPU or MCP tool was accessed unless it was actually verified.
4. Select Python libraries based on the task. Do not install every ML framework by default.
5. Create an isolated virtual environment and a reproducible dependency file.
6. Validate dataset provenance, licenses, labels, quality and data leakage risks.
7. Establish a baseline and a suitable evaluation protocol before tuning models.
8. Track experiments and preserve the best model with its configuration and evaluation results.
9. Separate data preparation, training, evaluation, inference and serving code.
10. Add input validation, meaningful logs, tests and safe error handling.
11. Use Playwright MCP for browser-based application tests, not as a substitute for model evaluation.
12. Report actual results, hardware requirements, known limitations and remaining deployment work.
13. Protect credentials, sensitive datasets and model artifacts.
14. Never fabricate accuracy, test results or successful deployment.

Before coding, provide the problem definition, candidate datasets, baseline model, metrics, dependencies and implementation plan. Proceed incrementally and verify each stage.
