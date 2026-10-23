# Agent Guidelines

## UI copy

- Cut taglines, helper text and secondary labels. If a screen needs them to make sense, fix the layout. Exception: keep legal, consent, pricing, accessibility and error text.
- Before adding complexity for a speculative or very unlikely race condition or security edge case, explain the concrete failure mode, how likely it is, and the complexity cost, and get Steve's OK. Don't silently expand scope for theoretical robustness. Exception: real risks to payments, auth/login, and private user data get fixed without waiting.
