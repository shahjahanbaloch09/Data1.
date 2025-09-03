// --- SERVICE WORKER REGISTRATION ---
// Registers the service worker to enable PWA features like offline caching.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => console.log('ServiceWorker registration successful'))
            .catch(err => console.log('ServiceWorker registration failed: ', err));
    });
}

// --- MAIN APPLICATION LOGIC ---
// An IIFE (Immediately Invoked Function Expression) is used to encapsulate the entire
// application, preventing pollution of the global scope.
document.addEventListener('DOMContentLoaded', () => {
(function() {

    // --- APPLICATION STATE ---
    // A centralized object to hold the application's current state.
    const state = {
        db: null, // Holds the IndexedDB database connection.
        draggedElement: null, // Tracks the element being dragged in the builder.
        currentUser: null, // Tracks the currently logged-in user.
    };

    // --- DOM ELEMENT REFERENCES ---
    // Caching frequently accessed DOM elements for better performance.
    const appContainer = document.getElementById('app-container');
    const modalContainer = document.getElementById('modal-container');
    const headerAuthActions = document.getElementById('header-auth-actions');

    // --- SVG ICONS ---
    // Storing SVG icons as functions makes them reusable and keeps the HTML clean.
    const ICONS = {
        plus: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>`,
        trash: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.144-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.057-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>`,
        drag: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>`,
        edit: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>`,
        collect: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
        responses: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125H6.75m13.5 0S21 17.625 21 15.75v-1.5c0-.621-.504-1.125-1.125-1.125H17.25m-13.5 0h13.5m-13.5 0a1.125 1.125 0 01-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125H6.75m13.5 0S21 11.625 21 9.75v-1.5c0-.621-.504-1.125-1.125-1.125H17.25m-13.5 0h13.5m-13.5 0a1.125 1.125 0 01-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125H6.75m0 0a1.125 1.125 0 011.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125H3.375m0 0a1.125 1.125 0 01-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125H6.75" /></svg>`,
    };

    // --- DATABASE MODULE (IndexedDB) ---
    // This module handles all interactions with the IndexedDB database.
    const DB = {
        // Initializes the database connection.
        init() {
            return new Promise((resolve, reject) => {
                // Bumping DB version to 2 to introduce user-scoping for surveys.
                const request = indexedDB.open('SurveyCollectorDB', 2);

                request.onupgradeneeded = event => {
                    const db = event.target.result;
                    // Create 'surveys' store if it doesn't exist
                    if (!db.objectStoreNames.contains('surveys')) {
                        const surveyStore = db.createObjectStore('surveys', { keyPath: 'id', autoIncrement: true });
                        surveyStore.createIndex('userEmail', 'userEmail', { unique: false });
                    } else if (event.oldVersion < 2) { // Handle upgrade from v1 to v2
                         const transaction = event.target.transaction;
                         const surveyStore = transaction.objectStore('surveys');
                         if (!surveyStore.indexNames.contains('userEmail')) {
                             surveyStore.createIndex('userEmail', 'userEmail', { unique: false });
                         }
                    }

                    // Create 'responses' store if it doesn't exist
                    if (!db.objectStoreNames.contains('responses')) {
                        const responseStore = db.createObjectStore('responses', { keyPath: 'id', autoIncrement: true });
                        responseStore.createIndex('surveyId', 'surveyId', { unique: false });
                    }
                };

                request.onsuccess = event => {
                    state.db = event.target.result;
                    console.log('Database initialized successfully.');
                    resolve(state.db);
                };

                request.onerror = event => {
                    console.error('Database error:', event.target.error);
                    reject(event.target.error);
                };
            });
        },
        
        // Generic method to perform a database transaction.
        _transaction(storeName, mode, callback) {
            return new Promise((resolve, reject) => {
                if (!state.db) return reject('Database not initialized.');
                const transaction = state.db.transaction(storeName, mode);
                const store = transaction.objectStore(storeName);
                callback(store, resolve, reject);
            });
        },

        // --- Survey Methods (Now user-scoped) ---
        saveSurvey: (survey) => {
            if (state.currentUser) {
                survey.userEmail = state.currentUser.email; // Automatically add user email
            }
            return DB._transaction('surveys', 'readwrite', (store, res) => {
                const request = store.put(survey);
                request.onsuccess = () => res(request.result);
            });
        },
        getSurvey: (id) => DB._transaction('surveys', 'readonly', (store, res) => {
            store.get(id).onsuccess = e => res(e.target.result);
        }),
        getSurveysForUser: (userEmail) => DB._transaction('surveys', 'readonly', (store, res) => {
            const index = store.index('userEmail');
            index.getAll(userEmail).onsuccess = e => res(e.target.result);
        }),
        deleteSurvey: (id) => DB._transaction('surveys', 'readwrite', (store, res) => {
            store.delete(id).onsuccess = () => res();
        }),

        // --- Response Methods ---
        addResponse: (response) => DB._transaction('responses', 'readwrite', (store, res) => {
            store.add(response).onsuccess = () => res();
        }),
        getResponsesForSurvey: (surveyId) => DB._transaction('responses', 'readonly', (store, res) => {
            const index = store.index('surveyId');
            index.getAll(surveyId).onsuccess = e => res(e.target.result);
        }),
        getResponse: (id) => DB._transaction('responses', 'readonly', (store, res) => {
            store.get(id).onsuccess = e => res(e.target.result);
        }),
    };
    
    // --- UI MODULE ---
    // This module handles rendering content to the DOM.
    const UI = {
        // Renders a page template into the main app container.
        renderPage(html) {
            appContainer.innerHTML = html;
        },

        // Renders a modal into the modal container.
        renderModal(html) {
            modalContainer.innerHTML = html;
        },

        // Clears the modal container.
        closeModal() {
            modalContainer.innerHTML = '';
        },

        renderHeaderAuth() {
            if (state.currentUser) {
                headerAuthActions.innerHTML = `<button class="btn btn-secondary" data-action="sign-out">Sign Out</button>`;
            } else {
                headerAuthActions.innerHTML = '';
            }
        },

        renderAuthPage() {
            this.renderPage(`
                <div class="auth-container">
                    <div class="glass-card">
                        <div class="auth-toggle">
                            <button class="auth-toggle-btn active" data-form="signin-form">Sign In</button>
                            <button class="auth-toggle-btn" data-form="signup-form">Sign Up</button>
                        </div>
    
                        <form id="signin-form" class="auth-form active">
                            <div class="form-group">
                                <label for="signin-email" class="form-label">Email</label>
                                <input type="email" id="signin-email" class="form-input" required autocomplete="email">
                            </div>
                            <div class="form-group">
                                <label for="signin-password" class="form-label">Password</label>
                                <input type="password" id="signin-password" class="form-input" required autocomplete="current-password">
                            </div>
                            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Sign In</button>
                        </form>
    
                        <form id="signup-form" class="auth-form">
                             <div class="form-group">
                                <label for="signup-email" class="form-label">Email</label>
                                <input type="email" id="signup-email" class="form-input" required autocomplete="email">
                            </div>
                            <div class="form-group">
                                <label for="signup-password" class="form-label">Password</label>
                                <input type="password" id="signup-password" class="form-input" required minlength="6" autocomplete="new-password">
                            </div>
                            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Create Account</button>
                        </form>
                    </div>
                </div>
            `);
        },
        
        // --- Page Renderers ---

        async renderDashboard() {
            if (!state.currentUser) return;
            const surveys = await DB.getSurveysForUser(state.currentUser.email);
            const surveysWithCounts = await Promise.all(surveys.map(async survey => {
                const responses = await DB.getResponsesForSurvey(survey.id);
                return { ...survey, responseCount: responses.length };
            }));

            const surveyCards = surveysWithCounts.length > 0 ? surveysWithCounts.map(s => `
                <div class="glass-card">
                    <h3 class="survey-card-title">${s.metadata.title || 'Untitled Survey'}</h3>
                    <p class="survey-card-meta">${s.responseCount} response(s) | Last updated: ${new Date(s.lastUpdated).toLocaleDateString()}</p>
                    <div class="survey-card-actions">
                        <a href="#/collect/${s.id}" class="btn btn-primary">${ICONS.collect} Collect</a>
                        <a href="#/responses/${s.id}" class="btn btn-secondary">${ICONS.responses} View Responses</a>
                        <a href="#/builder/${s.id}" class="btn btn-secondary">${ICONS.edit} Edit</a>
                    </div>
                </div>
            `).join('') : `
                <div class="empty-state glass-card">
                    <div class="empty-state-icon">📝</div>
                    <h2 class="empty-state-title">No Surveys Yet</h2>
                    <p class="empty-state-text">Create your first survey to start collecting data.</p>
                    <button data-action="create-survey" class="btn btn-primary">${ICONS.plus} Create First Survey</button>
                </div>`;

            this.renderPage(`
                <div class="page" id="page-dashboard">
                    <header class="page-header">
                        <h2 class="page-title">Dashboard</h2>
                        <p class="page-subtitle">Your research projects at a glance.</p>
                        ${surveys.length > 0 ? `<button data-action="create-survey" class="btn btn-primary" style="margin-top: 1rem;">${ICONS.plus} Create New Survey</button>` : ''}
                    </header>
                    <div class="dashboard-grid">${surveyCards}</div>
                </div>
            `);
        },

        async renderBuilder(surveyId) {
            const survey = surveyId === 'new' ? null : await DB.getSurvey(parseInt(surveyId));
            const questions = survey ? survey.questions : [];
            
            const questionTypes = [
                { type: 'short_text', label: 'Short Text' }, { type: 'long_text', label: 'Long Text' },
                { type: 'number', label: 'Number' }, { type: 'date', label: 'Date' },
                { type: 'radio', label: 'Single Choice' }, { type: 'checkbox', label: 'Multi Choice' },
                { type: 'dropdown', label: 'Dropdown' }, { type: 'likert', label: 'Likert Scale' },
                { type: 'rating', label: 'Star Rating' }
            ];

            const html = `
                <div class="page" id="page-builder" data-survey-id="${survey?.id || 'new'}">
                    <header class="page-header">
                        <a href="#/" class="btn btn-secondary" style="margin-bottom: 1rem;">&larr; Back to Dashboard</a>
                        <h2 class="page-title">${survey ? 'Edit Survey' : 'Create Survey'}</h2>
                        <p class="page-subtitle">${survey ? 'Modify your survey structure and settings.' : 'Build a new survey from scratch.'}</p>
                    </header>
                    
                    <div class="builder-grid">
                        <div class="glass-card" id="survey-metadata-editor">
                            <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem;">1. Survey Details</h3>
                            <div class="form-group">
                                <label class="form-label" for="meta-title">Project/Study Title</label>
                                <input type="text" id="meta-title" class="form-input" value="${survey?.metadata.title || ''}" placeholder="e.g., Community Health Assessment">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="meta-university">University/Organization</label>
                                <input type="text" id="meta-university" class="form-input" value="${survey?.metadata.university || ''}" placeholder="e.g., National Research University">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="meta-researcher">Researcher Name</label>
                                <input type="text" id="meta-researcher" class="form-input" value="${survey?.metadata.researcher || ''}" placeholder="e.g., Dr. Jane Doe">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="meta-consent">Disclaimer/Consent Text</label>
                                <textarea id="meta-consent" class="form-textarea" placeholder="Explain the purpose of the survey, data privacy, and ask for consent.">${survey?.metadata.consent || ''}</textarea>
                            </div>
                        </div>
                    
                        <div class="glass-card">
                            <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem;">2. Add a Question</h3>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                                ${questionTypes.map(q => `<button class="btn btn-secondary" data-action="add-question" data-type="${q.type}">${q.label}</button>`).join('')}
                            </div>
                        </div>
                        
                        <h3 style="font-size: 1.5rem; font-weight: 600; margin: 1rem 0;">3. Arrange Questions</h3>
                        <div id="question-list">
                            <!-- Questions will be rendered here -->
                        </div>
                    </div>
                </div>
            `;
            this.renderPage(html);
            this.renderQuestionList(questions);
        },
        
        // Renders the list of question cards in the builder
        renderQuestionList(questions) {
            const container = document.getElementById('question-list');
            if (!container) return;
            if (questions.length === 0) {
                container.innerHTML = `<div class="empty-state glass-card"><p>No questions yet. Add one from the panel.</p></div>`;
            } else {
                container.innerHTML = questions.map(q => this.getQuestionCardHtml(q)).join('');
            }
        },

        // Generates HTML for a single question card in the builder
        getQuestionCardHtml(q) {
            const isChoice = ['radio', 'checkbox', 'dropdown', 'likert'].includes(q.type);
            const optionsHtml = isChoice ? `
                <div style="margin-top: 1rem;">
                    <label class="form-label">${q.type === 'likert' ? 'Scale Labels (e.g., Strongly Disagree...)' : 'Options'}</label>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;" data-question-id="${q.id}">
                        ${q.options.map((opt, i) => `
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <input type="text" class="form-input" data-action="update-option" data-index="${i}" value="${opt}" placeholder="Option ${i + 1}">
                                <button class="btn btn-danger" data-action="delete-option" data-index="${i}">${ICONS.trash}</button>
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn btn-secondary" style="margin-top: 0.5rem;" data-action="add-option" data-question-id="${q.id}">+ Add Option</button>
                </div>
            ` : '';
            
            return `
                <div class="glass-card question-card" draggable="true" data-question-id="${q.id}" style="margin-bottom: 1rem;">
                    <div class="drag-handle">${ICONS.drag}</div>
                    <div style="display:flex; justify-content: space-between; align-items: flex-start;">
                        <span style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-secondary);">${q.type.replace('_', ' ')}</span>
                        <button class="btn btn-danger" data-action="delete-question" data-question-id="${q.id}">${ICONS.trash}</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Question Text</label>
                        <input type="text" class="form-input" data-action="update-question-prop" data-prop="text" value="${q.text}" placeholder="Enter your question">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Helper Text (Optional)</label>
                        <input type="text" class="form-input" data-action="update-question-prop" data-prop="helper" value="${q.helper || ''}" placeholder="Additional instructions">
                    </div>
                    ${optionsHtml}
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--glass-border); display:flex; align-items: center; justify-content: flex-end;">
                        <label style="display:flex; align-items: center; cursor: pointer;">
                            <span style="margin-right: 0.75rem; font-weight: 500;">Required</span>
                            <input type="checkbox" data-action="update-question-prop" data-prop="required" style="height: 1.25rem; width: 1.25rem;" ${q.required ? 'checked' : ''}>
                        </label>
                    </div>
                </div>
            `;
        },
        
        async renderTaker(surveyId) {
            const survey = await DB.getSurvey(parseInt(surveyId));
            if (!survey) {
                this.renderPage(`<div class="page" style="text-align: center;"><h2 class="page-title">Survey not found.</h2><a href="#/" class="btn btn-primary" style="margin-top: 1rem;">Go Home</a></div>`);
                return;
            }
            
            // Start with the disclaimer screen
            const disclaimerHtml = `
                <div class="page taker-container" id="taker-disclaimer">
                    <div class="glass-card" style="text-align: center;">
                        <h2 style="font-size: 1.5rem; font-weight: 700;">${survey.metadata.title}</h2>
                        <p style="color: var(--text-secondary); margin-top: 0.5rem;">${survey.metadata.university} by ${survey.metadata.researcher}</p>
                        <div style="margin: 1.5rem 0; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 0.5rem; text-align: left;">
                            <h3 style="font-weight: 700; margin-bottom: 0.5rem;">Consent & Disclaimer</h3>
                            <p style="white-space: pre-wrap;">${survey.metadata.consent}</p>
                        </div>
                        <div style="display: flex; gap: 1rem; justify-content: center;">
                            <a href="#/" class="btn btn-secondary">Cancel</a>
                            <button class="btn btn-primary" data-action="start-survey" data-survey-id="${survey.id}">I Agree, Start Survey</button>
                        </div>
                    </div>
                </div>
            `;
            this.renderPage(disclaimerHtml);
        },

        renderTakerQuestion(survey, questionIndex, answers) {
            const question = survey.questions[questionIndex];
            const progress = ((questionIndex) / survey.questions.length) * 100;
            const answer = answers[question.id] || '';

            let inputHtml = '';
            switch(question.type) {
                case 'short_text': inputHtml = `<input type="text" name="${question.id}" class="form-input" value="${answer}">`; break;
                case 'long_text': inputHtml = `<textarea name="${question.id}" class="form-textarea">${answer}</textarea>`; break;
                case 'number': inputHtml = `<input type="number" name="${question.id}" class="form-input" value="${answer}">`; break;
                case 'date': inputHtml = `<input type="date" name="${question.id}" class="form-input" value="${answer}">`; break;
                case 'radio':
                case 'dropdown':
                    inputHtml = question.options.map(opt => `
                        <label class="taker-option-label"><input type="radio" name="${question.id}" value="${opt}" ${answer === opt ? 'checked' : ''}> ${opt}</label>
                    `).join('');
                    break;
                case 'checkbox':
                    inputHtml = question.options.map(opt => `
                        <label class="taker-option-label"><input type="checkbox" name="${question.id}" value="${opt}" ${(answer || []).includes(opt) ? 'checked' : ''}> ${opt}</label>
                    `).join('');
                    break;
                case 'rating':
                    inputHtml = `<div class="rating-stars" data-question-id="${question.id}">${[1,2,3,4,5].map(i => `<span class="star ${i <= answer ? 'selected' : ''}" data-value="${i}">★</span>`).join('')}</div>
                               <input type="hidden" name="${question.id}" value="${answer}">`;
                    break;
                case 'likert':
                    inputHtml = `<div class="likert-scale">
                        ${question.options.map((opt, i) => `
                            <label><input type="radio" name="${question.id}" value="${i+1}" style="position: absolute; opacity: 0;" ${answer == (i+1) ? 'checked' : ''}><span class="likert-label">${opt}</span></label>
                        `).join('')}
                    </div>`;
                    break;
            }

            const pageHtml = `
                <div class="page taker-container" id="taker-question" data-survey-id="${survey.id}" data-question-index="${questionIndex}">
                    <div class="taker-progress"><div class="taker-progress-bar" style="width: ${progress}%"></div></div>
                    <div class="glass-card">
                        <h3 class="taker-question-title">${question.text} ${question.required ? '<span style="color: #f44336;">*</span>' : ''}</h3>
                        ${question.helper ? `<p style="color: var(--text-secondary); margin-bottom: 1rem;">${question.helper}</p>` : ''}
                        <div class="taker-options">${inputHtml}</div>
                        <div class="taker-nav">
                            <button class="btn btn-secondary" data-action="taker-prev" ${questionIndex === 0 ? 'disabled' : ''}>Previous</button>
                            <button class="btn btn-primary" data-action="taker-next">
                                ${questionIndex === survey.questions.length - 1 ? 'Finish Survey' : 'Next'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
            this.renderPage(pageHtml);
        },

        async renderResponses(surveyId) {
            surveyId = parseInt(surveyId);
            const survey = await DB.getSurvey(surveyId);
            const responses = await DB.getResponsesForSurvey(surveyId);

            const responseListHtml = responses.length > 0 ? responses.map(r => `
                <a href="#/response/${r.id}" class="glass-card" style="display: block; text-decoration: none; color: inherit; margin-bottom: 1rem;">
                    <p style="font-weight: 700;">Response ID: ${r.id}</p>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">Collected on: ${new Date(r.timestamp).toLocaleString()}</p>
                </a>
            `).join('') : `
                <div class="empty-state glass-card">
                    <h2 class="empty-state-title">No Responses Yet</h2>
                    <p class="empty-state-text">Collect data using the survey to see responses here.</p>
                    <a href="#/collect/${surveyId}" class="btn btn-primary">${ICONS.collect} Start Collecting</a>
                </div>`;

            const pageHtml = `
                <div class="page" id="page-responses">
                    <header class="page-header">
                        <a href="#/" class="btn btn-secondary" style="margin-bottom: 1rem;">&larr; Back to Dashboard</a>
                        <h2 class="page-title">Responses for: ${survey.metadata.title}</h2>
                        <p class="page-subtitle">${responses.length} response(s) collected.</p>
                        ${responses.length > 0 ? `
                            <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
                                <button class="btn btn-primary" data-action="export-csv" data-survey-id="${surveyId}">Export as CSV</button>
                                <button class="btn btn-secondary" data-action="export-json" data-survey-id="${surveyId}">Export as JSON</button>
                            </div>
                        ` : ''}
                    </header>
                    <div>${responseListHtml}</div>
                </div>
            `;
            this.renderPage(pageHtml);
        },

        async renderResponseDetail(responseId) {
            responseId = parseInt(responseId);
            const response = await DB.getResponse(responseId);
            const survey = await DB.getSurvey(response.surveyId);

            const answersHtml = survey.questions.map(q => {
                let answer = response.answers[q.id];
                if (Array.isArray(answer)) answer = answer.join(', ');
                if (!answer && answer !== 0) answer = '<em>Not Answered</em>';
                
                return `
                    <div style="padding: 1rem 0; border-bottom: 1px solid var(--glass-border);">
                        <p style="color: var(--text-secondary);">${q.text}</p>
                        <p style="font-size: 1.25rem; font-weight: 600;">${answer}</p>
                    </div>
                `
            }).join('');
            
            const pageHtml = `
                <div class="page" id="page-response-detail">
                     <header class="page-header">
                        <a href="#/responses/${response.surveyId}" class="btn btn-secondary" style="margin-bottom: 1rem;">&larr; Back to Responses</a>
                        <h2 class="page-title">Response Detail (ID: ${response.id})</h2>
                        <p class="page-subtitle">For survey: ${survey.metadata.title}</p>
                        <p style="color: var(--text-secondary); margin-top: 0.5rem;">Collected on: ${new Date(response.timestamp).toLocaleString()}</p>
                    </header>
                    <div class="glass-card">
                        ${answersHtml}
                    </div>
                </div>
            `;
            this.renderPage(pageHtml);
        }
    };
    
    // --- ROUTER MODULE ---
    // A simple hash-based router to navigate between pages.
    const Router = {
        listener: null,
        routes: {
            '/': UI.renderDashboard.bind(UI),
            '/builder/:id': (id) => UI.renderBuilder(id),
            '/collect/:id': (id) => UI.renderTaker(id),
            '/responses/:id': (id) => UI.renderResponses(id),
            '/response/:id': (id) => UI.renderResponseDetail(id),
        },
        
        handle() {
            if (!state.currentUser) {
                UI.renderAuthPage();
                return;
            }
            const path = window.location.hash.slice(1) || '/';
            const parts = path.split('/');
            
            let route = `/${parts[1]}`;
            if (parts[2]) route += '/:id';

            if (this.routes[route]) {
                this.routes[route](parts[2]);
            } else if (this.routes[path]) {
                this.routes[path]();
            } else {
                this.routes['/'](); // Fallback to dashboard
            }
        },

        init() {
            if (this.listener) window.removeEventListener('hashchange', this.listener);
            this.listener = this.handle.bind(this);
            window.addEventListener('hashchange', this.listener);
            this.handle();
        }
    };

    // --- HELPER FUNCTIONS ---
    const Helpers = {
        downloadFile(filename, content, type) {
            const blob = new Blob([content], { type });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
        async exportToCsv(surveyId) {
            const survey = await DB.getSurvey(surveyId);
            const responses = await DB.getResponsesForSurvey(surveyId);
            const headers = ['ResponseID', 'Timestamp', ...survey.questions.map(q => q.text)];
            const rows = responses.map(r => {
                const row = [r.id, new Date(r.timestamp).toISOString()];
                survey.questions.forEach(q => {
                    const answer = r.answers[q.id];
                    const value = Array.isArray(answer) ? answer.join('; ') : answer;
                    row.push(`"${String(value || '').replace(/"/g, '""')}"`);
                });
                return row.join(',');
            });
            const csvContent = [headers.join(','), ...rows].join('\n');
            this.downloadFile(`${survey.metadata.title}_responses.csv`, csvContent, 'text/csv');
        },
        async exportToJson(surveyId) {
            const survey = await DB.getSurvey(surveyId);
            const responses = await DB.getResponsesForSurvey(surveyId);
            const exportData = { survey, responses };
            this.downloadFile(`${survey.metadata.title}_responses.json`, JSON.stringify(exportData, null, 2), 'application/json');
        }
    };
    
    // --- EVENT HANDLERS & APP LOGIC ---
    const App = {
        // --- User Management (INSECURE - for local prototype only) ---
        _getUsers: () => JSON.parse(localStorage.getItem('survey_users')) || [],
        _saveUsers: (users) => localStorage.setItem('survey_users', JSON.stringify(users)),

        handleSignUp(email, password) {
            // WARNING: Storing plain-text passwords is very insecure. This is for local-only prototype.
            const users = this._getUsers();
            if (users.find(u => u.email === email)) {
                alert('An account with this email already exists.');
                return;
            }
            users.push({ email, password });
            this._saveUsers(users);
            alert('Account created! Please sign in.');
            // Toggle to sign-in form
            document.querySelector('.auth-toggle-btn.active').classList.remove('active');
            document.querySelector('[data-form="signin-form"]').classList.add('active');
            document.querySelector('.auth-form.active').classList.remove('active');
            document.getElementById('signin-form').classList.add('active');
            document.getElementById('signin-email').value = email;
            document.getElementById('signin-password').focus();
        },

        handleSignIn(email, password) {
            const users = this._getUsers();
            const user = users.find(u => u.email === email && u.password === password);
            if (user) {
                state.currentUser = { email: user.email };
                sessionStorage.setItem('survey_currentUser', JSON.stringify(state.currentUser));
                this.bootAuthenticatedApp();
            } else {
                alert('Invalid email or password.');
            }
        },

        handleSignOut() {
            state.currentUser = null;
            sessionStorage.removeItem('survey_currentUser');
            window.location.hash = '';
            this.bootUnauthenticatedApp();
        },

        bootAuthenticatedApp() {
            UI.renderHeaderAuth();
            Router.init();
        },

        bootUnauthenticatedApp() {
            UI.renderHeaderAuth();
            appContainer.innerHTML = ''; // Clear main app view
            UI.renderAuthPage();
        },

        // --- Dashboard Logic ---
        async handleCreateSurvey() {
            const newSurvey = {
                metadata: { title: 'Untitled Survey', university: '', researcher: '', consent: '' },
                questions: [],
                lastUpdated: Date.now()
            };
            const id = await DB.saveSurvey(newSurvey);
            window.location.hash = `#/builder/${id}`;
        },

        // --- Builder Logic ---
        async saveSurvey(surveyId) {
            const isNew = surveyId === 'new';
            let surveyData = { questions: [] };
            if (!isNew) {
                surveyData = await DB.getSurvey(parseInt(surveyId)) || { questions: [] };
            }

            surveyData.metadata = {
                title: document.getElementById('meta-title').value,
                university: document.getElementById('meta-university').value,
                researcher: document.getElementById('meta-researcher').value,
                consent: document.getElementById('meta-consent').value,
            };
            
            const questionElements = [...document.querySelectorAll('.question-card')];
            const questions = questionElements.map(card => {
                const id = card.dataset.questionId;
                const existingQuestion = (surveyData.questions || []).find(q => q.id == id) || {};
                
                const updatedQuestion = { ...existingQuestion, id };
                card.querySelectorAll('[data-action="update-question-prop"]').forEach(input => {
                    const prop = input.dataset.prop;
                    updatedQuestion[prop] = input.type === 'checkbox' ? input.checked : input.value;
                });

                const optionsContainer = card.querySelector(`[data-question-id="${id}"]`);
                if (optionsContainer) {
                    updatedQuestion.options = [...optionsContainer.querySelectorAll('[data-action="update-option"]')]
                        .map(optEl => optEl.value);
                }
                return updatedQuestion;
            });

            surveyData.questions = questions;
            surveyData.lastUpdated = Date.now();

            const savedId = await DB.saveSurvey(surveyData);
            if (isNew) {
                window.history.replaceState(null, '', `#/builder/${savedId}`);
                document.getElementById('page-builder').dataset.surveyId = savedId;
            }
        },

        handleAddQuestion(type, surveyId) {
            const newQuestion = {
                id: `q_${Date.now()}`, type, text: '', helper: '', required: true,
                options: ['radio', 'checkbox', 'dropdown'].includes(type) ? ['Option 1'] :
                         type === 'likert' ? ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] : []
            };
            const cardHtml = UI.getQuestionCardHtml(newQuestion);
            const list = document.getElementById('question-list');
            
            if (list.querySelector('.empty-state')) list.innerHTML = '';
            list.insertAdjacentHTML('beforeend', cardHtml);

            this.saveSurvey(surveyId);
        },

        handleQuestionUpdate(e, surveyId) {
            const action = e.target.dataset.action;
            const questionCard = e.target.closest('.question-card');
            if (!questionCard) return;
            const questionId = questionCard.dataset.questionId;

            switch(action) {
                case 'delete-question':
                    if (confirm('Are you sure you want to delete this question?')) {
                        questionCard.remove();
                        this.saveSurvey(surveyId);
                    }
                    break;
                case 'add-option':
                    const optionsContainer = questionCard.querySelector(`[data-question-id="${questionId}"]`);
                    const newIndex = optionsContainer.children.length;
                    const optionHtml = `
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="text" class="form-input" data-action="update-option" data-index="${newIndex}" value="Option ${newIndex + 1}">
                            <button class="btn btn-danger" data-action="delete-option" data-index="${newIndex}">${ICONS.trash}</button>
                        </div>`;
                    optionsContainer.insertAdjacentHTML('beforeend', optionHtml);
                    this.saveSurvey(surveyId);
                    break;
                case 'delete-option':
                    e.target.closest('div').remove();
                    this.saveSurvey(surveyId);
                    break;
            }
        },

        handleDragAndDrop(e) {
            const list = document.getElementById('question-list');
            if (!list) return;

            if (e.type === 'dragstart' && e.target.classList.contains('question-card')) {
                state.draggedElement = e.target;
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => e.target.classList.add('is-dragging'), 0);
            }
            if (e.type === 'dragend' && state.draggedElement) {
                state.draggedElement.classList.remove('is-dragging');
                state.draggedElement = null;
                const indicator = list.querySelector('.drop-indicator');
                if (indicator) indicator.remove();
            }
            if (e.type === 'dragover') {
                e.preventDefault();
                const targetCard = e.target.closest('.question-card');
                if (targetCard && targetCard !== state.draggedElement) {
                    const rect = targetCard.getBoundingClientRect();
                    const isAfter = e.clientY > rect.top + rect.height / 2;
                    let indicator = list.querySelector('.drop-indicator');
                    if (!indicator) {
                        indicator = document.createElement('div');
                        indicator.className = 'drop-indicator';
                    }
                    if (isAfter) {
                        targetCard.after(indicator);
                    } else {
                        targetCard.before(indicator);
                    }
                }
            }
            if (e.type === 'drop') {
                e.preventDefault();
                const indicator = list.querySelector('.drop-indicator');
                if (indicator && state.draggedElement) {
                    indicator.before(state.draggedElement);
                    indicator.remove();
                    const surveyId = document.getElementById('page-builder').dataset.surveyId;
                    this.saveSurvey(surveyId);
                }
            }
        },

        // --- Taker Logic ---
        async handleStartSurvey(surveyId) {
            const survey = await DB.getSurvey(parseInt(surveyId));
            sessionStorage.setItem('currentSurveyAnswers', JSON.stringify({}));
            UI.renderTakerQuestion(survey, 0, {});
        },

        handleTakerNav(e, surveyId, currentIdx) {
            const isNext = e.target.dataset.action === 'taker-next';
            const form = e.target.closest('.glass-card');
            
            let answers = JSON.parse(sessionStorage.getItem('currentSurveyAnswers'));
            
            const currentQuestion = App.collectAnswer(form);
            const questionDef = (async () => (await DB.getSurvey(surveyId)).questions[currentIdx])();
            
            if (isNext && questionDef.required && (!currentQuestion.value || currentQuestion.value.length === 0)) {
                alert('This question is required.');
                return;
            }
            answers[currentQuestion.id] = currentQuestion.value;
            
            sessionStorage.setItem('currentSurveyAnswers', JSON.stringify(answers));
            
            DB.getSurvey(surveyId).then(survey => {
                if (isNext) {
                    if (currentIdx < survey.questions.length - 1) {
                        UI.renderTakerQuestion(survey, currentIdx + 1, answers);
                    } else {
                        this.handleSubmitResponse(survey.id, answers);
                    }
                } else { 
                    if (currentIdx > 0) {
                        UI.renderTakerQuestion(survey, currentIdx - 1, answers);
                    }
                }
            });
        },
        
        collectAnswer(form) {
            const firstInput = form.querySelector('[name]');
            const questionId = firstInput.name;
            let value;
            if (firstInput.type === 'checkbox') {
                value = [...form.querySelectorAll(`[name="${questionId}"]:checked`)].map(el => el.value);
            } else if (form.querySelector('.rating-stars')) {
                value = form.querySelector(`input[name="${questionId}"]`).value;
            } else {
                const checkedRadio = form.querySelector(`[name="${questionId}"]:checked`);
                value = checkedRadio ? checkedRadio.value : firstInput.value;
            }
            return { id: questionId, value: value || null };
        },

        async handleSubmitResponse(surveyId, answers) {
            const response = { surveyId, timestamp: Date.now(), answers };
            await DB.addResponse(response);
            sessionStorage.removeItem('currentSurveyAnswers');
            alert('Response submitted successfully!');
            window.location.hash = `#/responses/${surveyId}`;
        },

        setupEventListeners() {
            document.body.addEventListener('click', e => {
                const target = e.target.closest('[data-action]');
                if (!target) return;
                const action = target.dataset.action;
                
                if (action === 'sign-out') this.handleSignOut();
                if (action === 'create-survey') this.handleCreateSurvey();

                if (e.target.closest('.auth-toggle')) {
                    document.querySelector('.auth-toggle-btn.active').classList.remove('active');
                    target.classList.add('active');
                    document.querySelector('.auth-form.active').classList.remove('active');
                    document.getElementById(target.dataset.form).classList.add('active');
                }
                
                const builderPage = e.target.closest('#page-builder');
                if (builderPage) {
                    const surveyId = builderPage.dataset.surveyId;
                    if (action === 'add-question') this.handleAddQuestion(target.dataset.type, surveyId);
                    if (e.target.closest('.question-card')) this.handleQuestionUpdate(e, surveyId);
                }
                
                if (action === 'start-survey') this.handleStartSurvey(target.dataset.surveyId);
                const takerPage = e.target.closest('#taker-question');
                if (takerPage && (action === 'taker-next' || action === 'taker-prev')) {
                    this.handleTakerNav(e, parseInt(takerPage.dataset.surveyId), parseInt(takerPage.dataset.questionIndex));
                }
                const star = e.target.closest('.star');
                if (star) {
                    const ratingStars = star.parentElement;
                    const value = star.dataset.value;
                    const questionId = ratingStars.dataset.questionId;
                    ratingStars.nextElementSibling.value = value;
                    [...ratingStars.children].forEach(s => s.classList.toggle('selected', s.dataset.value <= value));
                }
                
                if (action === 'export-csv') Helpers.exportToCsv(parseInt(target.dataset.surveyId));
                if (action === 'export-json') Helpers.exportToJson(parseInt(target.dataset.surveyId));
            });

            document.body.addEventListener('submit', e => {
                e.preventDefault();
                if (e.target.id === 'signup-form') {
                    this.handleSignUp(e.target.querySelector('#signup-email').value, e.target.querySelector('#signup-password').value);
                }
                if (e.target.id === 'signin-form') {
                    this.handleSignIn(e.target.querySelector('#signin-email').value, e.target.querySelector('#signin-password').value);
                }
            });

            document.body.addEventListener('input', e => {
                const builderPage = e.target.closest('#page-builder');
                if (builderPage && e.target.closest('#survey-metadata-editor, .question-card')) {
                    this.saveSurvey(builderPage.dataset.surveyId);
                }
            });

            document.body.addEventListener('dragstart', this.handleDragAndDrop);
            document.body.addEventListener('dragend', this.handleDragAndDrop);
            document.body.addEventListener('dragover', this.handleDragAndDrop);
            document.body.addEventListener('drop', this.handleDragAndDrop);
        },

        async init() {
            await DB.init();
            this.setupEventListeners();

            const sessionUser = sessionStorage.getItem('survey_currentUser');
            if (sessionUser) {
                state.currentUser = JSON.parse(sessionUser);
                this.bootAuthenticatedApp();
            } else {
                this.bootUnauthenticatedApp();
            }
        }
    };

    // --- APPLICATION START ---
    App.init();

})();
});