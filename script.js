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
        matchSessionCards: [], // NEW: Cards for the current match session
        currentCardIndex: 0,
        currentMode: 'flashcards', // 'flashcards', 'learn', 'type', 'match', 'create', 'empty'
        currentLearnCard: null,
        currentTypeCard: null, // NEW
        lastTypeCard: null, // NEW: For the override button
        
        // NEW: Match game state
        selectedTerm: null,
        selectedDef: null,
        matchTimerInterval: null,
        matchStartTime: 0,
        matchItemsLeft: 0,
        matchBestTime: Infinity, // NEW
        matchStorageKey: 'flashcardAppMatchBestTime', // NEW
        isCheckingMatch: false, // Prevents double-clicks

        progressData: new Map(), // Stores progress keyed by 'term|definition'
        localStorageKey: 'flashcardAppProgress',
        themeKey: 'flashcardAppTheme',
        toastTimeout: null,
        correctAnswerTimeout: null, // NEW: For auto-advancing on correct
        isAnimating: false,
        draggedItem: null, // For drag and drop
        createMode: 'manual', // 'manual' or 'paste'
        // NEW: Swipe navigation
        touchStartX: 0,
        touchStartY: 0,
        touchEndX: 0,
        touchEndY: 0
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
        learnFeedbackContainer: document.getElementById('learn-feedback-container'), // MODIFIED
        learnFeedback: document.getElementById('learn-feedback'),
        learnFeedbackMessage: document.getElementById('learn-feedback-message'), // NEW
        learnContinueButton: document.getElementById('learn-continue-button'), // NEW
        learnCompleteView: document.getElementById('learn-complete-view'),
        learnRestartButton: document.getElementById('learn-restart-button'),
        // MODIFIED: Corrected the ID to match the HTML
        learnSwitchModeButton: document.getElementById('learn-switch-mode-button'), 

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
        typeFeedbackContainer: document.getElementById('type-feedback-container'), // MODIFIED
        typeFeedback: document.getElementById('type-feedback'),
        typeFeedbackMessage: document.getElementById('type-feedback-message'),
        typeFeedbackCorrectAnswer: document.getElementById('type-feedback-correct-answer'),
        typeOverrideWrongButton: document.getElementById('type-override-wrong-button'), // MODIFIED
        typeOverrideCorrectButton: document.getElementById('type-override-correct-button'), // NEW
        typeContinueButton: document.getElementById('type-continue-button'), // NEW
        typeRestartButton: document.getElementById('type-restart-button'),
        typeSwitchModeButton: document.getElementById('type-switch-mode-button'),

        // NEW: Match View
        matchView: document.getElementById('match-view'),
        matchModeDisabled: document.getElementById('match-mode-disabled'),
        matchModeGame: document.getElementById('match-mode-game'),
        matchCompleteView: document.getElementById('match-complete-view'),
        matchTimer: document.getElementById('match-timer'),
        matchBestTime: document.getElementById('match-best-time'), // NEW
        matchStartScreen: document.getElementById('match-start-screen'), // NEW
        matchStartButton: document.getElementById('match-start-button'), // NEW
        matchGameArea: document.getElementById('match-game-area'),
        matchTermsList: document.getElementById('match-terms-list'),
        matchDefsList: document.getElementById('match-defs-list'),
        matchRestartButton: document.getElementById('match-restart-button'),

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
    const CORRECT_ANSWER_DELAY = 1000; // NEW: 1 second delay for auto-advance
    const MATCH_INCORRECT_DELAY = 1000; // NEW: Delay for match mode
    const MATCH_ROUND_SIZE = 10; // NEW: Max cards per match round

    // --- CORE LOGIC ---

    /**
     * Initializes the application.
     */
    function init() {
        loadTheme(); // NEW: Load theme first
        loadProgressFromLocalStorage();
        loadBestTimeFromLocalStorage(); // NEW
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
     * NEW: Loads the best match time from localStorage.
     */
    function loadBestTimeFromLocalStorage() {
        try {
            const storedTime = localStorage.getItem(app.matchStorageKey);
            if (storedTime) {
                const parsedTime = parseFloat(storedTime);
                if (!isNaN(parsedTime)) {
                    app.matchBestTime = parsedTime;
                }
            }
        } catch (error) {
            console.error("Error loading best time from localStorage:", error);
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
     * NEW: Saves the best match time to localStorage.
     */
    function saveBestTimeToLocalStorage() {
        try {
            if (app.matchBestTime !== Infinity && !isNaN(app.matchBestTime)) {
                localStorage.setItem(app.matchStorageKey, app.matchBestTime.toString());
            }
        } catch (error) {
            console.error("Error saving best time to localStorage:", error);
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
        
        // NEW: Match mode logic
        } else if (app.currentDeck.cards.length < 2 && mode === 'match') {
            dom.matchModeGame.classList.add('hidden');
            dom.matchCompleteView.classList.add('hidden');
            dom.matchStartScreen.classList.add('hidden'); // NEW
            dom.matchModeDisabled.classList.remove('hidden');
        } else if (mode === 'match') {
            dom.matchModeDisabled.classList.add('hidden');
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

        // ***** START PROGRESS RESET FIX *****
        const previousMode = app.currentMode; // Store the old mode
        app.currentMode = mode;
        dom.body.dataset.mode = mode;
        // ***** END PROGRESS RESET FIX *****

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
            
            // ***** START PROGRESS RESET FIX *****
            // Only reset the card index if we are coming from a DIFFERENT mode.
            // If we are just re-loading the flashcard view (e.g., from modal close),
            // keep the current index.
            if (previousMode !== 'flashcards') {
                app.currentCardIndex = 0;
            }
            // *Always* render and reset the flip state, just don't reset the index.
            // ***** END PROGRESS RESET FIX *****
            
            renderFlashcardContent();
            dom.flashcardContainer.classList.remove('is-flipped');
        } else if (mode === 'learn') {
            // Now that studyDeck is ready, start learn mode
            // This check is needed again in case the mode was set programmatically
            if (app.currentDeck.cards.length >= 4) {
                 // MODIFIED: Only start a new session if one isn't active
                 if (app.learnSessionCards.length === 0 || previousMode !== 'learn') {
                    startLearnMode();
                 }
                 // If a session is active (length > 0), do nothing.
                 // This preserves the user's progress when switching tabs.
            }
        // NEW: Start type mode
        } else if (mode === 'type') {
            if (app.currentDeck.cards.length >= 1) {
                if (app.typeSessionCards.length === 0 || previousMode !== 'type') {
                    startTypeMode();
                }
            }
        // NEW: Start match mode
        } else if (mode === 'match') {
            if (app.currentDeck.cards.length >= 2) {
                // MODIFIED: Handle preserving state vs. starting new
                if (previousMode !== 'match') {
                    startMatchMode(); // This will show the start screen
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

        // NEW: Swipe navigation for flashcards
        dom.flashcardContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
        dom.flashcardContainer.addEventListener('touchmove', handleTouchMove, { passive: true });
        dom.flashcardContainer.addEventListener('touchend', handleTouchEnd);
        
        // NEW: Global keydown listener for spacebar
        document.addEventListener('keydown', handleGlobalKeydown);

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
        // MODIFIED: Added check for null in case element doesn't exist
        if (dom.learnRestartButton) {
            dom.learnRestartButton.addEventListener('click', startLearnMode);
        }
        if (dom.learnSwitchModeButton) {
            // MODIFIED: Changed to 'match'
            dom.learnSwitchModeButton.addEventListener('click', () => setMode('match'));
        }
        
        // NEW: Continue button listener (MODIFIED for timer)
        if (dom.learnContinueButton) {
            dom.learnContinueButton.addEventListener('click', () => {
                if (app.correctAnswerTimeout) { // Clear auto-advance timer
                    clearTimeout(app.correctAnswerTimeout);
                    app.correctAnswerTimeout = null;
                }
                renderLearnQuestion(); // Advance manually
            });
        }

        // NEW: Type Mode Listeners
        // MODIFIED: Added checks for null to prevent script crash
        if (dom.typeInputForm) {
            dom.typeInputForm.addEventListener('submit', handleTypeAnswer);
        }
        if (dom.typeSubmitButton) {
            dom.typeSubmitButton.addEventListener('click', handleTypeAnswer);
        }
        if (dom.typeOverrideWrongButton) {
            dom.typeOverrideWrongButton.addEventListener('click', handleTypeOverrideWrong);
        }
        if (dom.typeOverrideCorrectButton) {
            dom.typeOverrideCorrectButton.addEventListener('click', handleTypeOverrideCorrect);
        }
        if (dom.typeRestartButton) {
            dom.typeRestartButton.addEventListener('click', startTypeMode);
        }
        if (dom.typeSwitchModeButton) {
            // MODIFIED: Changed to 'flashcards'
            dom.typeSwitchModeButton.addEventListener('click', () => setMode('flashcards'));
        }
        
        // NEW: Continue button listener (MODIFIED for timer)
        if (dom.typeContinueButton) {
            dom.typeContinueButton.addEventListener('click', () => {
                if (app.correctAnswerTimeout) { // Clear auto-advance timer
                    clearTimeout(app.correctAnswerTimeout);
                    app.correctAnswerTimeout = null;
                }
                renderTypeQuestion(); // Advance manually
            });
        }

        // NEW: Match Mode Listeners
        if (dom.matchRestartButton) {
            dom.matchRestartButton.addEventListener('click', startMatchMode);
        }
        if (dom.matchStartButton) { // NEW
            dom.matchStartButton.addEventListener('click', startMatchRound);
        }
        if (dom.matchGameArea) {
            dom.matchGameArea.addEventListener('click', handleMatchClick);
        }
    }

    /**
     * NEW: Handles global keydown events for shortcuts.
     */
    function handleGlobalKeydown(e) {
        // Don't interfere with typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        if (e.code === 'Space') {
            e.preventDefault(); // Stop page from scrolling

            if (app.currentMode === 'flashcards') {
                // Flip flashcard
                if (!app.isAnimating) {
                    dom.flashcardContainer.classList.toggle('is-flipped');
                }
            } else if (app.currentMode === 'learn' && !dom.learnContinueButton.classList.contains('hidden')) {
                // Advance in Learn mode if continue button is visible
                if (app.correctAnswerTimeout) { // Clear auto-advance timer
                    clearTimeout(app.correctAnswerTimeout);
                    app.correctAnswerTimeout = null;
                }
                renderLearnQuestion();
            } else if (app.currentMode === 'type' && !dom.typeContinueButton.classList.contains('hidden')) {
                // Advance in Type mode if continue button is visible
                if (app.correctAnswerTimeout) { // Clear auto-advance timer
                    clearTimeout(app.correctAnswerTimeout);
                    app.correctAnswerTimeout = null;
                }
                renderTypeQuestion();
            }
        }
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
        // NEW: Force-reset match session
        if (app.currentMode === 'match') {
            app.matchSessionCards = [];
        }

        // If mode is flashcards or learn, reset the view to apply changes
        if (app.currentMode === 'flashcards' || app.currentMode === 'learn' || app.currentMode === 'match') {
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
        app.currentCardIndex = 0; // ***** PROGRESS RESET FIX *****
    }

    function handleStartWithSettingChange() {
        app.currentDeck.settings.termFirst = !app.currentDeck.settings.termFirst;
        updateSettingsToggle(dom.settingToggleStartWith, app.currentDeck.settings.termFirst, "Term", "Definition");
        updateURLHash();
        app.currentCardIndex = 0; // ***** PROGRESS RESET FIX *****
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
            // 3. ***** START FIX V3 *****
            // Temporarily disable ONLY transform transition
            dom.flashcardContainer.style.transition = 'opacity 0.2s ease-in-out';
            
            // 4. Change content
            app.currentCardIndex = (app.currentCardIndex - 1 + app.studyDeck.length) % app.studyDeck.length;
            renderFlashcardContent(); // Update text
            
            // 5. Instantly remove 'is-flipped' (so it's on the front face)
            dom.flashcardContainer.classList.remove('is-flipped');
            
            // 6. Force reflow 
            void dom.flashcardContainer.offsetWidth; 

            // 7. Re-enable all transitions
            dom.flashcardContainer.style.transition = ''; 
            // ***** END FIX V3 *****
            
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
            // 3. ***** START FIX V3 *****
            // Temporarily disable ONLY transform transition
            dom.flashcardContainer.style.transition = 'opacity 0.2s ease-in-out';
            
            // 4. Change content
            app.currentCardIndex = (app.currentCardIndex + 1) % app.studyDeck.length;
            renderFlashcardContent(); // Update text
            
            // 5. Instantly remove 'is-flipped' (so it's on the front face)
            dom.flashcardContainer.classList.remove('is-flipped');
            
            // 6. Force reflow 
            void dom.flashcardContainer.offsetWidth; 

            // 7. Re-enable all transitions
            dom.flashcardContainer.style.transition = '';
            // ***** END FIX V3 *****
            
            // 8. Fade in
            dom.flashcardContainer.style.opacity = 1;

            // 9. Allow new animations
            setTimeout(() => {
                app.isAnimating = false;
            }, 200); // Wait for fade in
        }, 200); // Wait for fade out
    }

    // --- NEW: Swipe Navigation Handlers ---
    
    /**
     * Records the start of a touch event for swiping
     */
    function handleTouchStart(e) {
        app.touchStartX = e.changedTouches[0].screenX;
        app.touchStartY = e.changedTouches[0].screenY;
        // Reset end coordinates
        app.touchEndX = 0; 
        app.touchEndY = 0;
    }

    /**
     * Records the movement of a touch (needed for touchend)
     */
    function handleTouchMove(e) {
        app.touchEndX = e.changedTouches[0].screenX;
        app.touchEndY = e.changedTouches[0].screenY;
    }

    /**
     * Determines if a swipe occurred and navigates cards
     */
    function handleTouchEnd(e) {
        // Check if touch moved significantly
        if (app.touchEndX === 0) {
            // No 'touchmove' event fired, so this is a tap.
            // Allow the 'click' event to proceed for flipping.
            return; 
        }

        const dx = app.touchEndX - app.touchStartX;
        const dy = app.touchEndY - app.touchStartY;
        const threshold = 75; // Min pixels for a swipe
        
        // Check if horizontal swipe is dominant and passes threshold
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
            // Horizontal swipe detected
            if (dx > 0) {
                // Swipe Right (Previous Card)
                showPrevCard();
            } else {
                // Swipe Left (Next Card)
                showNextCard();
            }
            
            // This was a swipe, so prevent the 'click' event from flipping the card
            e.preventDefault(); 
        }

        // Reset start coordinates for the next touch
        app.touchStartX = 0;
        app.touchStartY = 0;
        // Note: End coordinates are reset in touchstart
    }


    // --- LEARN MODE ---

    function startLearnMode() {
        // MODIFIED: Use studyDeck
        if (app.studyDeck.length < 4) return;
        dom.learnFeedbackContainer.classList.add('hidden'); // MODIFIED
        dom.learnCompleteView.classList.add('hidden'); // NEW: Hide complete view
        dom.learnModeQuiz.classList.remove('hidden'); // NEW: Show quiz view
        
        app.learnSessionCards = [...app.studyDeck]; // NEW: Create session list
        shuffleArray(app.learnSessionCards); // NEW: Shuffle session list
        
        renderLearnQuestion();
    }



    function renderLearnQuestion() {
        // NEW: Clear any pending auto-advance
        if (app.correctAnswerTimeout) {
            clearTimeout(app.correctAnswerTimeout);
            app.correctAnswerTimeout = null;
        }

        // NEW: Hide continue button
        dom.learnContinueButton.classList.add('hidden');
        
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
        
        dom.learnFeedbackContainer.classList.add('hidden'); // MODIFIED
        dom.learnFeedback.classList.remove('correct', 'incorrect');
        dom.learnFeedbackMessage.textContent = ''; // MODIFIED: Clear message

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
        if (app.correctAnswerTimeout) { // Clear any existing timer
            clearTimeout(app.correctAnswerTimeout);
            app.correctAnswerTimeout = null;
        }

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
            dom.learnFeedbackMessage.textContent = "Correct!";
            dom.learnFeedback.classList.add('correct');
            dom.learnFeedback.classList.remove('incorrect');
            
            // NEW: Start auto-advance timer
            app.correctAnswerTimeout = setTimeout(renderLearnQuestion, CORRECT_ANSWER_DELAY);
        } else {
            app.learnSessionCards.push(app.learnSessionCards.shift()); // NEW: Move incorrect card to back
            updateCardProgress(app.currentLearnCard, false); // MODIFIED
            // MODIFIED: Show the correct answer in the feedback
            dom.learnFeedbackMessage.textContent = "Incorrect. The correct answer is: " + correctAnswer;
            dom.learnFeedback.classList.add('incorrect');
            dom.learnFeedback.classList.remove('correct');
            // NEW: No timer for incorrect answers
        }
        
        // Note: app.currentLearnCard is an object from the studyDeck, but it's
        // a reference to the *same object* in app.currentDeck.cards,
        // so progress updates correctly.
        dom.learnFeedbackContainer.classList.remove('hidden'); // MODIFIED
        dom.learnContinueButton.classList.remove('hidden'); // NEW: Show continue button

        saveProgressToLocalStorage();
        // MODIFIED: Removed setTimeout to wait for user input
    }

    // --- NEW: TYPE MODE ---

    /**
     * Starts a new "Type" mode session.
     */
    function startTypeMode() {
        if (app.studyDeck.length < 1) return; // Need at least 1 card
        
        dom.typeFeedbackContainer.classList.add('hidden'); // MODIFIED
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
        // NEW: Clear any pending auto-advance
        if (app.correctAnswerTimeout) {
            clearTimeout(app.correctAnswerTimeout);
            app.correctAnswerTimeout = null;
        }

        // NEW: Hide continue button
        dom.typeContinueButton.classList.add('hidden');
        
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
        dom.typeInputArea.focus(); // NEW: Focus input
        dom.typeFeedbackContainer.classList.add('hidden'); // MODIFIED
        dom.typeFeedback.classList.remove('correct', 'incorrect', 'close'); // <-- THE FIX
        
        // MODIFIED: Explicitly clear feedback text
        dom.typeFeedbackMessage.textContent = '';
        dom.typeFeedbackCorrectAnswer.textContent = '';
        
        dom.typeOverrideWrongButton.classList.add('hidden'); 
        dom.typeOverrideCorrectButton.classList.add('hidden'); 
    } 

    /**
     * Handles the user submitting a typed answer.
     */
    function handleTypeAnswer(e) {
        if (e) e.preventDefault(); // Stop form submission
        if (dom.typeInputArea.disabled) return; // Prevent double-submit

        // NEW: Clear any pending auto-advance
        if (app.correctAnswerTimeout) {
            clearTimeout(app.correctAnswerTimeout);
            app.correctAnswerTimeout = null;
        }

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
        dom.typeFeedbackContainer.classList.remove('hidden'); // MODIFIED
        dom.typeFeedback.classList.remove('correct', 'incorrect', 'close'); // MODIFIED
        dom.typeOverrideWrongButton.classList.add('hidden'); // MODIFIED
        dom.typeOverrideCorrectButton.classList.add('hidden'); // NEW

        if (distance === 0) {
            // --- Perfect Match ---
            dom.typeFeedback.classList.add('correct');
            dom.typeFeedbackMessage.textContent = "Correct!";
            dom.typeFeedbackCorrectAnswer.textContent = '';
            
            updateCardProgress(app.currentTypeCard, true);
            app.typeSessionCards.shift(); // Remove from session

            // NEW: Start auto-advance timer
            app.correctAnswerTimeout = setTimeout(renderTypeQuestion, CORRECT_ANSWER_DELAY);

        } else if (distance <= TYPE_CLOSE_THRESHOLD) {
            // --- Close Match ---
            dom.typeFeedback.classList.add('close');
            dom.typeFeedbackMessage.textContent = "Close!";
            dom.typeFeedbackCorrectAnswer.textContent = `Correct answer: ${correctAnswer}`;
            dom.typeOverrideWrongButton.classList.remove('hidden'); // MODIFIED

            // Assume correct, but cache the card in case of override
            updateCardProgress(app.currentTypeCard, true);
            app.lastTypeCard = app.typeSessionCards.shift(); // Remove and store

            // NEW: Start auto-advance timer
            app.correctAnswerTimeout = setTimeout(renderTypeQuestion, CORRECT_ANSWER_DELAY);

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

            // NEW: No timer for incorrect answers
        }

        saveProgressToLocalStorage();
        
        // MODIFIED: Show continue button instead of using timeout
        dom.typeContinueButton.classList.remove('hidden');
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

    // --- NEW: MATCH MODE ---

    /**
     * MODIFIED: Starts the entire Match mode session by showing the start screen.
     */
    function startMatchMode() {
        if (app.studyDeck.length < 2) return;
        
        // Hide game and complete, show start screen
        dom.matchCompleteView.classList.add('hidden');
        dom.matchModeGame.classList.add('hidden');
        dom.matchStartScreen.classList.remove('hidden');

        // Reset session cards
        app.matchSessionCards = [...app.studyDeck]; // Create session list
        shuffleArray(app.matchSessionCards); // Shuffle session list

        // Update best time display
        updateBestTimeDisplay();
    }

    /**
     * NEW: Updates the best time display.
     */
    function updateBestTimeDisplay() {
        if (app.matchBestTime === Infinity) {
            dom.matchBestTime.textContent = 'Best: --.-s';
        } else {
            dom.matchBestTime.textContent = `Best: ${app.matchBestTime.toFixed(1)}s`;
        }
    }


    /**
     * MODIFIED: Starts a new round of the Match game (called by Start button).
     */
    function startMatchRound() {
        // Hide start screen, show game
        dom.matchStartScreen.classList.add('hidden');
        dom.matchModeGame.classList.remove('hidden');
        dom.matchCompleteView.classList.add('hidden');

        // Clear any existing timer
        if (app.matchTimerInterval) {
            clearInterval(app.matchTimerInterval);
            app.matchTimerInterval = null;
        }

        // Reset selections
        app.selectedTerm = null;
        app.selectedDef = null;
        app.isCheckingMatch = false;

        // Get cards for this round
        const roundCards = app.matchSessionCards.slice(0, MATCH_ROUND_SIZE);
        app.matchItemsLeft = roundCards.length;
        
        // Check if there are enough cards to play
        if (app.matchItemsLeft < 2) {
            dom.matchModeGame.classList.add('hidden');
            dom.matchCompleteView.classList.remove('hidden');
            // This case handles finishing the entire set
            return;
        }

        // Prepare lists
        let termItems = [];
        let defItems = [];

        for (const card of roundCards) {
            // Use card.id to link term and definition
            termItems.push(`<div class="match-item" data-id="${card.id}">${card.term}</div>`);
            defItems.push(`<div class="match-item" data-id="${card.id}">${card.definition}</div>`);
        }

        // Shuffle lists independently
        shuffleArray(termItems);
        shuffleArray(defItems);

        // Populate HTML
        dom.matchTermsList.innerHTML = termItems.join('');
        dom.matchDefsList.innerHTML = defItems.join('');

        // Start timer
        app.matchStartTime = Date.now();
        dom.matchTimer.textContent = '0.0s';
        app.matchTimerInterval = setInterval(updateMatchTimer, 100);
    }

    /**
     * Updates the match timer display.
     */
    function updateMatchTimer() {
        const elapsed = (Date.now() - app.matchStartTime) / 1000;
        dom.matchTimer.textContent = `${elapsed.toFixed(1)}s`;
    }

    /**
     * Handles clicks within the match game area.
     */
    function handleMatchClick(e) {
        const item = e.target.closest('.match-item');

        // Ignore if already matched, during an incorrect-check, or not a match item
        if (!item || item.classList.contains('correct') || app.isCheckingMatch) {
            return;
        }

        const list = item.parentElement;

        if (list.id === 'match-terms-list') {
            // Clicked on a term
            if (app.selectedTerm) {
                app.selectedTerm.classList.remove('selected');
            }
            app.selectedTerm = item;
            item.classList.add('selected');

        } else if (list.id === 'match-defs-list') {
            // Clicked on a definition
            if (app.selectedDef) {
                app.selectedDef.classList.remove('selected');
            }
            app.selectedDef = item;
            item.classList.add('selected');
        }

        // If both a term and a definition are selected, check the match
        if (app.selectedTerm && app.selectedDef) {
            checkMatch();
        }
    }

    /**
     * Checks if the selected term and definition match.
     */
    function checkMatch() {
        app.isCheckingMatch = true; // Lock clicking
        const term = app.selectedTerm;
        const def = app.selectedDef;
        const cardId = term.dataset.id;

        // Find the card in the session
        const cardIndex = app.matchSessionCards.findIndex(c => c.id === cardId);
        const card = cardIndex > -1 ? app.matchSessionCards[cardIndex] : null;

        if (term.dataset.id === def.dataset.id) {
            // --- CORRECT MATCH ---
            term.classList.remove('selected');
            def.classList.remove('selected');
            term.classList.add('correct');
            def.classList.add('correct');

            app.matchItemsLeft--;
            
            if (card) {
                updateCardProgress(card, true);
                app.matchSessionCards.splice(cardIndex, 1); // Remove from session
            }

            // Check if round is complete
            if (app.matchItemsLeft === 0) {
                clearInterval(app.matchTimerInterval);
                app.matchTimerInterval = null; // NEW: Clear interval ID
                saveProgressToLocalStorage();

                // NEW: Best Time Logic
                const finalTime = (Date.now() - app.matchStartTime) / 1000;
                if (finalTime < app.matchBestTime) {
                    app.matchBestTime = finalTime;
                    saveBestTimeToLocalStorage();
                    updateBestTimeDisplay();
                    showToast(`New best time: ${finalTime.toFixed(1)}s!`);
                }
                
                // MODIFIED: Check if there are more cards for another round
                if (app.matchSessionCards.length >= 2) {
                    // More cards, start next round
                    setTimeout(startMatchRound, 1000); 
                } else {
                    // No more cards, show final complete screen
                    setTimeout(() => {
                        dom.matchModeGame.classList.add('hidden');
                        dom.matchCompleteView.classList.remove('hidden');
                    }, 1000); // Wait 1 sec
                }
            }
            
            app.isCheckingMatch = false; // Unlock

        } else {
            // --- INCORRECT MATCH ---
            term.classList.remove('selected');
            def.classList.remove('selected');
            term.classList.add('incorrect');
            def.classList.add('incorrect');

            if (card) {
                updateCardProgress(card, false);
                // Move card to the end of the session
                app.matchSessionCards.push(app.matchSessionCards.splice(cardIndex, 1)[0]);
            }
            
            saveProgressToLocalStorage();

            // Reset after a delay
            setTimeout(() => {
                term.classList.remove('incorrect');
                def.classList.remove('incorrect');
                app.isCheckingMatch = false; // Unlock
            }, MATCH_INCORRECT_DELAY);
        }

        // Reset selections
        app.selectedTerm = null;
        app.selectedDef = null;
    }

    // --- END MATCH MODE ---


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
            showToast("An error occurred while trying to load the new deck. Try Removing Special Characters.");
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
    
    /**
     * NEW: Updates the URL hash without reloading the page.
     * Used for saving settings.
     */
    function updateURLHash() {
        try {
            // Create base deck from app.currentDeck, including settings
            const baseDeck = {
                title: app.currentDeck.title,
                cards: app.currentDeck.cards.map(({ term, definition }) => ({ term, definition })),
                settings: app.currentDeck.settings
            };
            const jsonString = JSON.stringify(baseDeck);
            const base64String = btoa(jsonString);
            // Use history.replaceState to avoid adding to browser history
            history.replaceState(null, '', `#${base64String}`);
        } catch (error) {
            console.error("Error updating hash:", error);
            showToast("Error saving settings.");
        }
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
