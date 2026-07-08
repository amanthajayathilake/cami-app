# Cami Engineering Challenge

Thanks for taking the time to complete this challenge.

At Cami, we care about practical engineering ability, product thinking, good judgement, and how effectively engineers use AI tools in their workflow.

You are encouraged to use AI tools such as Cursor, GitHub Copilot, Claude Code, ChatGPT, or similar. We are not testing whether you can code without AI. We are interested in how you use AI, how you review its output, and how you make engineering decisions.

## Timebox

Please spend no more than 3–4 hours on this challenge.

We do not expect perfection. We are looking for clear thinking, useful progress, and maintainable code.

## Scenario

This repository contains a small Node.js API for handling customer requests.

The API is incomplete and has a few issues. Your task is to improve it and ship a small feature as if you were contributing to a real startup codebase.

## Your tasks

Please complete the following:

1. Get the project running locally.
2. Fix the build or CI configuration so the pull request validation can run successfully.
3. Fix any failing tests.
4. Add an endpoint for classifying a customer request.
5. Add appropriate validation and error handling.
6. Add or update tests for your changes.
7. Update the README with setup and usage instructions.
8. Copy `AI_USAGE_TEMPLATE.md` to `AI_USAGE.md` and briefly explain how you used AI during the task.

## Feature requirement

Add a new endpoint:

`POST /requests/classify`

The endpoint should accept:

```json
{
  "message": "I need help changing my payment method"
}
```

It should return:

```json
{
  "category": "billing",
  "confidence": 0.8
}
```

Valid categories are:

- `support`
- `sales`
- `billing`
- `unknown`

You do not need to call a real AI model. You may implement a simple classifier, a mock AI service, or a clean abstraction that could later be connected to an AI provider.

## What we are looking for

We will review:

- Code quality
- Problem solving
- Testing approach
- Simplicity of design
- Error handling
- Documentation
- AI usage and judgement
- Ability to prioritise within a timebox

## Submission

Please submit your work as a pull request in your own private repository.

Clone this public starter repository, create a new private repository under your own GitHub account or organisation, push the starter code to it, create a branch for your work, and open a pull request from your branch into the `main` branch of your private repository.

Do not open a pull request against the central Cami starter repository or submit your solution in a public fork.

Invite the Cami reviewer to your private repository or send the repository and pull request link when you are ready for review.

Your PR should include:

- A clear summary of what you changed
- Any assumptions you made
- Tests you added or updated
- Anything you would improve with more time
- Your `AI_USAGE.md` file
