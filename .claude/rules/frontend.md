# Frontend Rules

Drip Nation is an editorial streetwear experience, not a generic SaaS dashboard.

Preserve:

- typography
- visual hierarchy
- imagery
- interaction design
- animation language
- brand character

unless the task explicitly requests a redesign.

Every UI feature should consider:

- mobile
- tablet
- desktop
- accessibility
- keyboard navigation
- loading
- error
- empty
- reduced-motion states

Do not introduce a frontend framework or rewrite the application architecture without an explicit architectural decision.

Before changing shared JavaScript:

1. Determine which HTML pages import the file.
2. Check both `js/` and `assets/js/`.
3. Determine whether the implementations differ.
4. Check for duplicate behavior.
5. Only then modify or consolidate them.
