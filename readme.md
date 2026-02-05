Q. 1. Where AI saved time.
******************************
ANS:
AI saved significant time during the initial structure and repetitive logic of the project.
Instead of manually writing boilerplate HTML and JavaScript for layouts, event listeners, and localStorage handling, I used AI to quickly generate a solid starting point. This allowed me to focus more on custom logic, UX decisions, and debugging rather than syntax setup.

Examples:

Generating the base HTML layout with semantic elements

Creating starter functions for deck and card CRUD operations

Drafting keyboard shortcut handling logic

This accelerated development while still allowing me to fully understand and customize the code.

//////////////////////////////////////////////////////////////////////////////////////////////

Q.2. At least one AI bug you identified and how you fixed it.
**********************************************************
ANS:

AI-generated logic loaded the same JavaScript file (app.js) twice, once in the <head> and once at the bottom of the HTML file. This caused:

2nd part app was working well but as soon as I used  prompt from part3 it updated all code and app was messed ,was not working  

it added Duplicate event listeners

added Buttons triggering actions twice

Unexpected state updates

Fix:
I removed the duplicate script reference and ensured all scripts were loaded once using defer.

<!-- Fixed: app.js loaded only once -->
<script src="app.js" defer></script>


This resolved the duplicated behavior and stabilized the app’s event handling.
//////////////////////////////////////////////////////////////////////////////////////////////

Q.3. :A code snippet you refactored for clarity.
***************************************************
ANS:

Before (AI-generated, harder to read):

if (deck && deck.cards && deck.cards.length > 0) {
  currentCardIndex = currentCardIndex >= deck.cards.length ? 0 : currentCardIndex;
}


After (Refactored for clarity):

if (!deck || deck.cards.length === 0) return;

currentCardIndex =
  currentCardIndex >= deck.cards.length ? 0 : currentCardIndex;


This refactor:

Uses an early return

Removes unnecessary nested conditions

Makes intent clearer and easier to maintain
///////////////////////////////////////////////////////////////////////////////////////////

Q.4. One accessibility improvement you added.
************************************************

I added keyboard accessibility and screen-reader feedback to improve usability.

Example:

Implemented a “Skip to main content” link for keyboard users

Added aria-live="polite" to announce deck changes and card progress

Ensured all interactive elements are reachable via keyboard

<a href="#main-content" class="skip-to-main">Skip to main content</a>


This ensures users relying on assistive technologies can navigate the app effectively.

///////////////////////////////////////////////////////////////////////////////////

Q.5. What prompt changes improved AI output.Where AI saved time.
**************************************************************
ANS:

Initially, generic prompts produced overly complex or incorrect code.
I improved results by making prompts more specific and contextual.

Before:

“Create JavaScript for a flashcard app”

After:

“Create vanilla JavaScript functions for managing flashcard decks using localStorage, with keyboard accessibility and no frameworks.”

This change:

Reduced unnecessary complexity

Improved alignment with project constraints

Produced cleaner, more maintainable code
#////////////////////////////////////////////////////////////////////////////////////////////////////////////#
#                                                                                                            #
#                               Thank you                                                                    #
#////////////////////////////////////////////////////////////////////////////////////////////////////////////#