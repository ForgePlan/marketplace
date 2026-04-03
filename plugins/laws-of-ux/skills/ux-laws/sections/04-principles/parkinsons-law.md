## Parkinson's Law

**Summary:** Any task will inflate until all of the available time is spent. In UX, reducing the perceived and actual time needed to complete tasks keeps users focused and prevents abandonment.

### Key Takeaways
- Limit the time it takes to complete a task to what users expect it'll take.
- Reducing the actual duration to complete a task from the expected duration will improve the overall user experience.
- Leverage features such as autofill to save the user time when providing critical information within forms. This allows for quick completion of purchases, bookings and other such functions while preventing task inflation.

### Frontend Code Implications
- Add `autocomplete` attributes to all form inputs: `autocomplete="name"`, `autocomplete="email"`, `autocomplete="cc-number"`, `autocomplete="address-line1"`, etc. This allows browser autofill to complete forms in seconds instead of minutes.
- Implement smart defaults and pre-selection: pre-select the most common country in address forms based on GeoIP (`<option selected>`), default date pickers to today's date, and pre-check the most popular shipping option.
- For multi-step forms, show a time estimate ("Takes about 2 minutes") and a step counter ("Step 2 of 4") to set expectations and constrain the perceived scope. Place this at the top with `position: sticky; top: 0; z-index: 10`.
- Use input masks and formatting helpers to speed up data entry: phone number mask (`(___) ___-____`), credit card grouping (`____ ____ ____ ____`), and auto-advancing focus between segmented inputs (e.g., OTP codes) using `inputmode="numeric"` and JS `focus()` on the next field.

### Code Review Checklist
- [ ] All form inputs include appropriate `autocomplete` attributes for browser autofill
- [ ] Common selections have smart defaults pre-selected (country, date, shipping method)
- [ ] Multi-step processes display estimated completion time and step progress
- [ ] Input masks and auto-advance are implemented for structured data entry (phone, credit card, OTP)

### Origins
Articulated by Cyril Northcote Parkinson as part of the first sentence of a humorous essay published in The Economist in 1955, it was reprinted with other essays in the book *Parkinson's Law: The Pursuit of Progress* (London, John Murray, 1958). He derived the dictum from his extensive experience in the British Civil Service.

### Examples
- A checkout flow with `autocomplete` attributes that allows browser autofill to complete the entire address and payment form in 2 clicks rather than 2 minutes of typing.
- An appointment booking form that pre-selects the nearest available date and time slot, rather than showing an empty calendar that requires users to browse through dates.

### Further Reading
- [Parkinson's Law on Wikipedia](https://en.wikipedia.org/wiki/Parkinson%27s_law) - Wikipedia
- [Parkinson's Law: Why Constraints Are The Best Thing You Can Work With](https://medium.com/the-mission/parkinsons-law-why-constraints-are-the-best-thing-you-can-work-with-4fad6e0e91cf) - Louis Chew | Medium.com
