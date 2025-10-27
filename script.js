// ... existing code ... -->
    const app = {
        // MODIFIED: Deck is now an object with title, cards, and settings
// ... existing code ... -->
        isAnimating: false,
        draggedItem: null, // For drag and drop
        createMode: 'manual', // 'manual' or 'paste'
        touchStartX: 0, // NEW: For swipe gestures
        touchStartY: 0  // NEW: For swipe gestures
    };

    // --- DOM ELEMENTS ---
// ... existing code ... -->
        dom.navButtons.forEach(button => {
            button.addEventListener('click', () => setMode(button.dataset.mode));
        });

        // Flashcard controls
        dom.flashcardContainer.addEventListener('click', () => {
// ... existing code ... -->
            if (!app.isAnimating) { // Don't flip while fading
                dom.flashcardContainer.classList.toggle('is-flipped');
            }
        });
        // NEW: Add swipe gesture listeners
        dom.flashcardContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
        dom.flashcardContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
        
        dom.prevCardButton.addEventListener('click', showPrevCard);
        dom.nextCardButton.addEventListener('click', showNextCard);
// ... existing code ... -->
    // MODIFIED: Re-written to fix animation bug.
    function showPrevCard() {
        // MODIFIED: Use studyDeck
// ... existing code ... -->
            void dom.flashcardContainer.offsetWidth; 

            // 7. Remove class to re-enable flip animation for next click
            // dom.flashcardContainer.classList.remove('no-flip-animation'); // <-- OLD POSITION
            
            // 8. Fade in
            dom.flashcardContainer.style.opacity = 1;

            // 9. Allow new animations
            setTimeout(() => {
                app.isAnimating = false;
                // NEW POSITION: Remove class *after* fade-in is complete
                dom.flashcardContainer.classList.remove('no-flip-animation');
            }, 200); // Wait for fade in
        }, 200); // Wait for fade out
    }

    // MODIFIED: Re-written to fix animation bug.
    function showNextCard() {
        // MODIFIED: Use studyDeck
// ... existing code ... -->
            void dom.flashcardContainer.offsetWidth; 

            // 7. Remove class to re-enable flip animation for next click
            // dom.flashcardContainer.classList.remove('no-flip-animation'); // <-- OLD POSITION
            
            // 8. Fade in
            dom.flashcardContainer.style.opacity = 1;
            
            // 9. Allow new animations
            setTimeout(() => {
                app.isAnimating = false;
                // NEW POSITION: Remove class *after* fade-in is complete
                dom.flashcardContainer.classList.remove('no-flip-animation');
            }, 200); // Wait for fade in
        }, 200); // Wait for fade out
    }

    // --- LEARN MODE ---
// ... existing code ... -->
        }
    }

    // --- NEW: URL-Safe Base64 Handlers ---

    /**
// ... existing code ... -->
     * @returns {string} The decoded string.
     */
    function urlSafeAtob(str) {
// ... existing code ... -->
        }
    }


    // --- START THE APP ---
    init();

    // --- NEW: Drag and Drop Handlers ---

// ... existing code ... -->
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // --- NEW: Swipe Gesture Handlers ---

    function handleTouchStart(e) {
        // Get the "original" touch point, not one that's changed
        const firstTouch = e.touches[0];
        app.touchStartX = firstTouch.clientX;
        app.touchStartY = firstTouch.clientY;
    }

    function handleTouchEnd(e) {
        // If animating, don't allow swipe
        if (app.isAnimating) return;

        // Get the touch end point
        const endTouch = e.changedTouches[0];
        const endX = endTouch.clientX;
        const endY = endTouch.clientY;

        const diffX = app.touchStartX - endX;
        const diffY = app.touchStartY - endY;

        // Check if it was a horizontal swipe (not vertical)
        if (Math.abs(diffX) > Math.abs(diffY)) {
            // Check if swipe distance is significant
            if (diffX > 50) {
                // Swiped left (show next card)
                showNextCard();
            } else if (diffX < -50) {
                // Swiped right (show previous card)
                showPrevCard();
            }
        }
    }

});

