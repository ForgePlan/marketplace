## Doherty Threshold

**Summary:** Productivity soars when a computer and its users interact at a pace (<400ms) that ensures neither has to wait on the other. System feedback within 400ms keeps users engaged and in a productive flow state.

### Key Takeaways
- Provide system feedback within 400 ms in order to keep users' attention and increase productivity.
- Use perceived performance to improve response time and reduce the perception of waiting.
- Animation is one way to visually engage people while loading or processing is happening in the background.
- Progress bars help make wait times tolerable, regardless of their accuracy.
- Purposefully adding a delay to a process can actually increase its perceived value and instill a sense of trust, even when the process itself actually takes much less time.

### Frontend Code Implications
- API responses must show a loading state within 100ms. Use skeleton screens (`background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite`) for content loading instead of blank screens or full-page spinners.
- Button clicks must provide immediate visual feedback: apply `opacity: 0.7` and a loading spinner within 50ms of click. Use `transition: opacity 0.15s ease` for the state change. Disable the button with `pointer-events: none` to prevent double-submission.
- Animations and transitions should complete within 200-400ms. Use `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)` for standard UI transitions. Page-to-page transitions should not exceed 300ms.
- For operations exceeding 1 second, show a determinate progress bar (`<progress>` element or custom bar with `width` animated via JS). For operations exceeding 10 seconds, add estimated time remaining text.

### Code Review Checklist
- [ ] All API calls display a loading indicator within 100ms (skeleton screen, spinner, or button loading state)
- [ ] Interactive elements provide immediate visual feedback on click/tap (within 50ms)
- [ ] CSS transitions and animations complete within 200-400ms
- [ ] Operations longer than 1s show a progress bar; operations longer than 10s show estimated time remaining

### Origins
In 1982 Walter J. Doherty and Ahrvind J. Thadani published a research paper in the IBM Systems Journal that set the requirement for computer response time to be 400 milliseconds, not 2,000ms which had been the previous standard. When a command was executed and returned under 400ms, it exceeded the Doherty threshold, and use of such applications was deemed "addicting" to users.

### Examples
- A search-as-you-type interface that shows results within 200ms of keystroke, using debounced API calls and optimistic UI updates to maintain the perception of instantaneous response.
- An e-commerce checkout that shows a skeleton screen for the payment confirmation page while the backend processes the transaction, then reveals content with a smooth fade-in.

### Further Reading
- [The Economic Value of Rapid Response Time](https://jlelliotton.blogspot.ca/p/the-economic-value-of-rapid-response.html) - Jim Elliott
- [This 70s UX gem still applies today](https://medium.com/@Gugel/the-doherty-threshold-5471ca990de6) - Michael Gugel | Medium
- [The Economic Value of Rapid Response Time](https://daverupert.com/2015/06/doherty-threshold/) - Dave Rupert
- [The importance of percent-done progress indicators for computer-human interfaces](https://www.researchgate.net/publication/234791131_The_importance_of_percent-done_progress_indicators_for_computer-human_interfaces) - Brad A. Myers
- [Response time in man-computer conversational transactions](http://yusufarslan.net/sites/yusufarslan.net/files/upload/content/Miller1968.pdf) - Robert B. Miller
