## Mental Model

**Summary:** A mental model is a compressed representation of how users think a system works, built from prior experience. Designs that match users' existing mental models are intuitive; those that break them create friction and confusion.

### Key Takeaways
- We form a working model in our minds around what we think we know about a system, especially about how it works, and then we apply that model to new situations where the system is similar.
- Match designs to the users' mental models to improve their experience. This enables them to easily transfer their knowledge from one product or experience to another, without the need to first take the time to understand how the new system works.
- Good user experiences are made possible when the design of a product or service is in alignment with the user's mental model. Take for example e-commerce websites, which use consistent patterns and conventions such as product cards, virtual carts and checkout flows in order to conform to users' expectations.
- The task of shrinking the gap between our own mental models and those of the users is one of the biggest challenges we face, and to achieve this goal we use a variety of user research methods (e.g. user interviews, personas, journey maps, empathy maps).

### Frontend Code Implications
- Use standard HTML elements for their intended purpose: `<a>` for navigation, `<button>` for actions, `<input type="checkbox">` for toggles, `<select>` for dropdowns. Custom components that look like standard controls must behave identically (e.g., a custom dropdown must support keyboard navigation with Arrow keys, Enter, and Escape).
- Shopping cart patterns must follow established conventions: cart icon in the top-right with a badge count (`position: relative` with `::after` pseudo-element for the count badge), slide-out cart panel or dedicated `/cart` page, and a linear checkout flow (Cart -> Shipping -> Payment -> Confirmation).
- Use platform-native patterns: on mobile, place primary navigation at the bottom (`position: fixed; bottom: 0`), use swipe gestures for cards/carousels, and place the back button in the top-left. On desktop, keep primary navigation at the top or left sidebar.
- Form patterns should match expectations: required fields marked with `*` and `aria-required="true"`, inline validation on blur (`@blur` event), and error messages displayed directly below the input with `role="alert"`.

### Code Review Checklist
- [ ] Standard HTML elements are used for their intended purpose (no `<div onclick>` instead of `<button>`)
- [ ] Custom interactive components support expected keyboard interactions (Enter, Escape, Arrow keys)
- [ ] Navigation placement follows platform conventions (top/sidebar on desktop, bottom tab bar on mobile)
- [ ] Common patterns (search, cart, forms, modals) follow widely established UX conventions

### Origins
The notion of a mental model was originally postulated by the psychologist Kenneth Craik in the 1943 book *The Nature of Explanation*. He proposed that people carry in their minds a small-scale model of how the world works. These models are used to anticipate events, reason, and form explanations.

### Examples
- E-commerce websites use consistent patterns and conventions such as product cards, virtual carts, and checkout flows in order to conform to users' expectations built from years of online shopping experience.
- Form toggles, radio inputs, and buttons originated from the design of their tactile counterparts, leveraging the mental models users already have from physical interfaces.

### Further Reading
- [Mental Models: An Interdisciplinary Synthesis of Theory and Methods](https://www.jstor.org/stable/26268859) - Natalie A. Jones, Helen Ross, Timothy Lynam, Pascal Perez, Anne Leitch | JSTOR
- [Mental Models in User Experience Design](https://www.nngroup.com/articles/mental-models/) - Megan Chan and Jakob Nielsen | Nielsen Norman Group
- [Familiar vs Novel](https://lawsofux.com/articles/2024/familiar-vs-novel/) - Jon Yablonski | Laws of UX
- [Mental Models](https://thedecisionlab.com/reference-guide/design/mental-models) - Dr. Lauren Braithwaite | The Decision Lab
