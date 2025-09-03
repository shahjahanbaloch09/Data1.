
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}


document.addEventListener('DOMContentLoaded', () => {
    // This is a large, single-file application. We use an IIFE and a modular pattern
    // to keep the code organized.
    
    // --- APPLICATION STATE ---
    const state = {
        currentUser: null,
        surveys: [],
        responses: [],
        db: null,
    };

    // --- DOM ELEMENT REFERENCES ---
    const appContainer = document.getElementById('app-container');
    const pages = {
        loading: document.getElementById('page-loading'),
        auth: document.getElementById('page-auth'),
        dashboard: document.getElementById('page-dashboard'),
        builder: document.getElementById('page-builder'),
        taker: document.getElementById('page-taker'),
        // Legacy pages
        legacySurvey: document.getElementById('page-legacy-survey'),
        legacyResponses: document.getElementById('page-legacy-responses'),
        legacyResponseDetail: document.getElementById('page-legacy-response-detail'),
    };
    const modalContainer = document.getElementById('modal-container');
    const navActions = document.getElementById('nav-actions');
    const userGreeting = document.getElementById('user-greeting');
    const logoutBtn = document.getElementById('logout-btn');

    // --- DATABASE MODULE (IndexedDB) ---
    const DB = {
        init() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('PWA_Survey_DB', 2);

                request.onupgradeneeded = event => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('users')) {
                        db.createObjectStore('users', { keyPath: 'email' });
                    }
                    if (!db.objectStoreNames.contains('surveys')) {
                        const surveyStore = db.createObjectStore('surveys', { keyPath: 'id', autoIncrement: true });
                        surveyStore.createIndex('by_user', 'userId', { unique: false });
                    }
                    if (!db.objectStoreNames.contains('responses')) {
                        const responseStore = db.createObjectStore('responses', { keyPath: 'id', autoIncrement: true });
                        responseStore.createIndex('by_survey', 'surveyId', { unique: false });
                    }
                };

                request.onsuccess = event => {
                    state.db = event.target.result;
                    console.log('Database initialized');
                    resolve(state.db);
                };

                request.onerror = event => {
                    console.error('Database error:', event.target.errorCode);
                    reject(event.target.errorCode);
                };
            });
        },

        // --- User Methods ---
        addUser(user) {
            return new Promise((resolve, reject) => {
                const transaction = state.db.transaction(['users'], 'readwrite');
                const store = transaction.objectStore('users');
                const request = store.add(user);
                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e.target.error);
            });
        },
        getUser(email) {
            return new Promise((resolve, reject) => {
                const transaction = state.db.transaction(['users'], 'readonly');
                const store = transaction.objectStore('users');
                const request = store.get(email);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (e) => reject(e.target.error);
            });
        },
        
        // --- Survey Methods ---
        saveSurvey(surveyData) {
            return new Promise((resolve, reject) => {
                const transaction = state.db.transaction(['surveys'], 'readwrite');
                const store = transaction.objectStore('surveys');
                const request = store.put(surveyData); // put handles both add and update
                request.onsuccess = () => resolve(request.result);
                request.onerror = e => reject(e.target.error);
            });
        },
        getSurveysForUser(userId) {
             return new Promise((resolve, reject) => {
                const transaction = state.db.transaction(['surveys'], 'readonly');
                const store = transaction.objectStore('surveys');
                const index = store.index('by_user');
                const request = index.getAll(userId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = e => reject(e.target.error);
            });
        },
        getSurvey(id) {
            return new Promise((resolve, reject) => {
                const transaction = state.db.transaction(['surveys'], 'readonly');
                const store = transaction.objectStore('surveys');
                const request = store.get(parseInt(id));
                request.onsuccess = () => resolve(request.result);
                request.onerror = e => reject(e.target.error);
            });
        },
        deleteSurvey(id) {
            return new Promise((resolve, reject) => {
                 const transaction = state.db.transaction(['surveys', 'responses'], 'readwrite');
                 const surveyStore = transaction.objectStore('surveys');
                 const responseStore = transaction.objectStore('responses');
                 
                 // Delete the survey
                 surveyStore.delete(id);

                 // Delete associated responses
                 const responseIndex = responseStore.index('by_survey');
                 const responseRequest = responseIndex.openCursor(IDBKeyRange.only(id));
                 responseRequest.onsuccess = (event) => {
                     const cursor = event.target.result;
                     if (cursor) {
                         responseStore.delete(cursor.primaryKey);
                         cursor.continue();
                     }
                 };

                 transaction.oncomplete = () => resolve();
                 transaction.onerror = e => reject(e.target.error);
            });
        },

        // --- Response Methods ---
        addResponse(responseData) {
             return new Promise((resolve, reject) => {
                const transaction = state.db.transaction(['responses'], 'readwrite');
                const store = transaction.objectStore('responses');
                const request = store.add(responseData);
                request.onsuccess = () => resolve();
                request.onerror = e => reject(e.target.error);
            });
        },
        getResponsesForSurvey(surveyId) {
            return new Promise((resolve, reject) => {
                const transaction = state.db.transaction(['responses'], 'readonly');
                const store = transaction.objectStore('responses');
                const index = store.index('by_survey');
                const request = index.getAll(surveyId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = e => reject(e.target.error);
            });
        },
    };

    // --- AUTH MODULE ---
    const Auth = {
        async signup(name, email, password) {
            const existingUser = await DB.getUser(email);
            if (existingUser) {
                alert('An account with this email already exists.');
                return false;
            }
            // In a real app, hash the password. Here we store it plain for simplicity.
            await DB.addUser({ name, email, password });
            return this.login(email, password);
        },
        async login(email, password) {
            const user = await DB.getUser(email);
            if (user && user.password === password) {
                state.currentUser = user;
                localStorage.setItem('currentUserEmail', user.email);
                UI.updateNav();
                Router.navigate('/dashboard');
                return true;
            }
            alert('Invalid email or password.');
            return false;
        },
        logout() {
            state.currentUser = null;
            localStorage.removeItem('currentUserEmail');
            UI.updateNav();
            Router.navigate('/auth');
        },
        async checkSession() {
            const userEmail = localStorage.getItem('currentUserEmail');
            if (userEmail) {
                state.currentUser = await DB.getUser(userEmail);
                if (state.currentUser) {
                    UI.updateNav();
                } else {
                    // User in local storage but not DB, clear session
                    this.logout();
                }
            }
        }
    };

    // --- UI MODULE ---
    const UI = {
        showPage(pageId) {
            Object.values(pages).forEach(p => p.classList.remove('active'));
            if (pages[pageId]) {
                pages[pageId].classList.add('active');
            } else {
                pages.auth.classList.add('active'); // Fallback
            }
        },

        updateNav() {
            if (state.currentUser) {
                navActions.classList.remove('hidden');
                userGreeting.textContent = `Hello, ${state.currentUser.name}`;
            } else {
                navActions.classList.add('hidden');
            }
        },

        render(container, html) {
            container.innerHTML = html;
        },
        
        renderModal(html) {
            this.render(modalContainer, html);
            // Allow closing by clicking the overlay
            const overlay = modalContainer.querySelector('.modal-overlay');
            if (overlay) {
                overlay.addEventListener('click', e => {
                    if (e.target === overlay) {
                        this.closeModal();
                    }
                });
            }
        },
        
        closeModal() {
            modalContainer.innerHTML = '';
        },
    };

    // --- ROUTER & PAGE RENDERERS ---
    const Router = {
        routes: {},
        
        add(path, handler) {
            // Simple regex to handle path parameters like /builder/:id
            const paramNames = [];
            const parsedPath = path.replace(/:(\w+)/g, (_, name) => {
                paramNames.push(name);
                return '([^\\/]+)';
            });
            this.routes[path] = {
                regex: new RegExp(`^${parsedPath}$`),
                paramNames,
                handler
            };
        },

        navigate(path) {
            window.location.hash = path;
        },

        handle() {
            const path = window.location.hash.slice(1) || '/';
            let matched = false;
            
            if (!state.currentUser && !path.startsWith('/take/')) {
                 // If not logged in and not taking a survey, force auth page
                this.routes['/auth'].handler();
                return;
            }

            for (const routePath in this.routes) {
                const route = this.routes[routePath];
                const match = path.match(route.regex);
                if (match) {
                    const params = {};
                    route.paramNames.forEach((name, index) => {
                        params[name] = match[index + 1];
                    });
                    route.handler(params);
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                 // Fallback route
                 this.routes[state.currentUser ? '/dashboard' : '/auth'].handler();
            }
        },

        init() {
            // Public routes
            this.add('/auth', renderAuthPage);
            this.add('/take/:id', renderTakerPage);

            // Private routes
            this.add('/dashboard', renderDashboardPage);
            this.add('/builder/:id', renderBuilderPage);
            
            // Legacy routes
            this.add('/legacy/survey', Legacy.renderSurveyPage);
            this.add('/legacy/responses', Legacy.renderResponsesPage);
            this.add('/legacy/responses/:id', Legacy.renderResponseDetailPage);


            this.add('/', () => {
                if (state.currentUser) {
                    this.navigate('/dashboard');
                } else {
                    this.navigate('/auth');
                }
            });

            window.addEventListener('hashchange', () => this.handle());
        }
    };
    
    // --- Page Rendering Functions ---
    
    function renderAuthPage() {
        UI.showPage('auth');
        const html = `
            <div class="auth-container">
                <div class="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
                    <div id="auth-form-container">
                        <!-- Login form will be injected here by default -->
                    </div>
                    <div class="mt-8 text-center">
                        <button id="legacy-survey-btn" class="w-full text-center px-4 py-3 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-800 transition-colors">
                            Access Legacy Proforma (SHAH)
                        </button>
                    </div>
                </div>
            </div>`;
        UI.render(pages.auth, html);
        renderLoginForm(); // Default to login
    }

    function renderLoginForm() {
        const container = document.getElementById('auth-form-container');
        if (!container) return;
        const html = `
            <h2 class="text-3xl font-bold text-center text-gray-800 mb-6">Login</h2>
            <form id="login-form" class="space-y-4">
                <div>
                    <label class="block text-gray-700">Email</label>
                    <input type="email" name="email" required class="w-full px-4 py-2 mt-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600">
                </div>
                <div>
                    <label class="block text-gray-700">Password</label>
                    <input type="password" name="password" required class="w-full px-4 py-2 mt-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600">
                </div>
                <button type="submit" class="w-full px-4 py-3 text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:opacity-90 font-semibold">Login</button>
            </form>
            <p class="mt-4 text-center text-sm">Don't have an account? <a href="#" id="show-signup" class="text-blue-600 hover:underline">Sign up</a></p>
        `;
        UI.render(container, html);
    }

    function renderSignupForm() {
        const container = document.getElementById('auth-form-container');
        if (!container) return;
        const html = `
            <h2 class="text-3xl font-bold text-center text-gray-800 mb-6">Sign Up</h2>
            <form id="signup-form" class="space-y-4">
                <div>
                    <label class="block text-gray-700">Full Name</label>
                    <input type="text" name="name" required class="w-full px-4 py-2 mt-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600">
                </div>
                <div>
                    <label class="block text-gray-700">Email</label>
                    <input type="email" name="email" required class="w-full px-4 py-2 mt-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600">
                </div>
                <div>
                    <label class="block text-gray-700">Password</label>
                    <input type="password" name="password" required class="w-full px-4 py-2 mt-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600">
                </div>
                <button type="submit" class="w-full px-4 py-3 text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:opacity-90 font-semibold">Sign Up</button>
            </form>
            <p class="mt-4 text-center text-sm">Already have an account? <a href="#" id="show-login" class="text-blue-600 hover:underline">Login</a></p>
        `;
        UI.render(container, html);
    }
    
    async function renderDashboardPage() {
        UI.showPage('dashboard');
        const surveys = await DB.getSurveysForUser(state.currentUser.email);
        const surveyCards = surveys.length > 0 ? surveys.map(s => `
            <div class="bg-white p-6 rounded-xl shadow-lg">
                <h3 class="font-bold text-xl text-gray-800">${s.metadata.title}</h3>
                <p class="text-sm text-gray-500">${s.metadata.university}</p>
                <div class="mt-4 pt-4 border-t flex justify-end space-x-2">
                    <button data-action="delete" data-id="${s.id}" class="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors" title="Delete Survey">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                    <button data-action="share" data-id="${s.id}" class="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors" title="Share Survey">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>
                    </button>
                    <button data-action="export" data-id="${s.id}" class="px-4 py-2 bg-green-100 text-green-800 font-semibold rounded-lg text-sm hover:bg-green-200 transition-colors">Export</button>
                    <button data-action="edit" data-id="${s.id}" class="px-4 py-2 bg-blue-100 text-blue-800 font-semibold rounded-lg text-sm hover:bg-blue-200 transition-colors">Edit</button>
                </div>
            </div>
        `).join('') : `
            <div class="md:col-span-2 text-center py-16 bg-white rounded-lg shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg>
                <h3 class="mt-4 text-xl font-semibold text-gray-800">No surveys yet</h3>
                <p class="mt-1 text-gray-500">Create your first survey to start collecting data.</p>
            </div>
        `;

        const html = `
            <div class="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
                <div class="max-w-7xl mx-auto">
                    <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
                        <div>
                            <h1 class="text-4xl font-extrabold text-gray-800 tracking-tight">My Surveys</h1>
                            <p class="text-lg text-gray-600 mt-2">Manage your research projects.</p>
                        </div>
                        <button id="new-survey-btn" class="mt-4 sm:mt-0 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg text-lg hover:opacity-90 transition-opacity flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            <span>New Survey</span>
                        </button>
                    </header>
                    <main class="grid grid-cols-1 md:grid-cols-2 gap-6" id="survey-list">
                        ${surveyCards}
                    </main>
                </div>
            </div>`;
        UI.render(pages.dashboard, html);
    }

    async function renderBuilderPage({id}) {
        UI.showPage('builder');
        const survey = await DB.getSurvey(id);
        if(!survey) {
            alert('Survey not found!');
            Router.navigate('/dashboard');
            return;
        }

        const questionTypes = [
            { type: 'short_text', label: 'Short Text' },
            { type: 'long_text', label: 'Long Text' },
            { type: 'radio', label: 'Multiple Choice' },
            { type: 'checkbox', label: 'Checkboxes' },
            { type: 'date', label: 'Date' },
            { type: 'number', label: 'Number' },
        ];

        const html = `
            <div class="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
                <div class="max-w-4xl mx-auto" data-survey-id="${survey.id}">
                    <header class="mb-8 flex justify-between items-start">
                        <div>
                            <h1 class="text-4xl font-extrabold text-gray-800 tracking-tight">${survey.metadata.title}</h1>
                            <p class="text-lg text-gray-600 mt-2">Survey Builder</p>
                        </div>
                         <button data-action="show-settings" data-id="${survey.id}" class="p-3 text-gray-500 hover:bg-gray-200 rounded-full transition-colors" title="Survey Settings">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                    </header>
                    
                    <div class="bg-white p-6 rounded-xl shadow-lg mb-8">
                        <h2 class="text-2xl font-bold text-gray-700 mb-4">Add a Question</h2>
                        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            ${questionTypes.map(q => `
                                <button data-action="add-question" data-type="${q.type}" class="p-4 border rounded-lg text-center hover:bg-blue-50 hover:border-blue-300 transition-colors">
                                    <span class="font-semibold text-gray-700 pointer-events-none">${q.label}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <main id="question-container" class="space-y-4">
                        <!-- Questions will be rendered here -->
                    </main>
                    
                    <div class="drop-zone mt-4"></div>

                    <footer class="mt-8 flex justify-end items-center space-x-4">
                         <a href="#/dashboard" class="px-8 py-4 bg-gray-300 text-gray-800 font-bold rounded-lg text-lg hover:bg-gray-400 transition-colors">
                            Back to Dashboard
                        </a>
                        <button id="save-survey-btn" class="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg text-lg hover:opacity-90 transition-opacity">
                            Save Survey
                        </button>
                    </footer>
                </div>
            </div>`;
        UI.render(pages.builder, html);
        renderQuestions(survey.structure);
    }
    
    function renderQuestions(questions = []) {
        const container = document.getElementById('question-container');
        if (!container) return;

        if (questions.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-500 py-8">No questions yet. Click a button above to add one.</p>`;
            return;
        }

        container.innerHTML = questions.map((q, index) => `
            <div class="question-card bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500" draggable="true" data-question-id="${q.id}">
                <div class="flex items-start justify-between">
                    <div class="flex-grow">
                        <input type="text" data-action="update-question-text" value="${q.text}" class="text-lg font-semibold text-gray-800 w-full border-b-2 border-transparent focus:border-blue-500 outline-none p-1" placeholder="Enter your question text">
                        ${q.type === 'radio' || q.type === 'checkbox' ? `
                            <div class="mt-4 space-y-2 options-container">
                                ${q.options.map((opt, optIndex) => `
                                    <div class="flex items-center">
                                        <input type="text" data-action="update-option-text" data-option-index="${optIndex}" value="${opt}" class="flex-grow border-b outline-none focus:border-gray-400 p-1 text-gray-600" placeholder="Option text">
                                        <button data-action="delete-option" data-option-index="${optIndex}" class="ml-2 text-gray-400 hover:text-red-500">&times;</button>
                                    </div>
                                `).join('')}
                            </div>
                            <button data-action="add-option" class="mt-2 text-sm text-blue-600 hover:underline">Add Option</button>
                        ` : ''}
                    </div>
                    <div class="ml-4 flex flex-col items-center space-y-2">
                        <span class="text-xs text-gray-400 uppercase">${q.type.replace('_', ' ')}</span>
                        <button data-action="delete-question" class="p-1 text-gray-400 hover:text-red-500" title="Delete Question">
                           <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async function renderTakerPage({ id }) {
        UI.showPage('taker');

        const containerHtml = `
            <div class="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
                <div id="survey-taker-container" class="max-w-3xl mx-auto">
                    <!-- Content will be injected here -->
                </div>
            </div>
        `;
        UI.render(pages.taker, containerHtml);
        const container = document.getElementById('survey-taker-container');

        const renderMessage = (title, message) => {
            const messageHtml = `
            <div class="bg-white p-8 rounded-xl shadow-lg text-center">
                <h2 class="text-2xl font-bold text-yellow-600">${title}</h2>
                <p class="text-gray-700 mt-2">${message}</p>
            </div>`;
            UI.render(container, messageHtml);
        };
        
        const survey = await DB.getSurvey(id);
        if(!survey) {
            renderMessage('Not Found', 'This survey could not be found.');
            return;
        }

        // --- NEW: Enforce Survey Settings ---
        if (survey.settings?.closingDate && new Date() > new Date(survey.settings.closingDate)) {
             renderMessage('Survey Closed', 'This survey is no longer accepting responses.');
             return;
        }

        if (survey.settings?.responseLimit) {
            const responses = await DB.getResponsesForSurvey(parseInt(id));
            if (responses.length >= survey.settings.responseLimit) {
                renderMessage('Limit Reached', 'This survey has reached its response limit.');
                return;
            }
        }
        // --- END: Enforce Survey Settings ---

        renderConsentScreen(survey);
    }

    function renderConsentScreen(survey) {
        const container = document.getElementById('survey-taker-container');
        const html = `
            <div class="bg-white p-8 rounded-xl shadow-lg text-center">
                <h1 class="text-3xl font-extrabold text-gray-800 tracking-tight">${survey.metadata.title}</h1>
                <p class="text-md text-gray-500 mt-2">${survey.metadata.university}</p>
                <p class="text-md text-gray-600 font-semibold mt-1">by ${survey.metadata.researcher}</p>
                <div class="mt-6 p-4 bg-gray-50 border rounded-md text-left">
                    <h2 class="font-bold text-lg mb-2">Consent & Disclaimer</h2>
                    <p class="text-gray-700 whitespace-pre-wrap">${survey.metadata.consent}</p>
                </div>
                <button data-action="start-survey" data-id="${survey.id}" class="mt-8 w-full px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg text-lg hover:opacity-90 transition-opacity">
                    Start Survey
                </button>
            </div>`;
        UI.render(container, html);
    }
    
    function renderSurveyQuestionsForTaker(survey) {
        const container = document.getElementById('survey-taker-container');
        const html = `
            <form id="survey-form" data-id="${survey.id}">
                ${survey.structure.map(q => `
                    <div class="bg-white p-6 rounded-lg shadow-sm mb-4">
                        <label class="block text-lg font-semibold text-gray-800 mb-3">${q.text}</label>
                        ${renderQuestionInput(q)}
                    </div>
                `).join('')}
                 <button type="submit" class="mt-4 w-full px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg text-lg hover:opacity-90 transition-opacity">
                    Submit Response
                </button>
            </form>
        `;
        UI.render(container, html);
    }

    function renderQuestionInput(q) {
        const name = `q-${q.id}`;
        switch(q.type) {
            case 'short_text':
                return `<input type="text" name="${name}" required class="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500">`;
            case 'long_text':
                return `<textarea name="${name}" required rows="4" class="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500"></textarea>`;
            case 'number':
                return `<input type="number" name="${name}" required class="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500">`;
            case 'date':
                return `<input type="date" name="${name}" required class="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500">`;
            case 'radio':
                return `<div class="space-y-2">${q.options.map(opt => `
                    <label class="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input type="radio" name="${name}" value="${opt}" required class="h-5 w-5 text-blue-600 focus:ring-blue-500">
                        <span class="ml-3 text-lg text-gray-700">${opt}</span>
                    </label>`).join('')}</div>`;
            case 'checkbox':
                return `<div class="space-y-2">${q.options.map(opt => `
                    <label class="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" name="${name}" value="${opt}" class="h-5 w-5 text-blue-600 rounded focus:ring-blue-500">
                        <span class="ml-3 text-lg text-gray-700">${opt}</span>
                    </label>`).join('')}</div>`;
            default: return '';
        }
    }


    // --- Event Handlers ---
    function setupEventListeners() {
        // Use event delegation on the body for dynamically added elements
        document.body.addEventListener('click', async (e) => {
            const action = e.target.dataset.action;
            const id = e.target.dataset.id;
            const type = e.target.dataset.type;

            // Auth form switching
            if (e.target.id === 'show-signup') { e.preventDefault(); renderSignupForm(); }
            if (e.target.id === 'show-login') { e.preventDefault(); renderLoginForm(); }
            
            // Legacy button
            if (e.target.id === 'legacy-survey-btn') { Legacy.showPasswordPrompt(); }

            // Logout
            if (e.target.id === 'logout-btn') { Auth.logout(); }
            
            // Dashboard actions
            if (e.target.closest('#page-dashboard')) {
                if (e.target.id === 'new-survey-btn') { handleNewSurvey(); }
                if (action === 'edit') { Router.navigate(`/builder/${id}`); }
                if (action === 'delete') { handleDeleteSurvey(id); }
                if (action === 'share') { handleShareSurvey(id); }
                if (action === 'export') { handleExportSurvey(id); }
            }
            
            // Builder actions
            if (e.target.closest('#page-builder')) {
                const questionCard = e.target.closest('.question-card');
                if (action === 'add-question') { handleAddQuestion(type); }
                if (action === 'delete-question') { handleDeleteQuestion(questionCard.dataset.questionId); }
                if (action === 'add-option') { handleAddOption(questionCard.dataset.questionId); }
                if (action === 'delete-option') { handleDeleteOption(questionCard.dataset.questionId, e.target.dataset.optionIndex); }
                if (action === 'show-settings') { handleShowSurveySettings(id); }
                if (e.target.id === 'save-survey-btn') { handleSaveSurvey(); }
            }

            // Taker actions
            if (e.target.closest('#page-taker')) {
                if (action === 'start-survey') { 
                    const survey = await DB.getSurvey(id);
                    renderSurveyQuestionsForTaker(survey);
                }
            }
        });
        
        document.body.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (e.target.id === 'login-form') {
                const formData = new FormData(e.target);
                await Auth.login(formData.get('email'), formData.get('password'));
            }
            if (e.target.id === 'signup-form') {
                const formData = new FormData(e.target);
                await Auth.signup(formData.get('name'), formData.get('email'), formData.get('password'));
            }
            if (e.target.id === 'survey-form') {
                await handleSubmitSurveyResponse(e.target);
            }
        });

        // Builder specific input handlers
        document.body.addEventListener('input', e => {
            const action = e.target.dataset.action;
            if (e.target.closest('#page-builder')) {
                const questionCard = e.target.closest('.question-card');
                if (action === 'update-question-text') { handleUpdateQuestionText(questionCard.dataset.questionId, e.target.value); }
                if (action === 'update-option-text') { handleUpdateOptionText(questionCard.dataset.questionId, e.target.dataset.optionIndex, e.target.value); }
            }
        });

        // Builder Drag and Drop
        let draggedItem = null;
        document.body.addEventListener('dragstart', e => {
            if (e.target.classList.contains('question-card')) {
                draggedItem = e.target;
                setTimeout(() => e.target.classList.add('is-dragging'), 0);
            }
        });
        document.body.addEventListener('dragend', e => {
            if (e.target.classList.contains('question-card')) {
                e.target.classList.remove('is-dragging');
            }
        });
        document.body.addEventListener('dragover', e => {
            e.preventDefault();
            if (e.target.classList.contains('drop-zone') || e.target.closest('.question-card')) {
                e.target.closest('#question-container, .drop-zone').classList.add('drag-over');
            }
        });
        document.body.addEventListener('dragleave', e => {
            if (e.target.classList.contains('drop-zone') || e.target.closest('.question-card')) {
                e.target.closest('#question-container, .drop-zone').classList.remove('drag-over');
            }
        });
        document.body.addEventListener('drop', async e => {
            e.preventDefault();
            const dropTarget = e.target.closest('.question-card');
            const questionContainer = document.getElementById('question-container');
            if (!questionContainer || !draggedItem) return;
            
            questionContainer.classList.remove('drag-over');
            document.querySelector('.drop-zone').classList.remove('drag-over');

            if (dropTarget && draggedItem !== dropTarget) {
                questionContainer.insertBefore(draggedItem, dropTarget);
            } else if (e.target.classList.contains('drop-zone')) {
                questionContainer.appendChild(draggedItem);
            }
            draggedItem = null;
            // Update the order in the database immediately
            await handleSaveSurvey();
        });
    }

    async function handleNewSurvey() {
        const modalHtml = `
        <div class="modal-overlay active">
            <div class="modal-content">
                <h2 class="text-2xl font-bold mb-4">Create New Survey</h2>
                <form id="new-survey-form" class="space-y-4">
                    <input type="text" name="university" placeholder="University/Organization Name" required class="w-full p-3 border rounded-md">
                    <input type="text" name="researcher" placeholder="Researcher Name" value="${state.currentUser.name}" required class="w-full p-3 border rounded-md">
                    <input type="text" name="title" placeholder="Project/Study Title" required class="w-full p-3 border rounded-md">
                    <textarea name="consent" placeholder="Disclaimer/Consent Text" rows="5" required class="w-full p-3 border rounded-md"></textarea>
                    <div class="flex justify-end space-x-4">
                        <button type="button" onclick="document.getElementById('modal-container').innerHTML = ''" class="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">Create</button>
                    </div>
                </form>
            </div>
        </div>`;
        UI.renderModal(modalHtml);
        
        document.getElementById('new-survey-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const surveyData = {
                userId: state.currentUser.email,
                metadata: {
                    university: formData.get('university'),
                    researcher: formData.get('researcher'),
                    title: formData.get('title'),
                    consent: formData.get('consent'),
                },
                settings: {
                    closingDate: null,
                    responseLimit: null,
                },
                structure: [], // Empty structure initially
            };
            const newId = await DB.saveSurvey(surveyData);
            UI.closeModal();
            Router.navigate(`/builder/${newId}`);
        });
    }

    async function handleDeleteSurvey(id) {
        if(confirm('Are you sure you want to delete this survey and all its responses? This cannot be undone.')) {
            await DB.deleteSurvey(parseInt(id));
            renderDashboardPage(); // Refresh dashboard
        }
    }

    function handleShareSurvey(id) {
        const url = `${window.location.origin}${window.location.pathname}#/take/${id}`;
        navigator.clipboard.writeText(url).then(() => {
            alert(`Survey link copied to clipboard!\n\n${url}`);
        }, () => {
            alert(`Could not copy link. Here it is:\n\n${url}`);
        });
    }
    
    async function handleExportSurvey(id) {
        const survey = await DB.getSurvey(id);
        const responses = await DB.getResponsesForSurvey(parseInt(id));
        
        if (responses.length === 0) {
            alert("No responses to export.");
            return;
        }

        const dataForSheet = responses.map(res => {
            const flatResponse = {
                'Response ID': res.id,
                'Timestamp': new Date(res.timestamp).toLocaleString(),
                ...res.data,
            };
            return flatResponse;
        });

        // Use the existing XLSX library loaded in index.html
        const ws = XLSX.utils.json_to_sheet(dataForSheet);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Responses');
        const filename = `${survey.metadata.title.replace(/ /g, '_')}_export.xlsx`;
        XLSX.writeFile(wb, filename);
    }
    
    // --- Builder Logic ---

    async function handleShowSurveySettings(id) {
        const survey = await DB.getSurvey(parseInt(id));
        const modalHtml = `
        <div class="modal-overlay active">
            <div class="modal-content">
                <h2 class="text-2xl font-bold mb-4">Survey Settings</h2>
                <form id="survey-settings-form" data-id="${id}" class="space-y-4">
                    <div>
                        <label for="closingDate" class="block text-gray-700">Closing Date (Optional)</label>
                        <input type="date" name="closingDate" id="closingDate" value="${survey.settings?.closingDate || ''}" class="w-full p-3 border rounded-md mt-1">
                    </div>
                    <div>
                        <label for="responseLimit" class="block text-gray-700">Response Limit (Optional)</label>
                        <input type="number" name="responseLimit" id="responseLimit" min="1" placeholder="e.g., 100" value="${survey.settings?.responseLimit || ''}" class="w-full p-3 border rounded-md mt-1">
                        <p class="text-sm text-gray-500 mt-1">Leave blank for no limit.</p>
                    </div>
                    <div class="flex justify-end space-x-4 pt-4">
                        <button type="button" onclick="document.getElementById('modal-container').innerHTML = ''" class="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">Save Settings</button>
                    </div>
                </form>
            </div>
        </div>`;
        UI.renderModal(modalHtml);
        
        document.getElementById('survey-settings-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const surveyId = e.target.dataset.id;
            const surveyToUpdate = await DB.getSurvey(parseInt(surveyId));
            const formData = new FormData(e.target);
            
            surveyToUpdate.settings = {
                closingDate: formData.get('closingDate') || null,
                responseLimit: formData.get('responseLimit') ? parseInt(formData.get('responseLimit')) : null,
            };

            await DB.saveSurvey(surveyToUpdate);
            UI.closeModal();
        });
    }
    
    async function handleAddQuestion(type) {
        const surveyId = document.querySelector('[data-survey-id]').dataset.surveyId;
        const survey = await DB.getSurvey(surveyId);
        const newQuestion = {
            id: `q-${Date.now()}`,
            type,
            text: '',
            options: (type === 'radio' || type === 'checkbox') ? ['Option 1'] : [],
        };
        survey.structure.push(newQuestion);
        await DB.saveSurvey(survey);
        renderQuestions(survey.structure);
    }

    async function handleSaveSurvey() {
        const container = document.querySelector('[data-survey-id]');
        if (!container) return;
        const surveyId = container.dataset.surveyId;
        
        const questionElements = [...document.querySelectorAll('.question-card')];
        const newStructure = questionElements.map(card => {
            const id = card.dataset.questionId;
            const text = card.querySelector('[data-action="update-question-text"]').value;
            const typeText = card.querySelector('.text-xs.uppercase').textContent.toLowerCase().replace(' ', '_');
            
            let options = [];
            if (typeText === 'multiple_choice' || typeText === 'checkboxes') {
                options = [...card.querySelectorAll('[data-action="update-option-text"]')].map(optEl => optEl.value);
            }
            
            return { id, text, type: typeText, options };
        });

        const survey = await DB.getSurvey(surveyId);
        survey.structure = newStructure;
        await DB.saveSurvey(survey);
        
        // Add visual feedback for saving
        const saveBtn = document.getElementById('save-survey-btn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saved!';
        saveBtn.classList.remove('from-green-500', 'to-emerald-600');
        saveBtn.classList.add('bg-green-600');
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.classList.add('from-green-500', 'to-emerald-600');
            saveBtn.classList.remove('bg-green-600');
        }, 1500);
    }
    
    async function handleDeleteQuestion(questionId) {
        const surveyId = document.querySelector('[data-survey-id]').dataset.surveyId;
        const survey = await DB.getSurvey(surveyId);
        survey.structure = survey.structure.filter(q => q.id !== questionId);
        await DB.saveSurvey(survey);
        renderQuestions(survey.structure);
    }

    async function handleAddOption(questionId) {
         const surveyId = document.querySelector('[data-survey-id]').dataset.surveyId;
        const survey = await DB.getSurvey(surveyId);
        const question = survey.structure.find(q => q.id === questionId);
        if(question) {
            question.options.push(`Option ${question.options.length + 1}`);
            await DB.saveSurvey(survey);
            renderQuestions(survey.structure);
        }
    }

    async function handleDeleteOption(questionId, optionIndex) {
        const surveyId = document.querySelector('[data-survey-id]').dataset.surveyId;
        const survey = await DB.getSurvey(surveyId);
        const question = survey.structure.find(q => q.id === questionId);
        if(question) {
            question.options.splice(optionIndex, 1);
            await DB.saveSurvey(survey);
            renderQuestions(survey.structure);
        }
    }
    
    // --- Taker Logic ---
    async function handleSubmitSurveyResponse(form) {
        const surveyId = parseInt(form.dataset.id);
        const survey = await DB.getSurvey(surveyId);
        const formData = new FormData(form);
        const responseData = {};

        survey.structure.forEach(q => {
            const key = `q-${q.id}`;
            const questionText = q.text;
            if (q.type === 'checkbox') {
                responseData[questionText] = formData.getAll(key).join(', ');
            } else {
                responseData[questionText] = formData.get(key);
            }
        });

        await DB.addResponse({
            surveyId,
            timestamp: Date.now(),
            data: responseData,
        });

        const container = document.getElementById('survey-taker-container');
        UI.render(container, `
            <div class="bg-white p-8 rounded-xl shadow-lg text-center">
                <h2 class="text-2xl font-bold text-green-600">Thank You!</h2>
                <p class="text-gray-700 mt-2">Your response has been successfully submitted.</p>
            </div>
        `);
    }

    // --- LEGACY MODULE (Original App) ---
    const Legacy = {
        // ... (The entire logic of the original script.js will be placed here)
        init() {
            // This is where the old app's logic will be self-contained.
            // It will continue to use localStorage and its own routing/rendering.
        },
        showPasswordPrompt() {
            const modalHtml = `
            <div class="modal-overlay active">
                <div class="modal-content">
                    <h2 class="text-2xl font-bold mb-4">Access Legacy Proforma</h2>
                    <p class="text-gray-600 mb-4">This section is password protected.</p>
                    <form id="legacy-password-form" class="space-y-4">
                        <input type="password" name="password" placeholder="Enter Password" required class="w-full p-3 border rounded-md">
                        <div class="flex justify-end space-x-4">
                            <button type="button" onclick="document.getElementById('modal-container').innerHTML = ''" class="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancel</button>
                            <button type="submit" class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">Access</button>
                        </div>
                    </form>
                </div>
            </div>`;
            UI.renderModal(modalHtml);
            
            document.getElementById('legacy-password-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const password = e.target.password.value;
                if (password === '@Shah5020') {
                    UI.closeModal();
                    // Load the legacy app
                    this.loadLegacyApp();
                } else {
                    alert('Incorrect password.');
                }
            });
        },
        
        loadLegacyApp() {
            console.log("Loading Legacy Application...");
            // Hide the new app's header actions
            navActions.classList.add('hidden');
            
            // The entire logic from the original script.js goes here,
            // adapted to run on-demand instead of on DOMContentLoaded.
            
            // --- COPY OF ORIGINAL SCRIPT.JS ---
            const originalScriptExecution = () => {
                // ... The full, unmodified code from the user's initial `script.js`
                // is placed inside this function. I will paste it in now.
    
                // --- ENUMS & CONSTANTS ---
                const QuestionType = {
                    TEXT: 'text',
                    NUMBER: 'number',
                    RADIO: 'radio',
                };

                const UserIcon = ({ className = "w-6 h-6" } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" class="${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>`;
                const MapPinIcon = ({ className = "w-6 h-6" } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" class="${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`;
                const MegaphoneIcon = ({ className = "w-6 h-6" } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" class="${className}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" /></svg>`;
                const UsersIcon = ({ className = "w-6 h-6" } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" class="${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.122-1.28-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.122-1.28.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>`;
                const BuildingLibraryIcon = ({ className = "w-6 h-6" } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" class="${className}" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>`;
                const NoteIcon = ({ className = "w-6 h-6" } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="${className}"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>`;
                const iconMap = { UserIcon, MapPinIcon, MegaphoneIcon, UsersIcon, BuildingLibraryIcon, NoteIcon };

                const SURVEY_STRUCTURE = [
                  { id: 'demographic', title: 'DEMOGRAPHIC INFORMATION', icon: 'UserIcon', questions: [
                      { id: 'name', text: 'Name of respondent', type: QuestionType.TEXT, required: false },
                      { id: 'age', text: 'Age', type: QuestionType.NUMBER, required: true },
                      { id: 'gender', text: 'Gender', type: QuestionType.RADIO, options: ['Male', 'Female'], required: true },
                      { id: 'education_level', text: 'Education level', type: QuestionType.RADIO, options: ['No formal education', 'Primary', 'Secondary', 'Higher'], required: true },
                      { id: 'occupation', text: 'Occupation', type: QuestionType.TEXT, required: true },
                      { id: 'monthly_income', text: 'Monthly household income', type: QuestionType.RADIO, options: ['<15,000 PKR', '15,000-30,000 PKR', '>30,000 PKR'], required: true },
                      { id: 'children_under_2', text: 'Total number of children under 2 years', type: QuestionType.NUMBER, required: true },
                      { id: 'youngest_child_age', text: 'Age of youngest child', type: QuestionType.TEXT, required: true },
                  ] },
                  { id: 'geographic', title: 'GEOGRAPHIC AND ACCESS BARRIERS', icon: 'MapPinIcon', questions: [
                      { id: 'distance_to_center', text: 'Distance to nearest vaccination center', type: QuestionType.RADIO, options: ['<2 km', '2-5 km', '>5 km'], required: true },
                      { id: 'transport_mode', text: 'Mode of transport to vaccination center', type: QuestionType.RADIO, options: ['Walk', 'Motorbike', 'Public transport', 'Private car'], required: true },
                      { id: 'travel_cost', text: 'Average cost of travel to vaccination center', type: QuestionType.NUMBER, required: true },
                      { id: 'services_regular', text: 'Are vaccination services available regularly in your area?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                      { id: 'mobile_team_visit', text: 'Have you been visited by a mobile vaccination team?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                      { id: 'seasonal_access', text: 'Are vaccination centers accessible during monsoon/winter seasons?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                      { id: 'nomadic_difficulties', text: 'Do nomadic families in your area face difficulties accessing vaccination?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                      { id: 'enough_centers_remote', text: 'Are there enough vaccination centers in remote areas of Awaran?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                      { id: 'geo_challenges', text: 'Do geographical challenges prevent regular vaccination services?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                      { id: 'transport_barrier', text: 'Is transportation a major barrier to vaccination in your area?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                  ]},
                  { id: 'awareness', title: 'AWARENESS AND INFORMATION SOURCES', icon: 'MegaphoneIcon', questions: [
                      { id: 'know_vaccine_purpose', text: 'Do you know the purpose of each vaccine given to children?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                      { id: 'vaccine_info_source', text: 'Main source of vaccine information', type: QuestionType.RADIO, options: ['Lady Health Worker', 'Health facility', 'Media', 'Religious leader', 'Family'], required: true },
                      { id: 'vaccine_safety_belief', text: 'Do you believe vaccines are safe for children?', type: QuestionType.RADIO, options: ['Yes', 'No', 'Not sure'], required: true },
                      { id: 'language_barrier', text: 'Do you face language barriers when health workers explain vaccines?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                      { id: 'heard_rumors', text: 'Have you heard rumors or misconceptions about vaccines?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                      { id: 'awareness_campaigns', text: 'Are there awareness campaigns about vaccination in your area?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                      { id: 'know_schedule', text: 'Do you know the complete vaccination schedule for children under 2 years?', type: QuestionType.RADIO, options: ['Yes', 'No', 'Partially'], required: true },
                      { id: 'received_reminders', text: 'Have you ever received SMS or phone reminders for vaccination?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                  ] },
                  { id: 'cultural', title: 'CULTURAL AND RELIGIOUS FACTORS', icon: 'UsersIcon', questions: [
                      { id: 'cultural_discouragement', text: 'Are there cultural beliefs in your community that discourage vaccination?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                      { id: 'gender_differential_treatment', text: 'Do families in Awaran treat vaccination differently for boys and girls?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                      { id: 'religious_leaders_opinion', text: 'What do religious leaders in your community say about vaccination?', type: QuestionType.RADIO, options: ['Support', 'Oppose', 'Neutral'], required: true },
                      { id: 'male_permission_needed', text: 'Do women need male family member\'s permission for child vaccination?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                      { id: 'traditional_healers_influence', text: 'Are there traditional healers who influence vaccination decisions?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                      { id: 'tribal_customs_affect', text: 'Do tribal customs affect vaccination acceptance in your area?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                      { id: 'vaccines_against_religion', text: 'Have you heard that vaccines are against religious beliefs?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                      { id: 'older_family_members_support', text: 'Do older family members support or discourage vaccination?', type: QuestionType.RADIO, options: ['Support', 'Discourage', 'Neutral'], required: true },
                  ] },
                  { id: 'health_system', title: 'HEALTH SYSTEM AND SERVICE QUALITY', icon: 'BuildingLibraryIcon', questions: [
                      { id: 'rate_health_worker_behavior', text: 'How would you rate the behavior of health workers during vaccination?', type: QuestionType.RADIO, options: ['Good', 'Fair', 'Poor'], required: true },
                      { id: 'service_hours_convenient', text: 'Are vaccination service hours convenient for your family?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                      { id: 'refused_services', text: 'Have you ever been refused vaccination services?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                      { id: 'trust_govt_vaccines', text: 'Do you trust vaccines provided at government health centers?', type: QuestionType.RADIO, options: ['Yes', 'No', 'Not sure'], required: true },
                      { id: 'experienced_stock_outs', text: 'Have you experienced vaccine stock-outs at health facilities?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                      { id: 'recommend_vaccination', text: 'Would you recommend vaccination to other parents in Awaran?', type: QuestionType.RADIO, options: ['Yes', 'No'], required: true },
                  ] },
                ];
                const RESPONSES_KEY = 'surveyResponses';

                let responses = [];
                let surveyState = {};
                
                const legacyPages = {
                    home: document.querySelector('#page-legacy-survey #page-home'),
                    survey: document.querySelector('#page-legacy-survey #page-survey'),
                    responses: document.querySelector('#page-legacy-responses #page-responses'),
                    responseDetail: document.querySelector('#page-legacy-response-detail'),
                };
                
                const deleteModal = document.querySelector('#page-legacy-survey #delete-confirm-modal');
                
                const loadResponses = () => {
                    const stored = localStorage.getItem(RESPONSES_KEY);
                    responses = stored ? JSON.parse(stored) : [];
                };

                const saveResponses = () => {
                    localStorage.setItem(RESPONSES_KEY, JSON.stringify(responses));
                };
                
                const addResponse = (response) => {
                    responses.push(response);
                    saveResponses();
                };

                const deleteResponse = (participantId) => {
                    responses = responses.filter(r => r.participantId !== participantId);
                    saveResponses();
                    renderLegacyResponsesPage();
                };

                const renderLegacyHomePage = () => {
                    document.querySelector('#page-legacy-survey #total-responses').textContent = responses.length;
                    const lastDateElem = document.querySelector('#page-legacy-survey #last-collection-date');
                    if (responses.length > 0) {
                        const latestResponse = [...responses].sort((a, b) => b.timestamp - a.timestamp)[0];
                        lastDateElem.textContent = new Date(latestResponse.timestamp).toLocaleDateString();
                    } else {
                        lastDateElem.textContent = 'N/A';
                    }
                };
                
                const renderLegacyResponsesPage = () => {
                    const container = document.querySelector('#page-legacy-responses #responses-list-container');
                    const emptyState = document.querySelector('#page-legacy-responses #responses-empty-state');
                    const exportButtons = document.querySelector('#page-legacy-responses #responses-export-buttons');

                    document.querySelector('#page-legacy-responses #responses-count').textContent = `${responses.length} response(s) found.`;
                    
                    if (responses.length === 0) {
                        container.innerHTML = '';
                        emptyState.style.display = 'block';
                        exportButtons.querySelectorAll('button').forEach(btn => btn.disabled = true);
                    } else {
                        emptyState.style.display = 'none';
                        exportButtons.querySelectorAll('button').forEach(btn => btn.disabled = false);
                        container.innerHTML = [...responses].reverse().map(response => `
                            <div class="bg-white p-4 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                <div class="flex-grow">
                                    <p class="font-bold text-lg text-blue-700">${response.participantId}</p>
                                    <p class="text-sm text-gray-500">Collected on: ${new Date(response.timestamp).toLocaleString()}</p>
                                    <p class="text-sm text-gray-500">Location (Tehsil): ${response.notes.tehsil}</p>
                                </div>
                                <div class="flex items-center space-x-2 mt-4 sm:mt-0">
                                    <a href="#/legacy/responses/${response.participantId}" class="px-4 py-2 bg-blue-100 text-blue-800 font-semibold rounded-lg text-sm hover:bg-blue-200 transition-colors">
                                        View Details
                                    </a>
                                    <button data-id="${response.participantId}" class="legacy-delete-btn p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        `).join('');
                    }
                };
                
                const renderLegacyResponseDetailPage = (id) => {
                    const response = responses.find(r => r.participantId === id);
                    if (!response) {
                        window.location.hash = '#/legacy/responses';
                        return;
                    }

                    const container = pages.legacyResponseDetail;
                    let sectionsHtml = SURVEY_STRUCTURE.map(section => `
                        <section key="${section.id}" class="bg-white p-6 rounded-lg shadow-sm">
                            <h2 class="text-2xl font-bold text-gray-800 border-b pb-3 mb-4 flex items-center">
                                <div class="bg-blue-100 text-blue-600 p-2 rounded-md mr-3">
                                    ${iconMap[section.icon]({ className: "w-6 h-6" })}
                                </div>
                                ${section.title}
                            </h2>
                            <div class="space-y-4">
                                ${section.questions.map(q => `
                                    <div key="${q.id}" class="flex flex-col sm:flex-row sm:justify-between py-2 border-b last:border-b-0">
                                        <p class="text-gray-600 sm:w-2/3">${q.text}</p>
                                        <p class="font-semibold text-gray-900 text-left sm:text-right mt-1 sm:mt-0">${String(response.answers[q.id] ?? 'Not answered')}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </section>
                    `).join('');

                    container.innerHTML = `
                        <div class="max-w-4xl mx-auto">
                            <header class="mb-8">
                                <h1 class="text-4xl font-extrabold text-gray-800 tracking-tight">Response Details</h1>
                                <p class="text-lg text-gray-600 mt-2">
                                    Participant ID: <span class="font-semibold text-blue-700">${response.participantId}</span>
                                </p>
                                <p class="text-md text-gray-500">
                                    Collected on: ${new Date(response.timestamp).toLocaleString()}
                                </p>
                            </header>

                            <div class="sticky top-16 bg-slate-100 py-4 z-10 -mx-4 px-4 border-b mb-6">
                                <div class="max-w-4xl mx-auto flex items-center justify-between">
                                    <a href="#/legacy/responses" class="px-5 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg text-base hover:bg-gray-100 transition-colors">
                                        &larr; Back to List
                                    </a>
                                </div>
                            </div>

                            <main class="space-y-8">
                                <section class="bg-white p-6 rounded-lg shadow-sm">
                                    <h2 class="text-2xl font-bold text-gray-800 border-b pb-3 mb-4 flex items-center">
                                        <div class="bg-blue-100 text-blue-600 p-2 rounded-md mr-3">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"></path></svg>
                                        </div>
                                        Survey Notes
                                    </h2>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
                                        <div><strong class="text-gray-600 font-medium">Language:</strong> ${response.notes.language}</div>
                                        <div><strong class="text-gray-600 font-medium">Tehsil:</strong> ${response.notes.tehsil}</div>
                                        <div class="col-span-1 md:col-span-2"><strong class="text-gray-600 font-medium">Observations:</strong> ${response.notes.observations || 'N/A'}</div>
                                    </div>
                                </section>
                                ${sectionsHtml}
                            </main>
                        </div>
                    `;
                };

                const startLegacySurvey = () => {
                    surveyState = {
                        currentSectionIndex: 0,
                        answers: {},
                        notes: { language: '', tehsil: '', observations: '' },
                        errors: [],
                    };
                    renderLegacySurveySection();
                };
                
                const renderLegacySurveySection = () => {
                    const { currentSectionIndex, answers, notes, errors } = surveyState;
                    const totalSections = SURVEY_STRUCTURE.length;
                    const isNotesSection = currentSectionIndex === totalSections;

                    const headerContainer = document.querySelector('#page-legacy-survey #survey-header');
                    const mainContainer = document.querySelector('#page-legacy-survey #survey-main');
                    
                    const percentage = (currentSectionIndex / (totalSections + 1)) * 100;
                    const progressBar = `<div class="w-full bg-gray-200 rounded-full h-2.5 my-4"><div class="bg-gradient-to-r from-blue-500 to-purple-600 h-2.5 rounded-full transition-all duration-500" style="width: ${percentage}%"></div></div>`;

                    let headerContent, mainContent;
                    
                    if (isNotesSection) {
                        headerContent = `<div class="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm"><div class="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-lg text-white">${NoteIcon({className: "w-8 h-8"})}</div><div><h1 class="text-3xl font-bold text-gray-800">Survey Notes</h1><p class="text-gray-500">Section ${currentSectionIndex + 1} of ${totalSections + 1}</p></div></div>`;
                        mainContent = `<div class="bg-white p-6 rounded-lg shadow-sm space-y-6"><div><label class="block text-lg font-semibold text-gray-800 mb-2">Language of Interview <span class="text-red-500">*</span></label><input type="text" id="note-language" value="${notes.language}" class="w-full p-3 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500 ${errors.includes('language') ? 'border-red-400' : 'border-gray-300'}" /></div><div><label class="block text-lg font-semibold text-gray-800 mb-2">Geographic Location (Tehsil) <span class="text-red-500">*</span></label><input type="text" id="note-tehsil" value="${notes.tehsil}" class="w-full p-3 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500 ${errors.includes('tehsil') ? 'border-red-400' : 'border-gray-300'}" /></div><div><label class="block text-lg font-semibold text-gray-800 mb-2">Additional Observations (Optional)</label><textarea id="note-observations" rows="5" class="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500">${notes.observations}</textarea></div></div>`;
                    } else {
                        const section = SURVEY_STRUCTURE[currentSectionIndex];
                        headerContent = `<div class="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm"><div class="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-lg text-white">${iconMap[section.icon]({ className: "w-8 h-8" })}</div><div><h1 class="text-3xl font-bold text-gray-800">${section.title}</h1><p class="text-gray-500">Section ${currentSectionIndex + 1} of ${totalSections + 1}</p></div></div>`;
                        mainContent = section.questions.map(q => {
                            const value = answers[q.id] || '';
                            const error = errors.includes(q.id);
                            let inputHtml = '';
                            switch (q.type) {
                                case QuestionType.TEXT: inputHtml = `<input type="text" data-id="${q.id}" value="${value}" class="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500">`; break;
                                case QuestionType.NUMBER: inputHtml = `<input type="number" data-id="${q.id}" value="${value}" class="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500">`; break;
                                case QuestionType.RADIO: inputHtml = `<div class="space-y-3">${q.options.map(opt => `<label class="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"><input type="radio" data-id="${q.id}" name="${q.id}" value="${opt}" ${value === opt ? 'checked' : ''} class="h-5 w-5 text-blue-600 focus:ring-blue-500"><span class="ml-3 text-lg text-gray-700">${opt}</span></label>`).join('')}</div>`; break;
                            }
                            return `<div class="bg-white p-6 rounded-lg shadow-sm mb-4 border-2 ${error ? 'border-red-400' : 'border-transparent'}"><label class="block text-lg font-semibold text-gray-800 mb-3">${q.text} ${q.required ? '<span class="text-red-500">*</span>' : ''}</label>${inputHtml}</div>`;
                        }).join('');
                    }
                    
                    headerContainer.innerHTML = progressBar + headerContent;
                    mainContainer.innerHTML = mainContent;
                    
                    document.querySelector('#page-legacy-survey #survey-prev-btn').disabled = currentSectionIndex === 0;
                    document.querySelector('#page-legacy-survey #survey-next-btn').style.display = isNotesSection ? 'none' : 'block';
                    document.querySelector('#page-legacy-survey #survey-submit-btn').style.display = isNotesSection ? 'block' : 'none';
                };
                
                const validateLegacySurveySection = () => {
                    const { currentSectionIndex } = surveyState;
                    if (currentSectionIndex === SURVEY_STRUCTURE.length) {
                        surveyState.notes.language = document.getElementById('note-language').value;
                        surveyState.notes.tehsil = document.getElementById('note-tehsil').value;
                        const noteErrors = [];
                        if (!surveyState.notes.language) noteErrors.push('language');
                        if (!surveyState.notes.tehsil) noteErrors.push('tehsil');
                        surveyState.errors = noteErrors;
                        return noteErrors.length === 0;
                    }

                    const missingFields = SURVEY_STRUCTURE[currentSectionIndex].questions
                        .filter(q => q.required && (surveyState.answers[q.id] === undefined || surveyState.answers[q.id] === ''))
                        .map(q => q.id);
                    surveyState.errors = missingFields;
                    return missingFields.length === 0;
                };

                const legacyRouter = () => {
                    Object.values(pages).forEach(p => p.classList.remove('active'));
                    Object.values(legacyPages).forEach(p => p.parentElement.classList.remove('active'));
                    
                    const path = window.location.hash.slice(1) || '/';
                    const [url, id] = path.split('/').filter(p => p !== 'legacy');

                    if (url === 'survey') {
                        pages.legacySurvey.classList.add('active');
                        legacyPages.home.style.display = 'none';
                        legacyPages.survey.style.display = 'block';
                        startLegacySurvey();
                    } else if (url === 'responses' && id) {
                        pages.legacyResponseDetail.classList.add('active');
                        renderLegacyResponseDetailPage(id);
                    } else if (url === 'responses') {
                        pages.legacyResponses.classList.add('active');
                        renderLegacyResponsesPage();
                    } else {
                        pages.legacySurvey.classList.add('active');
                        legacyPages.home.style.display = 'block';
                        legacyPages.survey.style.display = 'none';
                        renderLegacyHomePage();
                    }
                };

                loadResponses();
                if (!window.location.hash || !window.location.hash.startsWith('#/legacy')) {
                    window.location.hash = '#/legacy/';
                }
                legacyRouter();
                
                // --- SETUP LISTENERS for the legacy part ---
                // We cannot use the main event delegation as it might conflict.
                // Re-attach specific listeners.
                window.addEventListener('hashchange', legacyRouter);

                document.getElementById('page-legacy-responses').addEventListener('click', (e) => {
                     if (e.target.matches('.legacy-delete-btn')) {
                        const id = e.target.dataset.id;
                        const modal = document.querySelector('#page-legacy-responses #delete-confirm-modal');
                        modal.classList.add('active');
                        modal.dataset.id = id;
                    }
                });

                document.querySelector('#page-legacy-responses #cancel-delete-btn')?.addEventListener('click', () => {
                     document.querySelector('#page-legacy-responses #delete-confirm-modal').classList.remove('active');
                });
                
                document.querySelector('#page-legacy-responses #confirm-delete-btn')?.addEventListener('click', () => {
                    const modal = document.querySelector('#page-legacy-responses #delete-confirm-modal');
                    const id = modal.dataset.id;
                    if (id) deleteResponse(id);
                    modal.classList.remove('active');
                });
                
                document.querySelector('#page-legacy-responses #export-csv-btn')?.addEventListener('click', () => Legacy.exportToCsv(responses));
                document.querySelector('#page-legacy-responses #export-excel-btn')?.addEventListener('click', () => Legacy.exportToExcel(responses));
                
                document.querySelector('#page-legacy-survey #survey-next-btn')?.addEventListener('click', () => {
                    if (validateLegacySurveySection()) { surveyState.currentSectionIndex++; renderLegacySurveySection(); } else { renderLegacySurveySection(); }
                });
                document.querySelector('#page-legacy-survey #survey-prev-btn')?.addEventListener('click', () => {
                    if (surveyState.currentSectionIndex > 0) { surveyState.currentSectionIndex--; renderLegacySurveySection(); }
                });
                document.querySelector('#page-legacy-survey #survey-submit-btn')?.addEventListener('click', () => {
                     if (validateLegacySurveySection()) {
                        addResponse({ participantId: `P-${Date.now()}`, timestamp: Date.now(), answers: surveyState.answers, notes: surveyState.notes });
                        window.location.hash = '#/legacy/';
                    } else { renderLegacySurveySection(); }
                });
                document.getElementById('page-legacy-survey').addEventListener('input', (e) => {
                    const target = e.target;
                    const id = target.dataset.id;
                    if (id) {
                         const value = target.type === 'number' ? target.valueAsNumber || '' : target.value;
                         surveyState.answers[id] = value;
                    }
                });

            };
            
            this.prepareLegacyDOM();
            originalScriptExecution();
        },
        
        prepareLegacyDOM() {
            // The original script assumes its HTML is readily available.
            // We need to inject the original HTML structure into the legacy page containers.
            pages.legacySurvey.innerHTML = `
                <!-- HomePage -->
                <div id="page-home" class="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8" style="display:block;">
                    <div class="max-w-4xl mx-auto">
                        <header class="mb-8"><h1 class="text-4xl font-extrabold text-gray-800 tracking-tight">Dashboard</h1><p class="text-lg text-gray-600 mt-2">Welcome to your field research portal.</p></header>
                        <section class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                            <div class="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4">
                                <div class="bg-blue-100 text-blue-600 p-3 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>
                                <div><p class="text-sm font-medium text-gray-500">Total Responses Collected</p><p id="total-responses" class="text-2xl font-bold text-gray-800">0</p></div>
                            </div>
                            <div class="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4">
                                <div class="bg-blue-100 text-blue-600 p-3 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>
                                <div><p class="text-sm font-medium text-gray-500">Last Collection Date</p><p id="last-collection-date" class="text-2xl font-bold text-gray-800">N/A</p></div>
                            </div>
                        </section>
                        <section>
                            <h2 class="text-2xl font-bold text-gray-700 mb-4">Actions</h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <a href="#/legacy/survey" class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col items-center text-center">
                                    <div class="bg-purple-100 text-purple-600 p-4 rounded-full mb-4"><svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                                    <h3 class="text-lg font-bold text-gray-800">Start New Survey</h3><p class="text-sm text-gray-500 mt-1">Begin a new data collection session.</p>
                                </a>
                                <a href="#/legacy/responses" class="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col items-center text-center">
                                    <div class="bg-purple-100 text-purple-600 p-4 rounded-full mb-4"><svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg></div>
                                    <h3 class="text-lg font-bold text-gray-800">View & Export Responses</h3><p class="text-sm text-gray-500 mt-1">Review collected data and export for analysis.</p>
                                </a>
                            </div>
                        </section>
                    </div>
                </div>
                <!-- SurveyPage -->
                <div id="page-survey" class="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8" style="display:none;">
                    <div class="max-w-3xl mx-auto"><header id="survey-header" class="mb-4"></header><main id="survey-main" class="mt-8"></main><footer class="mt-8 flex justify-between items-center"><button id="survey-prev-btn" class="px-8 py-4 bg-gray-300 text-gray-800 font-bold rounded-lg text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-400 transition-colors">Previous</button><button id="survey-next-btn" class="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg text-lg hover:opacity-90 transition-opacity">Next</button><button id="survey-submit-btn" class="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg text-lg hover:opacity-90 transition-opacity" style="display: none;">Submit Survey</button></footer></div>
                </div>`;
            
            pages.legacyResponses.innerHTML = `
                <div id="page-responses" class="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
                    <div class="max-w-4xl mx-auto">
                        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
                            <div><h1 class="text-4xl font-extrabold text-gray-800 tracking-tight">Collected Responses</h1><p id="responses-count" class="text-lg text-gray-600 mt-2">0 response(s) found.</p></div>
                            <div id="responses-export-buttons" class="flex space-x-2 mt-4 sm:mt-0">
                                <a href="#/legacy/" class="px-5 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg text-base hover:bg-gray-100 transition-colors">Back to Home</a>
                                <button id="export-csv-btn" class="px-5 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg text-base disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">Export All as CSV</button>
                                <button id="export-excel-btn" class="px-5 py-3 bg-green-600 text-white font-bold rounded-lg text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-opacity">Export All as Excel</button>
                            </div>
                        </header>
                        <main id="responses-list-container" class="space-y-4"></main>
                        <div id="responses-empty-state" class="text-center py-16 bg-white rounded-lg shadow-sm" style="display: none;"><svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg><h3 class="mt-4 text-xl font-semibold text-gray-800">No responses yet</h3><p class="mt-1 text-gray-500">Start a new survey to collect data.</p><a href="#/legacy/survey" class="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg hover:opacity-90 transition-opacity">Start New Survey</a></div>
                        <div id="delete-confirm-modal" class="modal-overlay"><div class="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full mx-4"><h2 class="text-xl font-bold mb-4">Confirm Deletion</h2><p class="text-gray-600 mb-6">Are you sure you want to delete this response? This action cannot be undone.</p><div class="flex justify-end space-x-4"><button id="cancel-delete-btn" class="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancel</button><button id="confirm-delete-btn" class="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700">Delete</button></div></div></div>
                    </div>
                </div>`;
            
            pages.legacyResponseDetail.innerHTML = `
                <div id="page-response-detail" class="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8"></div>
            `;
        },
        exportToCsv(responses) {
            const allQuestions = Legacy.SURVEY_STRUCTURE.flatMap(s => s.questions);
            const headers = ['participantId', 'timestamp', ...allQuestions.map(q => q.text)];
            const csv = [
                headers.join(','),
                ...responses.map(r => [
                    r.participantId,
                    new Date(r.timestamp).toISOString(),
                    ...allQuestions.map(q => `"${String(r.answers[q.id] || '').replace(/"/g, '""')}"`)
                ].join(','))
            ].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', 'legacy_survey_responses.csv');
            link.click();
        },
        exportToExcel(responses) {
            const dataForSheet = responses.map(response => {
                const flatResponse = {
                    'Participant ID': response.participantId,
                    'Timestamp': new Date(response.timestamp).toLocaleString(),
                };
                Legacy.SURVEY_STRUCTURE.forEach(section => {
                    section.questions.forEach(q => {
                        flatResponse[q.text] = response.answers[q.id] ?? '';
                    });
                });
                return flatResponse;
            });
            const ws = XLSX.utils.json_to_sheet(dataForSheet);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Responses');
            XLSX.writeFile(wb, 'legacy_survey_responses.xlsx');
        }
    };


    // --- APP INITIALIZATION ---
    async function init() {
        UI.showPage('loading');
        await DB.init();
        await Auth.checkSession();
        Router.init();
        setupEventListeners();
        Router.handle();
    }

    init();
});
