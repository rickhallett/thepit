+++
title = "Building a Terminal Aesthetic in Next.js: Tokyo Night Theme Implementation"
author = "Richard Hallett"
date = "2025-01-20"
description = "How I implemented a cohesive terminal-inspired design system in a Next.js 15 application using Tailwind CSS v4 and the Tokyo Night color palette."
categories = ["Engineering", "Web Development"]
tags = ["next.js", "tailwind", "design system", "tokyo night", "typescript"]
draft = false
+++

# Building a Terminal Aesthetic in Next.js

When I decided to rebrand oceanheart.ai with an engineering-first identity, I wanted the design to reflect my work as a builder. Not another generic SaaS template—something that said "I ship code."

The terminal aesthetic felt right. It's the interface where software actually gets built.

## The Tokyo Night Palette

I chose [Tokyo Night](https://github.com/enkia/tokyo-night-vscode-theme) as the foundation. It's a popular VS Code theme with a sophisticated color palette that works well at scale.

Here's the core palette:

```css
:root {
  --tokyo-bg-primary: #1a1b26;
  --tokyo-bg-secondary: #16161e;
  --tokyo-bg-tertiary: #1f2335;
  --tokyo-text-primary: #c0caf5;
  --tokyo-text-secondary: #9aa5ce;
  --tokyo-cyan: #7dcfff;
  --tokyo-blue: #7aa2f7;
  --tokyo-purple: #bb9af7;
  --tokyo-green: #9ece6a;
  --tokyo-orange: #ff9e64;
  --tokyo-red: #f7768e;
}
```

## Tailwind v4 Theme Integration

Tailwind CSS v4 changed how custom colors work. Instead of extending the config file, you add colors directly to a `@theme inline` block in your CSS:

```css
@import "tailwindcss";

@theme inline {
  /* Tokyo Night Terminal Theme Colors */
  --color-terminal: var(--tokyo-text-primary);
  --color-terminal-secondary: var(--tokyo-text-secondary);
  --color-terminal-muted: #565f89;
  --color-terminal-bg: var(--tokyo-bg-primary);
  --color-terminal-bg-secondary: var(--tokyo-bg-secondary);
  --color-terminal-bg-tertiary: var(--tokyo-bg-tertiary);
  --color-terminal-cyan: var(--tokyo-cyan);
  --color-terminal-blue: var(--tokyo-blue);
  --color-terminal-purple: var(--tokyo-purple);
  --color-terminal-green: var(--tokyo-green);
  --color-terminal-orange: var(--tokyo-orange);
  --color-terminal-red: var(--tokyo-red);
}
```

This generates utility classes automatically: `bg-terminal-bg`, `text-terminal-cyan`, etc.

## The Terminal Typography System

I use JetBrains Mono for all terminal-style text. In Next.js, configure it in your root layout:

```typescript
import { JetBrains_Mono, Inter } from "next/font/google";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});
```

Then create a utility class:

```css
.font-terminal {
  font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
}
```

## Terminal-Style Section Headers

Every section starts with a command prompt. It's a small detail that reinforces the aesthetic:

```tsx
<p className="font-terminal text-terminal-muted text-sm mb-4">
  <span className="text-terminal-green">$</span> cat ./about/kai.md
</p>
<h1 className="font-terminal text-3xl text-terminal">
  Kai Hallett
</h1>
```

The green `$` prompt followed by a plausible command creates consistency across the site.

## Card Components with Terminal Styling

For project cards and content containers, I use a consistent pattern:

```tsx
<div className="p-6 bg-terminal-bg-secondary border border-white/10 rounded-sm
                hover:border-terminal-cyan/30
                hover:shadow-[0_0_20px_rgba(125,207,255,0.1)]
                transition-all duration-200">
  <span className="font-terminal text-xs text-terminal-green">
    [production]
  </span>
  <h3 className="font-terminal text-lg text-terminal mt-2">
    Project Name
  </h3>
  <p className="text-terminal-secondary text-sm">
    Description here.
  </p>
</div>
```

Key elements:
- Status badges in square brackets like `[production]`
- Subtle border hover effects with cyan glow
- Consistent spacing and typography

## The Ambient Glow Effect

To add depth without being distracting, I use blurred gradient circles:

```tsx
<div className="absolute top-10 left-0 w-96 h-96
                bg-terminal-cyan/10 rounded-full blur-3xl" />
<div className="absolute bottom-10 right-0 w-80 h-80
                bg-terminal-purple/10 rounded-full blur-3xl" />
```

These create subtle color variation in the background without drawing attention away from the content.

## Component Organization

I keep all terminal-specific components in a dedicated folder:

```
src/components/terminal/
├── ASCIILogo.tsx
├── TerminalHero.tsx
├── TerminalPortfolioCard.tsx
└── index.ts
```

The barrel export makes imports clean:

```typescript
import { TerminalHero, TerminalPortfolioCard } from "@/components/terminal";
```

## Performance Considerations

A few things to keep in mind:

**1. Font Loading**
Use `display: "swap"` to avoid invisible text while fonts load. The fallback to `ui-monospace` keeps the aesthetic consistent during the swap.

**2. Animation Restraint**
I use Framer Motion for entrance animations, but keep them subtle—a 20px translateY with 0.6s duration. Nothing that screams "look at me."

**3. Color Consistency**
Having everything reference CSS variables means you can adjust the entire palette from one place. When I inevitably want to tweak the exact shade of cyan, it's a single line change.

## The Result

The terminal aesthetic accomplishes what I wanted:
- Immediately signals "this person builds software"
- Creates visual distinction from generic templates
- Maintains readability and professionalism
- Scales consistently across pages

It's not about being flashy—it's about authenticity. The interface you use to build software is now the interface that represents your work.

---

*Want to see the full implementation? The entire codebase is on [GitHub](https://github.com/rickhallett).*
