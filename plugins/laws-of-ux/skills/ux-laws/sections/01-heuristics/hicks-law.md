## Hick's Law

**Summary:** The time it takes to make a decision increases with the number and complexity of choices. Reducing and organizing options helps users decide faster and reduces cognitive load.

### Key Takeaways
- Minimize choices when response times are critical to decrease decision time.
- Break complex tasks into smaller steps in order to decrease cognitive load.
- Avoid overwhelming users by highlighting recommended options.
- Use progressive onboarding to minimize cognitive load for new users.
- Be careful not to simplify to the point of abstraction.

### Frontend Code Implications
- Navigation menus should show a maximum of 7 (plus or minus 2) top-level items. Use progressive disclosure (mega menus, expandable submenus) for deeper content. Implement with `<nav>` containing a flat list of primary items and nested `<ul>` for subcategories.
- Multi-step forms (wizard/stepper pattern) should break decisions into sequential screens with 2-4 choices per step. Show a progress indicator (`<progress>` or step dots) so users know where they are. Each step should have one clear primary action button.
- For onboarding flows, reveal features progressively rather than showing everything at once. Start with core functionality visible, and introduce advanced features through contextual tooltips (`title` attributes or custom tooltip components) triggered by user actions.
- Highlight recommended or default options with visual emphasis: `font-weight: 700`, a distinct background color, or a badge element. In settings panels, group related options under collapsible `<details>` elements to reduce visible complexity.

### Code Review Checklist
- [ ] Top-level navigation has no more than 7 (plus or minus 2) visible items
- [ ] Complex forms are broken into multi-step flows with a progress indicator
- [ ] Recommended/default options are visually distinguished from alternatives
- [ ] Settings and configuration panels use collapsible sections or tabs to reduce visible option count

### Origins
Hick's Law (or the Hick-Hyman Law) is named after British psychologist William Edmund Hick and American psychologist Ray Hyman. In 1952, they examined the relationship between the number of stimuli present and an individual's reaction time, finding that more stimuli leads to longer decision times.

### Examples
- **Google Homepage:** Google keeps decisions required to enter a keyword to a minimum by eliminating any additional content that could distract from the act of typing a keyword or require additional decision-making.
- **Apple TV Remote:** Apple TV remotes don't require a substantial amount of working memory and therefore incur much less cognitive load. By transferring complexity to the TV interface itself, information can be effectively organized and progressively disclosed within menus.
- **Slack's Progressive Onboarding:** Instead of dropping users into a fully featured app after a few onboarding slides, Slack uses a bot to engage users and prompt them to learn the messaging feature consequence-free. To prevent new users from feeling overwhelmed, Slack hides all features except for the messaging input. Once users have learned how to message via Slackbot, they are progressively introduced to additional features.

### Further Reading
- [UX Psychology: Google Search](https://lawsofux.com/articles/2020/ux-psychology-google-search/) - Jon Yablonski
- [The Choice Overload Effect: Why simplicity is the key to perfecting your experience](https://medium.com/choice-hacking/choice-overload-why-simplicity-is-the-key-to-winning-customers-2f8e239eaba6) - Jennifer Clinehens | Medium
- [Hick's Law: Making the choice easier for users](https://www.interaction-design.org/literature/article/hick-s-law-making-the-choice-easier-for-users) - Mads Soegaard | Interaction Design Foundation
- [Hick's Law -- Quick Decision Making](https://uxplanet.org/design-principles-hicks-law-quick-decision-making-3dcc1b1a0632) - Anton Nikolov | Medium.com
- [The Psychology Principles Every UI/UX Designer Needs to Know](https://blog.marvelapp.com/psychology-principles-every-uiux-designer-needs-know/) - Thanasis Rigopoulos | Marvel
- [Hick's Law on Wikipedia](https://en.wikipedia.org/wiki/Hick%27s_law) - Wikipedia
