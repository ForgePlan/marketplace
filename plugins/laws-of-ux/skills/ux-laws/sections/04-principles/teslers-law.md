## Tesler's Law

**Summary:** For any system there is a certain amount of complexity which cannot be reduced. Also known as the Law of Conservation of Complexity, it states that complexity must be absorbed either by the system or by the user -- and good design shifts that burden to the system.

### Key Takeaways
- All processes have a core of complexity that cannot be designed away and therefore must be assumed by either the system or the user.
- Ensure as much as possible of the burden is lifted from users by dealing with inherent complexity during design and development.
- Remember to not build products and services for an idealized, rational user, because people don't always behave rationally in real life.
- Make guidance accessible and fit within the context of use so that it can help these active new users, no matter what path they choose to take (e.g., tooltips with helpful information).

### Frontend Code Implications
- Absorb complexity in code rather than exposing it to users: auto-detect timezone from `Intl.DateTimeFormat().resolvedOptions().timeZone` instead of asking users to select from a dropdown of 400 timezones. Auto-format currency based on locale with `Intl.NumberFormat`.
- Smart form defaults should handle the complexity: auto-detect credit card type from the first digits (Visa starts with 4, Mastercard 5), auto-format the card number with spaces every 4 digits, and dynamically adjust the CVV field length (3 for Visa/MC, 4 for Amex).
- Provide contextual help via tooltips (`<button aria-describedby="help-tip">`) and inline hints (`<span class="hint">`) for genuinely complex fields rather than expecting users to consult documentation. Use `aria-describedby` to link help text to inputs for accessibility.
- For complex configuration screens (e.g., notification preferences, privacy settings), provide sensible defaults and a "recommended settings" option. Show advanced options behind an expandable "Advanced" section (`<details><summary>Advanced</summary>...</details>`) rather than overwhelming all users with all options.

### Code Review Checklist
- [ ] System auto-detects values where possible (timezone, locale, card type) instead of requiring user selection
- [ ] Complex data entry fields include inline formatting, validation, and contextual help
- [ ] Advanced/expert options are hidden behind progressive disclosure (expandable sections, "Advanced" toggles)
- [ ] Sensible defaults are provided for all optional settings so users can proceed without configuring everything

### Origins
While working for Xerox PARC in the mid-1980s, Larry Tesler realized that the way users interact with applications was just as important as the application itself. Tesler argues that an engineer should spend an extra week reducing the complexity of an application versus making millions of users spend an extra minute using the program because of the extra complexity.

### Examples
- Email clients that auto-detect and configure IMAP/SMTP settings from just an email address, absorbing the complexity of mail server configuration that users would otherwise have to enter manually.
- A tax filing application that auto-imports W-2 data, pre-fills known information, and only asks the user questions that require human judgment, absorbing all the complexity of tax code rules into the system.

### Further Reading
- [Tesler's Law [article]](https://lawsofux.com/articles/2024/teslers-law/) - Jon Yablonski | Laws of UX
- [Tesler's Law: Shift Complexity to Simplify UX [video]](https://www.nngroup.com/videos/teslers-law/) - Lola Famulegun | Nielsen Norman Group
- [Why Life Can't Be Simpler](https://fs.blog/2020/10/why-life-cant-be-simpler/) - Farnam Street
- [8 Design Guidelines for Complex Applications](https://www.nngroup.com/articles/complex-application-design/) - Kate Kaplan | Nielsen Norman Group
- [Explaining the Law of Conservation of Complexity](http://humanist.co/blog/law-of-conservation-of-complexity/) - Michael Calleia | Humanist.co
- [Controls are Choices](https://medium.com/@odannyboy/controls-are-choices-7de90363d0dd) - Dan Saffer | Medium.com
- [Simplicity is Overrated](https://blog.marvelapp.com/simplicity-is-overrated/) - Gabriel Colombo | Marvel
- [Nobody Wants To Use Your Product](https://www.smashingmagazine.com/2016/01/nobody-wants-use-your-product/) - Goran Peuc | Smashing Magazine
- [Law of Conservation of Complexity on Wikipedia](https://en.wikipedia.org/wiki/Law_of_conservation_of_complexity) - Wikipedia
