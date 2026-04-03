## Law of Uniform Connectedness

**Summary:** Elements that are visually connected are perceived as more related than elements with no connection. Lines, borders, colors, and shared backgrounds create strong relational cues between interface elements.

### Key Takeaways
- Group functions of a similar nature so they are visually connected via colors, lines, frames, or other shapes.
- Alternately, you can use a tangible connecting reference (line, arrow, etc) from one element to the next to also create a visual connection.
- Use uniform connectedness to show context or to emphasize the relationship between similar items.

### Frontend Code Implications
- Use shared background colors on related elements: apply `background-color: var(--color-surface-secondary)` to a parent container wrapping related items (e.g., a "featured snippet" card within search results, a group of related settings).
- Connect step-based flows visually using a progress connector line: a `<div>` with `height: 2px; background: var(--color-border)` between step indicators, or use `border-left: 2px solid var(--color-border)` for vertical timelines and activity feeds.
- Use consistent `border: 1px solid var(--color-border)` on containers that group related items (e.g., a video result card within a search results list) to visually separate them from surrounding content while connecting their internal elements.
- For tree views or nested lists, use `padding-left: 24px` with a `border-left: 1px solid var(--color-border)` to visually connect child items to their parent through an indentation line.

### Code Review Checklist
- [ ] Related items share a visual connector (shared background, border, or connecting line)
- [ ] Step indicators in multi-step flows are connected with a visible line or progress bar
- [ ] Nested/hierarchical content uses indentation with a visible guide line (border-left or similar)
- [ ] Visual connections are perceivable without color alone (use borders or lines in addition to background color)

### Origins
The principles of grouping (Gestalt laws of grouping) were first proposed by Gestalt psychologists to account for the observation that humans naturally perceive objects as organized patterns. These principles are organized into categories including Proximity, Similarity, Continuity, Closure, and Connectedness.

### Examples
- *Google Search Results:* The Law of Uniform Connectedness can be seen within Google's search results with borders that surround specific items such as videos and "featured snippets". This border helps to visually connect the content and also separate it from other results by giving it a bit more priority.

### Further Reading
- [Gestalt Principles of Perception](http://www.andyrutledge.com/gestalt-principles-3.html) - Andy Rutledge
- [Laws of Proximity, Uniform Connectedness, and Continuation](https://www.interaction-design.org/literature/article/laws-of-proximity-uniform-connectedness-and-continuation-gestalt-principles-2) - Interaction Design Foundation | Mads Soegaard
- [Design Principles: Visual Perception And The Principles Of Gestalt](https://www.smashingmagazine.com/2014/03/design-principles-visual-perception-and-the-principles-of-gestalt/) - Steven Bradley | Smashing Magazine
