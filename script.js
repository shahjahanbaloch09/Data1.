
document.addEventListener('DOMContentLoaded', () => {

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


    // --- STATE MANAGEMENT ---
    let responses = [];
    let surveyState = {};

    const loadResponses = () => {
        try {
            const stored = localStorage.getItem(RESPONSES_KEY);
            responses = stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error("Failed to load responses from localStorage", e);
            responses = [];
        }
    };

    const saveResponses = () => {
        try {
            localStorage.setItem(RESPONSES_KEY, JSON.stringify(responses));
        } catch (e) {
            console.error("Failed to save responses to localStorage", e);
        }
    };
    
    const addResponse = (response) => {
        responses.push(response);
        saveResponses();
    };

    const deleteResponse = (participantId) => {
        responses = responses.filter(r => r.participantId !== participantId);
        saveResponses();
        renderResponsesPage(); // Re-render the list
    };

    // --- DOM ELEMENT REFERENCES ---
    const pages = {
        home: document.getElementById('page-home'),
        survey: document.getElementById('page-survey'),
        responses: document.getElementById('page-responses'),
        responseDetail: document.getElementById('page-response-detail'),
    };
    const deleteModal = document.getElementById('delete-confirm-modal');
    
    // --- RENDER FUNCTIONS ---
    
    const renderHomePage = () => {
        document.getElementById('total-responses').textContent = responses.length;
        const lastDateElem = document.getElementById('last-collection-date');
        if (responses.length > 0) {
            const latestResponse = [...responses].sort((a, b) => b.timestamp - a.timestamp)[0];
            lastDateElem.textContent = new Date(latestResponse.timestamp).toLocaleDateString();
        } else {
            lastDateElem.textContent = 'N/A';
        }
    };

    const renderResponsesPage = () => {
        const container = document.getElementById('responses-list-container');
        const emptyState = document.getElementById('responses-empty-state');
        const exportButtons = document.getElementById('responses-export-buttons');

        document.getElementById('responses-count').textContent = `${responses.length} response(s) found.`;
        
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
                        <a href="#/responses/${response.participantId}" class="px-4 py-2 bg-blue-100 text-blue-800 font-semibold rounded-lg text-sm hover:bg-blue-200 transition-colors">
                            View Details
                        </a>
                        <button data-id="${response.participantId}" class="delete-btn p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    };
    
    const renderResponseDetailPage = (id) => {
        const response = responses.find(r => r.participantId === id);
        if (!response) {
            window.location.hash = '#/responses';
            return;
        }

        const container = pages.responseDetail;
        
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

                <div class="sticky top-0 bg-slate-50 py-4 z-10 -mx-4 px-4 border-b mb-6">
                    <div class="max-w-4xl mx-auto flex items-center justify-between">
                        <a href="#/responses" class="px-5 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg text-base hover:bg-gray-100 transition-colors">
                            &larr; Back to List
                        </a>
                        <div class="flex items-center space-x-2">
                            <button id="export-pdf-btn" class="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">PDF</button>
                            <button id="export-txt-btn" class="px-4 py-2 text-sm font-semibold bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">TXT</button>
                            <button id="export-json-btn" class="px-4 py-2 text-sm font-semibold bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">JSON</button>
                        </div>
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
        // Add event listeners for new buttons
        document.getElementById('export-pdf-btn').addEventListener('click', () => exportToPdf(response));
        document.getElementById('export-txt-btn').addEventListener('click', () => exportToTextSummary(response));
        document.getElementById('export-json-btn').addEventListener('click', () => exportToJson(response));
    };

    // --- SURVEY LOGIC ---

    const startSurvey = () => {
        surveyState = {
            currentSectionIndex: 0,
            answers: {},
            notes: { language: '', tehsil: '', observations: '' },
            errors: [],
        };
        renderSurveySection();
    };
    
    const renderSurveySection = () => {
        const { currentSectionIndex, answers, notes, errors } = surveyState;
        const totalSections = SURVEY_STRUCTURE.length;
        const isNotesSection = currentSectionIndex === totalSections;

        const headerContainer = document.getElementById('survey-header');
        const mainContainer = document.getElementById('survey-main');
        
        // Update progress bar
        const percentage = (currentSectionIndex / (totalSections + 1)) * 100;
        const progressBar = `
            <div class="w-full bg-gray-200 rounded-full h-2.5 my-4">
                <div class="bg-gradient-to-r from-blue-500 to-purple-600 h-2.5 rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
            </div>`;

        let headerContent, mainContent;
        
        if (isNotesSection) {
            headerContent = `
                <div class="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm">
                    <div class="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-lg text-white">${NoteIcon({className: "w-8 h-8"})}</div>
                    <div>
                        <h1 class="text-3xl font-bold text-gray-800">Survey Notes</h1>
                        <p class="text-gray-500">Section ${currentSectionIndex + 1} of ${totalSections + 1}</p>
                    </div>
                </div>`;
            mainContent = `
                <div class="bg-white p-6 rounded-lg shadow-sm space-y-6">
                    <div>
                        <label class="block text-lg font-semibold text-gray-800 mb-2">Language of Interview <span class="text-red-500">*</span></label>
                        <input type="text" id="note-language" value="${notes.language}" class="w-full p-3 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500 ${errors.includes('language') ? 'border-red-400' : 'border-gray-300'}" />
                        ${errors.includes('language') ? '<p class="text-red-500 text-sm mt-2">This field is required.</p>' : ''}
                    </div>
                    <div>
                        <label class="block text-lg font-semibold text-gray-800 mb-2">Geographic Location (Tehsil) <span class="text-red-500">*</span></label>
                        <input type="text" id="note-tehsil" value="${notes.tehsil}" class="w-full p-3 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500 ${errors.includes('tehsil') ? 'border-red-400' : 'border-gray-300'}" />
                        ${errors.includes('tehsil') ? '<p class="text-red-500 text-sm mt-2">This field is required.</p>' : ''}
                    </div>
                    <div>
                        <label class="block text-lg font-semibold text-gray-800 mb-2">Additional Observations (Optional)</label>
                        <textarea id="note-observations" rows="5" class="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500">${notes.observations}</textarea>
                    </div>
                </div>`;
        } else {
            const section = SURVEY_STRUCTURE[currentSectionIndex];
            headerContent = `
                <div class="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm">
                     <div class="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-lg text-white">${iconMap[section.icon]({ className: "w-8 h-8" })}</div>
                     <div>
                        <h1 class="text-3xl font-bold text-gray-800">${section.title}</h1>
                        <p class="text-gray-500">Section ${currentSectionIndex + 1} of ${totalSections + 1}</p>
                     </div>
                </div>`;

            mainContent = section.questions.map(q => {
                const value = answers[q.id] || '';
                const error = errors.includes(q.id);
                let inputHtml = '';
                switch (q.type) {
                    case QuestionType.TEXT:
                        inputHtml = `<input type="text" data-id="${q.id}" value="${value}" class="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500">`;
                        break;
                    case QuestionType.NUMBER:
                        inputHtml = `<input type="number" data-id="${q.id}" value="${value}" class="w-full p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500">`;
                        break;
                    case QuestionType.RADIO:
                        inputHtml = `<div class="space-y-3">${q.options.map(opt => `
                            <label class="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                <input type="radio" data-id="${q.id}" name="${q.id}" value="${opt}" ${value === opt ? 'checked' : ''} class="h-5 w-5 text-blue-600 focus:ring-blue-500">
                                <span class="ml-3 text-lg text-gray-700">${opt}</span>
                            </label>`).join('')}
                        </div>`;
                        break;
                }
                return `
                    <div class="bg-white p-6 rounded-lg shadow-sm mb-4 border-2 ${error ? 'border-red-400' : 'border-transparent'}">
                        <label class="block text-lg font-semibold text-gray-800 mb-3">
                            ${q.text} ${q.required ? '<span class="text-red-500">*</span>' : ''}
                        </label>
                        ${inputHtml}
                        ${error ? '<p class="text-red-500 text-sm mt-2">This field is required.</p>' : ''}
                    </div>`;
            }).join('');
        }
        
        headerContainer.innerHTML = progressBar + headerContent;
        mainContainer.innerHTML = mainContent;
        
        // Update button visibility
        document.getElementById('survey-prev-btn').disabled = currentSectionIndex === 0;
        document.getElementById('survey-next-btn').style.display = isNotesSection ? 'none' : 'block';
        document.getElementById('survey-submit-btn').style.display = isNotesSection ? 'block' : 'none';
        
        window.scrollTo(0, 0);
    };
    
    const handleSurveyInputChange = (e) => {
        const target = e.target;
        const id = target.dataset.id;
        if (id) {
             const value = target.type === 'number' ? target.valueAsNumber || '' : target.value;
             surveyState.answers[id] = value;
             if (surveyState.errors.includes(id)) {
                surveyState.errors = surveyState.errors.filter(err => err !== id);
             }
        }
    };

    const handleSurveyNotesChange = () => {
        surveyState.notes.language = document.getElementById('note-language').value;
        surveyState.notes.tehsil = document.getElementById('note-tehsil').value;
        surveyState.notes.observations = document.getElementById('note-observations').value;
    };
    
    const validateSurveySection = () => {
        const { currentSectionIndex } = surveyState;
        const totalSections = SURVEY_STRUCTURE.length;
        
        if (currentSectionIndex === totalSections) { // Notes section
            handleSurveyNotesChange();
            const noteErrors = [];
            if (!surveyState.notes.language) noteErrors.push('language');
            if (!surveyState.notes.tehsil) noteErrors.push('tehsil');
            surveyState.errors = noteErrors;
            return noteErrors.length === 0;
        }

        const currentQuestions = SURVEY_STRUCTURE[currentSectionIndex].questions;
        const missingFields = currentQuestions
            .filter(q => q.required && (surveyState.answers[q.id] === undefined || surveyState.answers[q.id] === ''))
            .map(q => q.id);
        
        surveyState.errors = missingFields;
        return missingFields.length === 0;
    };

    const handleSurveyNext = () => {
        if (validateSurveySection()) {
            surveyState.currentSectionIndex++;
            renderSurveySection();
        } else {
            renderSurveySection(); // Re-render to show errors
        }
    };
    
    const handleSurveyPrev = () => {
        surveyState.errors = [];
        if (surveyState.currentSectionIndex > 0) {
            surveyState.currentSectionIndex--;
            renderSurveySection();
        }
    };
    
    const handleSurveySubmit = () => {
        if (validateSurveySection()) {
            const newResponse = {
                participantId: `P-${Date.now()}`,
                timestamp: Date.now(),
                answers: surveyState.answers,
                notes: surveyState.notes,
            };
            addResponse(newResponse);
            window.location.hash = '#/';
        } else {
             renderSurveySection();
        }
    };

    // --- EXPORT LOGIC ---
    const triggerDownload = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const exportToJson = (response) => {
        const jsonString = JSON.stringify(response, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        triggerDownload(blob, `survey-response-${response.participantId}.json`);
    };

    const exportToCsv = (responses) => {
        const headers = ['participantId', 'timestamp', 'notes_language', 'notes_tehsil', 'notes_observations', ...SURVEY_STRUCTURE.flatMap(section => section.questions.map(q => `${section.id}_${q.id}`))];
        const rows = responses.map(response => {
            const row = [response.participantId, new Date(response.timestamp).toISOString(), response.notes.language, response.notes.tehsil, response.notes.observations.replace(/,/g, ';')];
            SURVEY_STRUCTURE.forEach(section => {
                section.questions.forEach(q => {
                    const answer = response.answers[q.id] || '';
                    row.push(typeof answer === 'string' ? answer.replace(/,/g, ';') : String(answer));
                });
            });
            return row.join(',');
        });
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-t-8;' });
        triggerDownload(blob, `survey-responses-all.csv`);
    };

    const exportToTextSummary = (response) => {
        let summary = `Survey Response Summary\n=========================\n\nParticipant ID: ${response.participantId}\nDate: ${new Date(response.timestamp).toLocaleString()}\n\n--- Survey Notes ---\nLanguage: ${response.notes.language}\nTehsil: ${response.notes.tehsil}\nObservations: ${response.notes.observations}\n\n`;
        SURVEY_STRUCTURE.forEach(section => {
            summary += `--- ${section.title} ---\n`;
            section.questions.forEach(q => {
                summary += `${q.text}: ${response.answers[q.id] || 'N/A'}\n`;
            });
            summary += `\n`;
        });
        const blob = new Blob([summary], { type: 'text/plain' });
        triggerDownload(blob, `summary-${response.participantId}.txt`);
    };

    const exportToPdf = (response) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let finalY = 0;
        doc.setFontSize(20);
        doc.text('Survey Response Summary', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Participant ID: ${response.participantId}`, 14, 35);
        doc.text(`Date: ${new Date(response.timestamp).toLocaleString()}`, 14, 42);
        doc.setFontSize(16);
        doc.text('Survey Notes', 14, 55);
        doc.autoTable({ startY: 60, theme: 'plain', body: [['Language:', response.notes.language], ['Tehsil:', response.notes.tehsil], ['Observations:', response.notes.observations || 'N/A']], columnStyles: { 0: { fontStyle: 'bold' } } });
        finalY = doc.lastAutoTable.finalY;
        SURVEY_STRUCTURE.forEach(section => {
            doc.setFontSize(16);
            if (finalY + 20 > doc.internal.pageSize.getHeight()) { doc.addPage(); finalY = 0; }
            doc.text(section.title, 14, finalY + 15);
            const tableData = section.questions.map(q => [q.text, String(response.answers[q.id] ?? 'N/A')]);
            doc.autoTable({ startY: finalY + 20, head: [['Question', 'Answer']], body: tableData, theme: 'striped', headStyles: { fillColor: [22, 160, 133] }, didDrawPage: () => { finalY = 0; } });
            finalY = doc.lastAutoTable.finalY;
        });
        doc.save(`survey-response-${response.participantId}.pdf`);
    };
    
    const exportToExcel = (responses) => {
        const dataForSheet = responses.map(response => {
            const flatResponse = { 'Participant ID': response.participantId, 'Timestamp': new Date(response.timestamp).toLocaleString(), 'Language': response.notes.language, 'Tehsil': response.notes.tehsil, 'Observations': response.notes.observations };
            SURVEY_STRUCTURE.forEach(section => {
                section.questions.forEach(q => {
                    const header = q.text;
                    flatResponse[header] = response.answers[q.id] ?? '';
                });
            });
            return flatResponse;
        });
        const ws = XLSX.utils.json_to_sheet(dataForSheet);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Survey Responses');
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        triggerDownload(data, 'survey-responses-all.xlsx');
    };

    // --- ROUTER ---
    const router = () => {
        const path = window.location.hash.slice(1) || '/';
        const [url, id] = path.split('/').filter(Boolean);

        Object.values(pages).forEach(page => page.classList.remove('active'));

        if (url === 'survey') {
            pages.survey.classList.add('active');
            startSurvey();
        } else if (url === 'responses' && id) {
            pages.responseDetail.classList.add('active');
            renderResponseDetailPage(id);
        } else if (url === 'responses') {
            pages.responses.classList.add('active');
            renderResponsesPage();
        } else {
            pages.home.classList.add('active');
            renderHomePage();
        }
    };

    // --- EVENT LISTENERS & INITIALIZATION ---
    window.addEventListener('hashchange', router);
    
    // Responses page event delegation for delete buttons
    pages.responses.addEventListener('click', (e) => {
        if (e.target.matches('.delete-btn')) {
            const id = e.target.dataset.id;
            deleteModal.classList.add('active');
            deleteModal.dataset.id = id;
        }
    });

    document.getElementById('cancel-delete-btn').addEventListener('click', () => {
        deleteModal.classList.remove('active');
    });

    document.getElementById('confirm-delete-btn').addEventListener('click', () => {
        const id = deleteModal.dataset.id;
        if (id) {
            deleteResponse(id);
        }
        deleteModal.classList.remove('active');
    });
    
    document.getElementById('export-csv-btn').addEventListener('click', () => exportToCsv(responses));
    document.getElementById('export-excel-btn').addEventListener('click', () => exportToExcel(responses));
    
    // Survey page listeners
    document.getElementById('survey-next-btn').addEventListener('click', handleSurveyNext);
    document.getElementById('survey-prev-btn').addEventListener('click', handleSurveyPrev);
    document.getElementById('survey-submit-btn').addEventListener('click', handleSurveySubmit);
    pages.survey.addEventListener('input', (e) => {
        if (surveyState.currentSectionIndex === SURVEY_STRUCTURE.length) {
            handleSurveyNotesChange();
        } else {
            handleSurveyInputChange(e);
        }
    });


    // --- APP START ---
    loadResponses();
    if (!window.location.hash) {
        window.location.hash = '#/';
    }
    router();
});
