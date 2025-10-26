document.addEventListener('DOMContentLoaded', () => {

    // --- STATE ---
    const app = {
        // MODIFIED: Deck is now an object with title, cards, and settings
        currentDeck: {
            title: '',
            cards: [],
            settings: {
                shuffle: false,
                termFirst: true
            }
        },
        studyDeck: [], // A (potentially shuffled) copy of cards for studying
        learnSessionCards: [], // Cards for the current learn session
        typeSessionCards: [], // NEW: Cards for the current type session
        currentCardIndex: 0,
        currentMode: 'flashcards', // 'flashcards', 'learn', 'type', 'create', 'empty'
        currentLearnCard: null,
        currentTypeCard: null, // NEW
        lastTypeCard: null, // NEW: For the override button
        progressData: new Map(), // Stores progress keyed by 'term|definition'
        localStorageKey: 'flashcardAppProgress',
        themeKey: 'flashcardAppTheme',
        toastTimeout: null,
        isAnimating: false,
        draggedItem: null, // For drag and drop
        createMode: 'manual' // 'manual' or 'paste'
    };

    // --- DOM ELEMENTS ---
    const dom = {
        body: document.body,
        headerTitle: document.getElementById('header-title'), // NEW
        navButtons: document.querySelectorAll('.nav-button'),
        shareDeckButton: document.getElementById('share-deck-button'),
        
        // Create View (MODIFIED)
        createView: document.getElementById('create-view'),
        deckTitleInput: document.getElementById('deck-title-input'), // NEW
        toggleManualButton: document.getElementById('toggle-manual-button'), // NEW
        togglePasteButton: document.getElementById('toggle-paste-button'), // NEW
        manualInputSection: document.getElementById('manual-input-section'), // NEW
        pasteInputSection: document.getElementById('paste-input-section'), // NEW
        cardEditorList: document.getElementById('card-editor-list'), // NEW
        addCardButton: document.getElementById('add-card-button'), // NEW
        deckInputArea: document.getElementById('deck-input-area'), // Kept for paste
        parseDeckButton: document.getElementById('parse-deck-button'), // Kept (now "Create Deck")

        // Flashcard View
        flashcardsView: document.getElementById('flashcards-view'),
        flashcardContainer: document.getElementById('flashcard-container'),
        flashcardFront: document.getElementById('flashcard-front').querySelector('p'),
        flashcardBack: document.getElementById('flashcard-back').querySelector('p'),
        prevCardButton: document.getElementById('prev-card-button'),
        nextCardButton: document.getElementById('next-card-button'),
        cardCounter: document.getElementById('card-counter'),

        // Learn View
        learnView: document.getElementById('learn-view'),
        learnModeDisabled: document.getElementById('learn-mode-disabled'),
        learnModeQuiz: document.getElementById('learn-mode-quiz'),
        learnTerm: document.getElementById('learn-term'),
        learnOptions: document.getElementById('learn-options'),
        learnFeedback: document.getElementById('learn-feedback'),
        learnCompleteView: document.getElementById('learn-complete-view'),
        learnRestartButton: document.getElementById('learn-restart-button'),
        learnSwitchModeButton: document.getElementById('learn-switch-mode-button'), // MODIFIED

        // NEW: Type View
        typeView: document.getElementById('type-view'),
        typeModeDisabled: document.getElementById('type-mode-disabled'),
        typeModeQuiz: document.getElementById('type-mode-quiz'),
        typeCompleteView: document.getElementById('type-complete-view'),
        typeQuestionBox: document.getElementById('type-question-box'),
        typeQuestionTerm: document.getElementById('type-question-term'),
        typeInputForm: document.getElementById('type-input-form'),
        typeInputArea: document.getElementById('type-input-area'),
        typeSubmitButton: document.getElementById('type-submit-button'),
        typeFeedback: document.getElementById('type-feedback'),
        typeFeedbackMessage: document.getElementById('type-feedback-message'),
        typeFeedbackCorrectAnswer: document.getElementById('type-feedback-correct-answer'),
        typeOverrideWrongButton: document.getElementById('type-override-wrong-button'), // MODIFIED
        typeOverrideCorrectButton: document.getElementById('type-override-correct-button'), // NEW
        typeRestartButton: document.getElementById('type-restart-button'),
        typeSwitchModeButton: document.getElementById('type-switch-mode-button'),

        // Other
        toastNotification: document.getElementById('toast-notification'),
        emptyDeckView: document.getElementById('empty-deck-view'),

        // NEW: Theme Toggle Elements
        themeToggleButton: document.getElementById('theme-toggle-button'),
        themeIconSun: document.getElementById('theme-icon-sun'),
        themeIconMoon: document.getElementById('theme-icon-moon'),

        // NEW: About Modal Elements
        aboutButton: document.getElementById('about-button'),
        aboutModalOverlay: document.getElementById('about-modal-overlay'),
        aboutModalClose: document.getElementById('about-modal-close'),
        aboutModalBackdrop: document.querySelector('#about-modal-overlay .modal-backdrop'),

        // NEW: Settings Modal Elements
        settingsButton: document.getElementById('settings-button'),
        settingsModalOverlay: document.getElementById('settings-modal-overlay'),
        settingsModalClose: document.getElementById('settings-modal-close'),
        settingsModalBackdrop: document.querySelector('#settings-modal-overlay .modal-backdrop'),
        settingDeckTitle: document.getElementById('setting-deck-title'),
        settingToggleShuffle: document.getElementById('setting-toggle-shuffle'),
        settingToggleStartWith: document.getElementById('setting-toggle-start-with'),
    };

    // --- CONSTANTS ---
    const SRS_INTERVALS = {
        1: 5 * 60 * 1000,         // 5 minutes
        2: 30 * 60 * 1000,        // 30 minutes
        3: 24 * 60 * 60 * 1000,   // 1 day
        4: 3 * 24 * 60 * 60 * 1000, // 3 days
        5: 7 * 24 * 60 * 60 * 1000  // 7 days
    };
    const INCORRECT_INTERVAL = 60 * 1000; // 1 minute
    const TYPE_CLOSE_THRESHOLD = 2; // NEW: Max Levenshtein distance for "close"
    const TYPE_CORRECT_DELAY = 1500; // NEW
    const TYPE_INCORRECT_DELAY = 3000; // NEW
    const TYPE_CLOSE_DELAY = 4000; // NEW

    // --- CORE LOGIC ---

    /**
     * Initializes the application.
     */
    function init() {
        loadTheme(); // NEW: Load theme first
        loadProgressFromLocalStorage();
        loadDeckFromURL();
        addEventListeners();
        
        // MODIFIED: Check cards array length and show/hide buttons
        if (app.currentDeck.cards.length === 0) {
            dom.settingsButton.classList.add('hidden');
            dom.shareDeckButton.classList.add('hidden');
            setMode('create');
        } else {
            dom.settingsButton.classList.remove('hidden');
            dom.shareDeckButton.classList.remove('hidden');
            dom.headerTitle.textContent = app.currentDeck.title; // Set title
            setMode('flashcards');
        }
    }

    // --- NEW: THEME LOGIC ---

    /**
     * Loads the saved theme from localStorage and applies it.
     * Defaults to 'dark' as requested.
     */
    function loadTheme() {
        const savedTheme = localStorage.getItem(app.themeKey) || 'dark'; // Default to dark
        setTheme(savedTheme);
    }

    /**
     * Toggles the theme between light and dark.
     */
    function toggleTheme() {
        if (dom.body.classList.contains('light-mode')) {
            setTheme('dark');
        } else {
            setTheme('light');
        }
    }

    /**
     * Applies a specific theme and saves it to localStorage.
     * @param {string} theme - 'light' or 'dark'
     */
    function setTheme(theme) {
        if (theme === 'light') {
            dom.body.classList.add('light-mode');
            dom.themeIconSun.classList.add('hidden');
            dom.themeIconMoon.classList.remove('hidden');
        } else {
            dom.body.classList.remove('light-mode');
            dom.themeIconSun.classList.remove('hidden');
            dom.themeIconMoon.classList.add('hidden');
        }
        localStorage.setItem(app.themeKey, theme);
    }

    // --- END THEME LOGIC ---


    /**
     * Loads progress data from localStorage into the app.progressData Map.
     */
    function loadProgressFromLocalStorage() {
        try {
            const storedProgress = localStorage.getItem(app.localStorageKey);
            if (storedProgress) {
                const parsed = JSON.parse(storedProgress);
                app.progressData = new Map(Object.entries(parsed));
            }
        } catch (error) {
            console.error("Error loading progress from localStorage:", error);
            app.progressData = new Map();
        }
    }

    /**
     * Saves the current deck's progress to localStorage.
     */
    function saveProgressToLocalStorage() {
        try {
            const progressToSave = {};
            // MODIFIED: Loop over cards array
            for (const card of app.currentDeck.cards) {
                const key = `${card.term}|${card.definition}`;
                progressToSave[key] = {
                    score: card.score,
                    lastReviewed: card.lastReviewed,
                    nextReview: card.nextReview
                };
            }
            localStorage.setItem(app.localStorageKey, JSON.stringify(progressToSave));
        } catch (error) {
            console.error("Error saving progress to localStorage:", error);
        }
    }

    /**
     * Loads a deck from the URL hash. If no hash, loads a default deck.
     */
    function loadDeckFromURL() {
        // MODIFIED: rawDeck is now an object
        let rawDeck = getDefaultDeck();
        let hash = window.location.hash.substring(1); // <-- Get hash as 'let'
        const defaultSettings = { shuffle: false, termFirst: true };

        if (hash) {
            
            // --- FIX FOR MOBILE SHARING ---
            // Mobile apps often replace '+' with ' ' in URLs. We must change them back.
            hash = hash.replace(/ /g, '+');
            // --- END FIX ---

            try {
                const jsonString = atob(hash); // Decode the *fixed* hash
                const parsedDeck = JSON.parse(jsonString);
                
                // Check for new structure (with settings)
                if (parsedDeck && Array.isArray(parsedDeck.cards)) {
                    rawDeck = parsedDeck;
                    // Merge saved settings with defaults to ensure all keys exist
                    rawDeck.settings = { ...defaultSettings, ...parsedDeck.settings };
                } else if (Array.isArray(parsedDeck)) {
                    // Handle old structure (array of cards)
                    rawDeck = { title: 'Untitled Deck', cards: parsedDeck, settings: defaultSettings };
                }
                
                if (!rawDeck.title) rawDeck.title = 'Untitled Deck';

            } catch (error) {
                console.error("Error parsing deck from hash:", error);
                rawDeck = getDefaultDeck();
                window.location.hash = ''; // Clear invalid hash
            }
        }

        // MODIFIED: Map cards from rawDeck.cards
        const mappedCards = rawDeck.cards.map((card, index) => {
            const key = `${card.term}|${card.definition}`;
            const storedProgress = app.progressData.get(key);
            const defaultState = {
                id: `${Date.now()}-${index}`,
                term: card.term,
                definition: card.definition,
                score: 0,
                lastReviewed: 0,
                nextReview: 0
            };
            return { ...defaultState, ...storedProgress };
        });

        app.currentDeck = {
            title: rawDeck.title,
            cards: mappedCards,
            settings: rawDeck.settings // Assign settings
        };
        app.currentCardIndex = 0;
    }

    /**
     * Returns a default sample deck.
     * FIXED: Removed the duplicate function. This is the only one.
     */
    function getDefaultDeck() {
        // MODIFIED: Return new deck object structure with settings
        return {
            title: '',
            cards: [],
            settings: {
                shuffle: false,
                termFirst: true
            }
        };
    }

    /**
     * Sets the application's current mode and updates the UI.
     * @param {string} mode - The mode to switch to.
     */
    function setMode(mode) {
        // MODIFIED: Show/hide buttons based on deck length
        if (app.currentDeck.cards.length === 0) {
            dom.settingsButton.classList.add('hidden');
            dom.shareDeckButton.classList.add('hidden');
        } else {
            dom.settingsButton.classList.remove('hidden');
            dom.shareDeckButton.classList.remove('hidden');
        }

        // MODIFIED: Check cards array length
        if (app.currentDeck.cards.length === 0 && mode !== 'create') {
            mode = 'empty';
        // MODIFIED: Check cards array length
        } else if (app.currentDeck.cards.length < 4 && mode === 'learn') {
            dom.learnModeQuiz.classList.add('hidden');
            dom.learnCompleteView.classList.add('hidden'); // Hide complete view
            dom.learnModeDisabled.classList.remove('hidden'); // Show disabled view
        } else if (mode === 'learn') {
            dom.learnModeDisabled.classList.add('hidden'); // Hide disabled view
            // Note: startLearnMode() will handle showing/hiding quiz vs. complete
        
        // NEW: Type mode logic
        } else if (app.currentDeck.cards.length < 1 && mode === 'type') {
            dom.typeModeQuiz.classList.add('hidden');
            dom.typeCompleteView.classList.add('hidden');
            dom.typeModeDisabled.classList.remove('hidden');
        } else if (mode === 'type') {
            dom.typeModeDisabled.classList.add('hidden');
        }

        // NEW: Update header title
        if (app.currentDeck.cards.length > 0 && mode !== 'create') {
            dom.headerTitle.textContent = app.currentDeck.title;
        } else if (mode === 'create') {
            dom.headerTitle.textContent = "Create a New Deck";
            renderCreateEditor(); // NEW: Render editor when switching to create
        } else {
            dom.headerTitle.textContent = "Totally Not Quizlet";
        }


        app.currentMode = mode;
        dom.body.dataset.mode = mode;

        dom.navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // NEW: Create studyDeck *before* mode-specific logic
        // This ensures studyDeck is always up-to-date with settings
        if (app.currentDeck.cards.length > 0) {
            app.studyDeck = [...app.currentDeck.cards];
            if (app.currentDeck.settings.shuffle) {
                shuffleArray(app.studyDeck);
            }
        } else {
            app.studyDeck = [];
        }


        if (mode === 'flashcards') {
            // studyDeck is already created and shuffled (or not)
            app.currentCardIndex = 0;
            renderFlashcardContent();
            dom.flashcardContainer.classList.remove('is-flipped');
        } else if (mode === 'learn') {
            // Now that studyDeck is ready, start learn mode
            // This check is needed again in case the mode was set programmatically
            if (app.currentDeck.cards.length >= 4) {
                 // MODIFIED: Only start a new session if one isn't active
                 if (app.learnSessionCards.length === 0) {
                    startLearnMode();
                 }
                 // If a session is active (length > 0), do nothing.
                 // This preserves the user's progress when switching tabs.
            }
        // NEW: Start type mode
        } else if (mode === 'type') {
            if (app.currentDeck.cards.length >= 1) {
                if (app.typeSessionCards.length === 0) {
                    startTypeMode();
                }
            }
        }
    }

    /**
     * Attaches all primary event listeners.
     */
    function addEventListeners() {
        // NEW: Theme toggle
        dom.themeToggleButton.addEventListener('click', toggleTheme);

        // Mode navigation
        dom.navButtons.forEach(button => {
            button.addEventListener('click', () => setMode(button.dataset.mode));
        });

        // Flashcard controls
        dom.flashcardContainer.addEventListener('click', () => {
            if (!app.isAnimating) { // Don't flip while fading
                dom.flashcardContainer.classList.toggle('is-flipped');
            }
        });
        dom.prevCardButton.addEventListener('click', showPrevCard);
        dom.nextCardButton.addEventListener('click', showNextCard);

        // Create deck controls (MODIFIED)
        dom.parseDeckButton.addEventListener('click', parseAndLoadDeck);
        dom.addCardButton.addEventListener('click', () => createNewCardRow());
        dom.toggleManualButton.addEventListener('click', () => setCreateMode('manual'));
        dom.togglePasteButton.addEventListener('click', () => setCreateMode('paste'));

        // NEW: Event delegation for delete buttons and auto-resize
        dom.cardEditorList.addEventListener('click', (e) => {
            if (e.target.closest('.delete-card-button')) {
                const row = e.target.closest('.card-editor-row');
                row.remove();
                updateCardRowNumbers();
            }
        });

        dom.cardEditorList.addEventListener('input', (e) => {
            if (e.target.tagName === 'TEXTAREA') {
                autoResizeTextarea(e.target);
            }
        });

        // NEW: Drag and Drop Listeners
        dom.cardEditorList.addEventListener('dragstart', handleDragStart);
        dom.cardEditorList.addEventListener('dragover', handleDragOver);
        dom.cardEditorList.addEventListener('drop', handleDrop);
        dom.cardEditorList.addEventListener('dragend', handleDragEnd);
        
        // Share button
        dom.shareDeckButton.addEventListener('click', shareDeck);

        // NEW: About Modal Listeners
        dom.aboutButton.addEventListener('click', showAboutModal);
        dom.aboutModalClose.addEventListener('click', hideAboutModal);
        dom.aboutModalBackdrop.addEventListener('click', hideAboutModal);

        // NEW: Settings Modal Listeners
        dom.settingsButton.addEventListener('click', showSettingsModal);
        dom.settingsModalClose.addEventListener('click', hideSettingsModal);
        dom.settingsModalBackdrop.addEventListener('click', hideSettingsModal);
        dom.settingDeckTitle.addEventListener('input', handleTitleSettingChange);
        dom.settingToggleShuffle.addEventListener('click', handleShuffleSettingChange);
        dom.settingToggleStartWith.addEventListener('click', handleStartWithSettingChange);
    
        // NEW: Learn Complete Listeners
        dom.learnRestartButton.addEventListener('click', startLearnMode);
        dom.learnSwitchModeButton.addEventListener('click', () => setMode('type'));

        // NEW: Type Mode Listeners
        dom.typeInputForm.addEventListener('submit', handleTypeAnswer);
        dom.typeSubmitButton.addEventListener('click', handleTypeAnswer);
        dom.typeOverrideWrongButton.addEventListener('click', handleTypeOverrideWrong); // MODIFIED
        dom.typeOverrideCorrectButton.addEventListener('click', handleTypeOverrideCorrect); // NEW
        dom.typeRestartButton.addEventListener('click', startTypeMode);
        dom.typeSwitchModeButton.addEventListener('click', () => setMode('learn'));
    }

    // --- NEW: About Modal Functions ---
    function showAboutModal() {
        dom.aboutModalOverlay.classList.add('visible');
    }

    function hideAboutModal() {
        dom.aboutModalOverlay.classList.remove('visible');
    }
    // --- End About Modal Functions ---

    // --- NEW: Settings Modal Functions ---
    function showSettingsModal() {
        // Populate modal with current settings
        dom.settingDeckTitle.value = app.currentDeck.title;
        updateSettingsToggle(dom.settingToggleShuffle, app.currentDeck.settings.shuffle, "Shuffle");
        updateSettingsToggle(dom.settingToggleStartWith, app.currentDeck.settings.termFirst, "Term", "Definition");
        
        dom.settingsModalOverlay.classList.add('visible');
    }

    function hideSettingsModal() {
        dom.settingsModalOverlay.classList.remove('visible');
        
        // NEW: Force-reset the learn session so new settings (like shuffle) apply
        if (app.currentMode === 'learn') {
            app.learnSessionCards = []; 
        }

        // If mode is flashcards or learn, reset the view to apply changes
        if (app.currentMode === 'flashcards' || app.currentMode === 'learn') {
            setMode(app.currentMode);
        }
    }

    function handleTitleSettingChange() {
        const newTitle = dom.settingDeckTitle.value;
        app.currentDeck.title = newTitle;
        dom.headerTitle.textContent = newTitle;
        dom.deckTitleInput.value = newTitle; // Keep create view in sync
        updateURLHash(); // Save change
    }

    function handleShuffleSettingChange() {
        app.currentDeck.settings.shuffle = !app.currentDeck.settings.shuffle;
        updateSettingsToggle(dom.settingToggleShuffle, app.currentDeck.settings.shuffle, "Shuffle");
        updateURLHash();
    }

    function handleStartWithSettingChange() {
        app.currentDeck.settings.termFirst = !app.currentDeck.settings.termFirst;
        updateSettingsToggle(dom.settingToggleStartWith, app.currentDeck.settings.termFirst, "Term", "Definition");
        updateURLHash();
    }

    /** Helper to update a toggle button's appearance */
    function updateSettingsToggle(button, isActive, activeText, inactiveText = null) {
        if (isActive) {
            button.classList.add('active');
            button.textContent = inactiveText ? activeText : `${activeText}: ON`;
        } else {
            button.classList.remove('active');
            button.textContent = inactiveText ? inactiveText : `${activeText}: OFF`;
        }
    }
    // --- End Settings Modal Functions ---


    // --- NEW: Progress Update Function ---
    /**
     * Updates a card's SRS progress and saves it.
     * @param {object} card - The card object to update.
     * @param {boolean} wasCorrect - If the answer was correct.
     */
    function updateCardProgress(card, wasCorrect) {
        const now = Date.now();
        card.lastReviewed = now;

        if (wasCorrect) {
            card.score = Math.min(card.score + 1, 5);
            card.nextReview = now + SRS_INTERVALS[card.score];
        } else {
            card.score = 0;
            card.nextReview = now + INCORRECT_INTERVAL;
        }
        
        // Note: This function doesn't save, as it's often called in a batch.
        // The calling function (e.g., handleLearnAnswer) should save.
    }


    // --- FLASHCARD MODE ---

    /**
     * Renders the current flashcard's text content.
     */
    function renderFlashcardContent() {
        // MODIFIED: Use studyDeck
        if (app.studyDeck.length === 0) return;

        // MODIFIED: Get card from studyDeck
        const card = app.studyDeck[app.currentCardIndex];
        
        // NEW: Respect 'termFirst' setting
        if (app.currentDeck.settings.termFirst) {
            dom.flashcardFront.textContent = card.term;
            dom.flashcardBack.textContent = card.definition;
        } else {
            dom.flashcardFront.textContent = card.definition;
            dom.flashcardBack.textContent = card.term;
        }

        // MODIFIED: Use studyDeck length
        dom.cardCounter.textContent = `${app.currentCardIndex + 1} / ${app.studyDeck.length}`;
    }

    // MODIFIED: Re-written to fix animation bug.
    function showPrevCard() {
        // MODIFIED: Use studyDeck
        if (app.studyDeck.length === 0 || app.isAnimating) return;
        app.isAnimating = true;

        // 1. Fade out
        dom.flashcardContainer.style.opacity = 0;

        // 2. Wait for fade to finish (200ms from CSS)
        setTimeout(() => {
            // 3. Add class to disable flip animation
            dom.flashcardContainer.classList.add('no-flip-animation');
            
            // 4. Instantly remove 'is-flipped' (so it's on the front face)
            dom.flashcardContainer.classList.remove('is-flipped');
            
            // 5. Change content
            // MODIFIED: Use studyDeck length
            app.currentCardIndex = (app.currentCardIndex - 1 + app.studyDeck.length) % app.studyDeck.length;
            renderFlashcardContent(); // Update text
            
            // 6. Force reflow to apply instant changes
            void dom.flashcardContainer.offsetWidth; 

            // 7. Remove class to re-enable flip animation for next click
            dom.flashcardContainer.classList.remove('no-flip-animation');
            
            // 8. Fade in
            dom.flashcardContainer.style.opacity = 1;

            // 9. Allow new animations
            setTimeout(() => {
                app.isAnimating = false;
            }, 200); // Wait for fade in
        }, 200); // Wait for fade out
    }

    // MODIFIED: Re-written to fix animation bug.
    function showNextCard() {
        // MODIFIED: Use studyDeck
        if (app.studyDeck.length === 0 || app.isAnimating) return;
        app.isAnimating = true;

        // 1. Fade out
        dom.flashcardContainer.style.opacity = 0;

        // 2. Wait for fade to finish (200ms from CSS)
        setTimeout(() => {
            // 3. Add class to disable flip animation
            dom.flashcardContainer.classList.add('no-flip-animation');
            
            // 4. Instantly remove 'is-flipped' (so it's on the front face)
            dom.flashcardContainer.classList.remove('is-flipped');

            // 5. Change content
            // MODIFIED: Use studyDeck length
            app.currentCardIndex = (app.currentCardIndex + 1) % app.studyDeck.length;
            renderFlashcardContent(); // Update text

            // 6. Force reflow to apply instant changes
            void dom.flashcardContainer.offsetWidth; 

            // 7. Remove class to re-enable flip animation for next click
            dom.flashcardContainer.classList.remove('no-flip-animation');
            
            // 8. Fade in
            dom.flashcardContainer.style.opacity = 1;
            
            // 9. Allow new animations
            setTimeout(() => {
                app.isAnimating = false;
            }, 200); // Wait for fade in
        }, 200); // Wait for fade out
    }

    // --- LEARN MODE ---

    function startLearnMode() {
        // MODIFIED: Use studyDeck
        if (app.studyDeck.length < 4) return;
        dom.learnFeedback.classList.add('hidden');
        dom.learnCompleteView.classList.add('hidden'); // NEW: Hide complete view
        dom.learnModeQuiz.classList.remove('hidden'); // NEW: Show quiz view
        
        app.learnSessionCards = [...app.studyDeck]; // NEW: Create session list
        shuffleArray(app.learnSessionCards); // NEW: Shuffle session list
        
        renderLearnQuestion();
    }



    function renderLearnQuestion() {
        // NEW: Check for completion
        if (app.learnSessionCards.length === 0) {
            dom.learnModeQuiz.classList.add('hidden');
            dom.learnCompleteView.classList.remove('hidden');
            return;
        }

        // NEW: Ensure quiz is visible and complete is hidden (for subsequent questions)
        dom.learnModeQuiz.classList.remove('hidden');
        dom.learnCompleteView.classList.add('hidden');
        
        // MODIFIED: Get card from session list
        const card = app.learnSessionCards[0];
        if (!card) {
            // This case should be handled by the check above, but good to have.
            dom.learnModeQuiz.classList.add('hidden');
            dom.learnCompleteView.classList.remove('hidden');
            return;
        }

        app.currentLearnCard = card;
        const options = generateQuizOptions(card);

        // NEW: Respect termFirst setting for the question
        dom.learnTerm.textContent = app.currentDeck.settings.termFirst ? card.term : card.definition;
        
        dom.learnOptions.innerHTML = ''; 
        
        dom.learnFeedback.classList.add('hidden');
        dom.learnFeedback.classList.remove('correct', 'incorrect');

        options.forEach(option => {
            const button = document.createElement('button');
            // MODIFIED: Added rounded-xl, kept layout classes
            button.className = 'learn-option p-4 rounded-xl border text-left';
            button.textContent = option;
            button.dataset.answer = option;
            button.addEventListener('click', handleLearnAnswer);
            dom.learnOptions.appendChild(button);
        });
    }

    function getNextLearnCard() {
        const now = Date.now();
        // MODIFIED: Use studyDeck
        // Note: This filters the *studyDeck*, which is a copy. Progress is saved
        // to the original cards in app.currentDeck.cards, so this works.
        const dueCards = app.studyDeck.filter(card => card.nextReview <= now);

        if (dueCards.length > 0) {
            dueCards.sort((a, b) => a.score - b.score);
            return dueCards[0];
        }

        // MODIFIED: Use studyDeck
        const allCardsSorted = [...app.studyDeck].sort((a, b) => a.score - b.score);
        return allCardsSorted[0];
    }

    function generateQuizOptions(correctCard) {
        const options = new Set();
        // NEW: Generate options based on termFirst setting
        const correctOption = app.currentDeck.settings.termFirst ? correctCard.definition : correctCard.term;
        options.add(correctOption);

        // MODIFIED: Use studyDeck
        const distractorPool = app.studyDeck.filter(card => card.id !== correctCard.id);
        
        shuffleArray(distractorPool); // Shuffle pool

        for (const card of distractorPool) {
            if (options.size < 4) {
                // NEW: Get the correct field for the option
                const distractorOption = app.currentDeck.settings.termFirst ? card.definition : card.term;
                options.add(distractorOption);
            } else {
                break;
            }
        }
        
        const shuffledOptions = Array.from(options);
        shuffleArray(shuffledOptions);

        return shuffledOptions;
    }

    function handleLearnAnswer(event) {
        const selectedButton = event.currentTarget;
        const selectedAnswer = selectedButton.dataset.answer;
        // NEW: Check correct answer based on termFirst
        const correctAnswer = app.currentDeck.settings.termFirst ? app.currentLearnCard.definition : app.currentLearnCard.term;
        const now = Date.now();

        dom.learnOptions.querySelectorAll('button').forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.answer === correctAnswer) {
                btn.classList.add('correct');
            } else if (btn === selectedButton) {
                btn.classList.add('incorrect');
            }
        });

        if (selectedAnswer === correctAnswer) {
            app.learnSessionCards.shift(); // NEW: Remove correct card from session
            updateCardProgress(app.currentLearnCard, true); // MODIFIED
            dom.learnFeedback.textContent = "Correct!";
            dom.learnFeedback.classList.add('correct');
            dom.learnFeedback.classList.remove('incorrect');
        } else {
            app.learnSessionCards.push(app.learnSessionCards.shift()); // NEW: Move incorrect card to back
            updateCardProgress(app.currentLearnCard, false); // MODIFIED
            // MODIFIED: Show the correct answer in the feedback
            dom.learnFeedback.textContent = "Incorrect. The correct answer is: " + correctAnswer;
            dom.learnFeedback.classList.add('incorrect');
            dom.learnFeedback.classList.remove('correct');
        }
        
        // Note: app.currentLearnCard is an object from the studyDeck, but it's
        // a reference to the *same object* in app.currentDeck.cards,
        app.currentLearnCard.lastReviewed = now; // This line is now redundant
        dom.learnFeedback.classList.remove('hidden');

        saveProgressToLocalStorage();
        setTimeout(renderLearnQuestion, 2000);
    }

    // --- NEW: TYPE MODE ---

    /**
     * Starts a new "Type" mode session.
     */
    function startTypeMode() {
        if (app.studyDeck.length < 1) return; // Need at least 1 card
        
        dom.typeFeedback.classList.add('hidden');
        dom.typeCompleteView.classList.add('hidden');
        dom.typeModeQuiz.classList.remove('hidden');
        
        app.typeSessionCards = [...app.studyDeck]; // Create session list
        shuffleArray(app.typeSessionCards); // Shuffle session list
        
        renderTypeQuestion();
    }

    /**
     * Renders the next "Type" question.
     */
    function renderTypeQuestion() {
        // Check for completion
        if (app.typeSessionCards.length === 0) {
            dom.typeModeQuiz.classList.add('hidden');
            dom.typeCompleteView.classList.remove('hidden');
            return;
        }

        // Ensure quiz is visible and complete is hidden
        dom.typeModeQuiz.classList.remove('hidden');
        dom.typeCompleteView.classList.add('hidden');
        
        app.currentTypeCard = app.typeSessionCards[0]; // Get card
        
        // Set question text (respects 'termFirst')
        const questionText = app.currentDeck.settings.termFirst 
            ? app.currentTypeCard.term 
            : app.currentTypeCard.definition;
        dom.typeQuestionTerm.textContent = questionText;
        
        // Reset inputs
        dom.typeInputArea.value = '';
        dom.typeInputArea.disabled = false;
        dom.typeSubmitButton.disabled = false;
        dom.typeFeedback.classList.add('hidden');
        
        // MODIFIED: Explicitly clear feedback text
        dom.typeFeedbackMessage.textContent = '';
        dom.typeFeedbackCorrectAnswer.textContent = '';
        
        dom.typeOverrideWrongButton.classList.add('hidden'); 
        dom.typeOverrideCorrectButton.classList.add('hidden'); 
    } // <-- FIX: Added the missing closing brace for renderTypeQuestion

    /**
     * Handles the user submitting a typed answer.
     */
    function handleTypeAnswer(e) {
        if (e) e.preventDefault(); // Stop form submission
        if (dom.typeInputArea.disabled) return; // Prevent double-submit

        const userAnswer = dom.typeInputArea.value.trim();
        if (!userAnswer) return; // Don't submit empty answers

        const correctAnswer = app.currentDeck.settings.termFirst
            ? app.currentTypeCard.definition
            : app.currentTypeCard.term;

        // Compare case-insensitively
        const distance = levenshteinDistance(userAnswer.toLowerCase(), correctAnswer.toLowerCase());

        // Disable inputs
        dom.typeInputArea.disabled = true;
        dom.typeSubmitButton.disabled = true;
        dom.typeFeedback.classList.remove('hidden', 'correct', 'incorrect', 'close');
        dom.typeOverrideWrongButton.classList.add('hidden'); // MODIFIED
        dom.typeOverrideCorrectButton.classList.add('hidden'); // NEW

        let nextQuestionDelay = TYPE_INCORRECT_DELAY;

        if (distance === 0) {
            // --- Perfect Match ---
            dom.typeFeedback.classList.add('correct');
            dom.typeFeedbackMessage.textContent = "Correct!";
            dom.typeFeedbackCorrectAnswer.textContent = '';
            
            updateCardProgress(app.currentTypeCard, true);
            app.typeSessionCards.shift(); // Remove from session
            nextQuestionDelay = TYPE_CORRECT_DELAY;

        } else if (distance <= TYPE_CLOSE_THRESHOLD) {
            // --- Close Match ---
            dom.typeFeedback.classList.add('close');
            dom.typeFeedbackMessage.textContent = "Close!";
            dom.typeFeedbackCorrectAnswer.textContent = `Correct answer: ${correctAnswer}`;
            dom.typeOverrideWrongButton.classList.remove('hidden'); // MODIFIED

            // Assume correct, but cache the card in case of override
            updateCardProgress(app.currentTypeCard, true);
            app.lastTypeCard = app.typeSessionCards.shift(); // Remove and store
            nextQuestionDelay = TYPE_CLOSE_DELAY;

        } else {
            // --- Incorrect Match ---
            dom.typeFeedback.classList.add('incorrect');
            dom.typeFeedbackMessage.textContent = "Incorrect.";
            dom.typeFeedbackCorrectAnswer.textContent = `Correct answer: ${correctAnswer}`;
            dom.typeOverrideCorrectButton.classList.remove('hidden'); // NEW
            
            updateCardProgress(app.currentTypeCard, false);
            // MODIFIED: Store card *before* moving it
            app.lastTypeCard = app.typeSessionCards.shift(); // Remove and store
            app.typeSessionCards.push(app.lastTypeCard); // Move to back
            nextQuestionDelay = TYPE_INCORRECT_DELAY;
        }

        saveProgressToLocalStorage();
        setTimeout(renderTypeQuestion, nextQuestionDelay);
    }

    /**
     * MODIFIED: Handles the "I got it wrong" override button.
     */
    function handleTypeOverrideWrong() {
        if (!app.lastTypeCard) return; // No card to override

        // 1. Re-add the card to the end of the session
        app.typeSessionCards.push(app.lastTypeCard);

        // 2. Mark the card as incorrect (resets score)
        updateCardProgress(app.lastTypeCard, false);
        saveProgressToLocalStorage();

        // 3. Clear the cache and hide the button
        app.lastTypeCard = null;
        dom.typeOverrideWrongButton.classList.add('hidden');

        // 4. Give feedback
        showToast("Got it. We'll ask that one again.");
    }

    /**
     * NEW: Handles the "I got it correct" override button.
     */
    function handleTypeOverrideCorrect() {
        if (!app.lastTypeCard) return; // No card to override

        // 1. Update progress to correct
        updateCardProgress(app.lastTypeCard, true);
        saveProgressToLocalStorage();

        // 2. The card is at the end of the session array. Find and remove it.
        const cardIndex = app.typeSessionCards.lastIndexOf(app.lastTypeCard);
        if (cardIndex > -1) {
            app.typeSessionCards.splice(cardIndex, 1);
        }

        // 3. Clear cache and hide button
        app.lastTypeCard = null;
        dom.typeOverrideCorrectButton.classList.add('hidden');

        // 4. Give feedback
        showToast("Great! Marking that as correct.");
    }


    // --- CREATE DECK ---

    /**
     * NEW: Renders the create editor, populating title and cards.
     */
    function renderCreateEditor() {
        dom.deckTitleInput.value = app.currentDeck.title || ''; // Handle empty title
        dom.cardEditorList.innerHTML = ''; // Clear list

        if (app.currentDeck.cards.length > 0) {
            app.currentDeck.cards.forEach(card => {
                createNewCardRow(card.term, card.definition);
            });
        } else {
            // Start with 3 empty rows
            createNewCardRow();
            createNewCardRow();
            createNewCardRow();
        }
        updateCardRowNumbers();
        // Ensure textareas are sized correctly on load
        dom.cardEditorList.querySelectorAll('textarea').forEach(autoResizeTextarea);
    }

    /**
     * NEW: Creates a new card row in the manual editor.
     */
    function createNewCardRow(term = '', definition = '') {
        const row = document.createElement('div');
        row.className = 'card-editor-row';
        row.setAttribute('draggable', 'true'); // Make it draggable

        const rowNumber = dom.cardEditorList.children.length + 1;

        row.innerHTML = `
            <div class="drag-handle" title="Drag to reorder">
                <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M7 2a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1V3a1 1 0 00-1-1H7zM7 6a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1V7a1 1 0 00-1-1H7zM7 10a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1v-1a1 1 0 00-1-1H7zM7 14a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1v-1a1 1 0 00-1-1H7zM11 2a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1V3a1 1 0 00-1-1h-1zM11 6a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1V7a1 1 0 00-1-1h-1zM11 10a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1v-1a1 1 0 00-1-1h-1zM11 14a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1v-1a1 1 0 00-1-1h-1z"></path></svg>
            </div>
            <span class="card-row-number">${rowNumber}</span>
            <div class="card-input-wrapper">
                <textarea class="term-input" rows="1" placeholder="Enter term">${term}</textarea>
                <label class="create-label">TERM</label>
            </div>
            <div class="card-input-wrapper">
                <textarea class="def-input" rows="1" placeholder="Enter definition">${definition}</textarea>
                <label class="create-label">DEFINITION</label>
            </div>
            <button class="delete-card-button" title="Delete card">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        `;
        dom.cardEditorList.appendChild(row);
        
        // Auto-resize the new textareas in case they have content
        const textareas = row.querySelectorAll('textarea');
        textareas.forEach(autoResizeTextarea);
    }

    /**
     * NEW: Updates the numbers for all card rows.
     */
    function updateCardRowNumbers() {
        const rows = dom.cardEditorList.querySelectorAll('.card-editor-row');
        rows.forEach((row, index) => {
            row.querySelector('.card-row-number').textContent = index + 1;
        });
    }

    /**
     * NEW: Auto-resizes a textarea to fit its content.
     */
    function autoResizeTextarea(textarea) {
        textarea.style.height = 'auto'; // Reset height
        textarea.style.height = `${textarea.scrollHeight}px`; // Set to content height
    }

    /**
     * NEW: Sets the create mode (manual or paste).
     */
    function setCreateMode(mode) {
        app.createMode = mode;
        if (mode === 'manual') {
            dom.manualInputSection.classList.remove('hidden');
            dom.pasteInputSection.classList.add('hidden');
            dom.toggleManualButton.classList.add('active');
            dom.togglePasteButton.classList.remove('active');
        } else {
            dom.manualInputSection.classList.add('hidden');
            dom.pasteInputSection.classList.remove('hidden');
            dom.toggleManualButton.classList.remove('active');
            dom.togglePasteButton.classList.add('active');
        }
    }

    /**
     * MODIFIED: Parses deck from either manual or paste mode.
     */
    function parseAndLoadDeck() {
        const title = dom.deckTitleInput.value.trim() || 'Untitled Deck';
        let newCards = [];
        let errorCount = 0;

        if (app.createMode === 'manual') {
            const rows = dom.cardEditorList.querySelectorAll('.card-editor-row');
            rows.forEach(row => {
                const term = row.querySelector('.term-input').value.trim();
                const definition = row.querySelector('.def-input').value.trim();
                if (term && definition) {
                    newCards.push({ term, definition });
                } else if (term || definition) {
                    // Only count as error if one is filled but not the other
                    errorCount++;
                }
            });
        } else {
            // Paste mode logic
            const input = dom.deckInputArea.value.trim();
            if (input) {
                const lines = input.split('\n');
                for (const line of lines) {
                    // MODIFIED: Use comma as separator
                    const parts = line.split(',');
                    if (parts.length >= 2) {
                        const term = parts[0].trim();
                        // Join all other parts as the definition
                        const definition = parts.slice(1).join(',').trim(); 
                        if (term && definition) {
                            newCards.push({ term, definition });
                        } else {
                            errorCount++;
                        }
                    } else if (line.trim() !== '') {
                        errorCount++;
                    }
                }
            }
        }

        if (newCards.length === 0) {
            // MODIFIED: Don't use alert
            showToast("Could not find any valid cards. Please check your inputs.");
            return;
        }

        if (errorCount > 0) {
            // MODIFIED: Don't use alert
            showToast(`Loaded ${newCards.length} cards, but ${errorCount} lines/rows were ignored.`);
        }

        // NEW: Add default settings to the new deck
        const newDeck = {
            title: title,
            cards: newCards,
            settings: {
                shuffle: false,
                termFirst: true
            }
        };

        try {
            const jsonString = JSON.stringify(newDeck);
            const base64String = btoa(jsonString);
            window.location.hash = base64String;
            location.reload(); 
        } catch (error) {
            console.error("Error creating deck hash:", error);
            // MODIFIED: Don't use alert
            showToast("An error occurred while trying to load the new deck.");
        }
    }

    // --- SHARE DECK ---

    function shareDeck() {
        // MODIFIED: Check cards array length
        if (app.currentDeck.cards.length === 0) {
            showToast("Cannot share an empty deck!");
            return;
        }

        try {
            // MODIFIED: Create base deck from app.currentDeck, including settings
            const baseDeck = {
                title: app.currentDeck.title,
                cards: app.currentDeck.cards.map(({ term, definition }) => ({ term, definition })),
                settings: app.currentDeck.settings
            };
            const jsonString = JSON.stringify(baseDeck);
            const base64String = btoa(jsonString);
            const url = `${window.location.origin}${window.location.pathname}#${base64String}`;

            if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(() => {
                    showToast("Share link copied to clipboard!");
                }).catch(err => {
                    console.error("Failed to copy to clipboard:", err);
                    fallbackCopyTextToClipboard(url);
                });
            } else {
                fallbackCopyTextToClipboard(url);
            }

        } catch (error) {
            console.error("Error generating share link:", error);
            showToast("Error generating share link.");
        }
    }

    function fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showToast("Share link copied to clipboard!");
            } else {
                showToast("Could not copy link.");
            }
        } catch (err) {
            showToast("Could not copy link.");
        }
        document.body.removeChild(textArea);
    }

    function showToast(message) {
        if (app.toastTimeout) {
            clearTimeout(app.toastTimeout);
        }
        dom.toastNotification.textContent = message;
        dom.toastNotification.classList.add('show');
        app.toastTimeout = setTimeout(() => {
            dom.toastNotification.classList.remove('show');
            app.toastTimeout = null; 
        }, 3000);
    }

    // --- NEW: UTILITY FUNCTIONS ---
    
    /**
     * Shuffles an array in place. (Fisher-Yates shuffle)
     * @param {Array} array The array to shuffle.
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * NEW: Calculates Levenshtein distance between two strings.
     * @param {string} a - The first string.
     * @param {string} b - The second string.
     * @returns {number} The distance.
     */
    function levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

        for (let i = 0; i <= a.length; i++) {
            matrix[0][i] = i;
        }
        for (let j = 0; j <= b.length; j++) {
            matrix[j][0] = j;
        }

        for (let j = 1; j <= b.length; j++) {
            for (let i = 1; i <= a.length; i++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j - 1][i] + 1,     // Deletion
                    matrix[j][i - 1] + 1,     // Insertion
                    matrix[j - 1][i - 1] + cost // Substitution
                );
            }
        }

        return matrix[b.length][a.length];
    }


    // --- START THE APP ---
    init();

    // --- NEW: Drag and Drop Handlers ---

    function handleDragStart(e) {
        if (!e.target.classList.contains('card-editor-row')) return;
        app.draggedItem = e.target;
        // Set data (optional, but good practice)
        e.dataTransfer.setData('text/plain', null); 
        // Add styling class after a short delay
        setTimeout(() => {
            if (app.draggedItem) {
                app.draggedItem.classList.add('dragging');
            }
        }, 0);
    }

    function handleDragOver(e) {
        e.preventDefault(); // Necessary to allow dropping
        const container = dom.cardEditorList;
        const afterElement = getDragAfterElement(container, e.clientY);
        
        if (afterElement == null) {
            if (app.draggedItem) {
                container.appendChild(app.draggedItem);
            }
        } else {
            if (app.draggedItem) {
                container.insertBefore(app.draggedItem, afterElement);
            }
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        // Logic is handled in dragover, just update numbers
        updateCardRowNumbers();
    }

    function handleDragEnd() {
        if (app.draggedItem) {
            app.draggedItem.classList.remove('dragging');
        }
        app.draggedItem = null;
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.card-editor-row:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

});
