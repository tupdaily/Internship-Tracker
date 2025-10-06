lucide.createIcons();

// --- DOM ELEMENTS ---
const authScreen = document.getElementById('auth-screen');
const loadingScreen = document.getElementById('loading-screen');
const dashboard = document.getElementById('dashboard');
const connectBtn = document.getElementById('connect-gmail-btn');
const dashboardContainer = document.querySelector('#dashboard .grid');

// --- MOCK EMAIL DATA ---
// This simulates the data we would get from the Gmail API
const mockEmails = [
    { id: '1', subject: 'Your Application for Software Engineer Intern at Google', snippet: 'Thank you for your interest in Google. We have received your application...' },
    { id: '2', subject: 'Update on your application to Meta', snippet: 'We\'d like to invite you to a first round interview for the Product Manager Intern role.' },
    { id: '3', subject: 'Next Steps: Coding Challenge for Amazon SDE Intern', snippet: 'Your application has advanced. Please complete the following coding assessment within 7 days.' },
    { id: '4', subject: 'Re: Your application for Data Scientist Intern at Netflix', snippet: 'Unfortunately, we will not be moving forward with your candidacy at this time.' },
    { id: '5', subject: 'Your application for Apple SWE Intern is received', snippet: 'We have received your application and our team will review it shortly.' },
    { id: '6', subject: 'An Update on your Microsoft Explore Internship application', snippet: 'We were impressed with your background and would like to schedule a final round interview.' },
    { id: '7', subject: 'Offer of Internship - Stripe', snippet: 'Congratulations! We are thrilled to offer you the position of Software Engineer Intern at Stripe.' },
    { id: '8', subject: 'Your application to Vercel', snippet: 'Thanks for applying to the Frontend Engineer Intern role. Please complete this take-home project.' },
    { id: '9', subject: 'Follow-up on your interview with Meta', snippet: 'Thank you for your time. After careful consideration, we have decided to move forward with other candidates.' },
    { id: '10', subject: 'Interview with Google for SWE Intern', snippet: 'We would like to schedule a technical phone screen with you. Please provide your availability.' },
];

const KANBAN_COLUMNS = {
    APPLIED: 'Applied',
    ASSESSMENT: 'Assessment',
    INTERVIEW: 'Interview',
    OFFER: 'Offer',
    REJECTED: 'Rejected'
};

// --- CORE LOGIC ---

/**
 * Parses an email object to extract application details.
 * This is the "magic" of the application. In a real app, this would be
 * much more sophisticated, likely using more advanced NLP/ML.
 * @param {object} email - A mock email object.
 * @returns {object|null} An object with application data or null if not an application email.
 */
function parseEmailForApplication(email) {
    const subject = email.subject.toLowerCase();
    const snippet = email.snippet.toLowerCase();
    const content = subject + ' ' + snippet;

    let status = null;
    let company = null;
    let role = null;
    
    // 1. Determine Status (order matters, from latest to earliest stage)
    if (content.includes('offer')) {
        status = KANBAN_COLUMNS.OFFER;
    } else if (content.includes('interview') || content.includes('schedule a call') || content.includes('phone screen')) {
        status = KANBAN_COLUMNS.INTERVIEW;
    } else if (content.includes('assessment') || content.includes('coding challenge') || content.includes('take-home')) {
        status = KANBAN_COLUMNS.ASSESSMENT;
    } else if (content.includes('not be moving forward') || content.includes('other candidates')) {
        status = KANBAN_COLUMNS.REJECTED;
    } else if (content.includes('application received') || content.includes('we have received') || subject.includes('your application for')) {
        status = KANBAN_COLUMNS.APPLIED;
    }

    if (!status) return null; // Not a trackable email

    // 2. Extract Company
    const companyMatch = subject.match(/(?:at|to|with)\s([\w\s]+)/i);
    if (companyMatch && companyMatch[1]) {
        company = companyMatch[1].replace(/(\'s.*)/,'').trim();
    } else {
        // Fallback for subjects like "Offer of Internship - Stripe"
        const companyMatchDash = subject.match(/-\s*([\w\s]+)/);
        if (companyMatchDash && companyMatchDash[1]) {
            company = companyMatchDash[1].trim();
        }
    }


    // 3. Extract Role
    const roleMatch = subject.match(/for\s(the\s)?(.*?)(intern|role|position)/i);
     if (roleMatch && roleMatch[2]) {
        role = roleMatch[2].trim() + " Intern";
    }
    
    // Capitalize for display
    if(company) company = company.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    if(role) role = role.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    return {
        id: email.id,
        company: company || 'Unknown Company',
        role: role || 'Unknown Role',
        status: status,
        lastUpdate: new Date().toLocaleDateString() // Simulate date
    };
}

/**
 * Renders the entire Kanban board from the processed application data.
 * @param {Array<object>} applications - An array of application objects.
 */
function renderDashboard(applications) {
    dashboardContainer.innerHTML = ''; // Clear previous state
    
    const columnData = {};
    Object.values(KANBAN_COLUMNS).forEach(col => columnData[col] = []);
    
    applications.forEach(app => {
        if(columnData[app.status]) {
            columnData[app.status].push(app);
        }
    });

    const statusColors = {
        [KANBAN_COLUMNS.APPLIED]: 'border-sky-500',
        [KANBAN_COLUMNS.ASSESSMENT]: 'border-amber-500',
        [KANBAN_COLUMNS.INTERVIEW]: 'border-indigo-500',
        [KANBAN_COLUMNS.OFFER]: 'border-green-500',
        [KANBAN_COLUMNS.REJECTED]: 'border-red-500',
    };

    Object.entries(columnData).forEach(([columnName, apps]) => {
        const columnEl = document.createElement('div');
        columnEl.className = 'bg-slate-800 rounded-xl flex flex-col';
        
        const cardsHtml = apps.map(app => `
            <div class="bg-slate-700/50 p-4 rounded-lg border border-slate-600 shadow-md hover:bg-slate-700 transition-colors duration-200">
                <h4 class="font-bold text-lg text-white">${app.company}</h4>
                <p class="text-slate-300 text-sm">${app.role}</p>
                <p class="text-xs text-slate-400 mt-2">Last Update: ${app.lastUpdate}</p>
            </div>
        `).join('');

        columnEl.innerHTML = `
            <div class="p-4 border-b-2 ${statusColors[columnName]}">
                <h3 class="font-semibold text-lg flex items-center">
                    ${columnName}
                    <span class="ml-2 text-sm bg-slate-700 text-slate-300 rounded-full px-2 py-0.5">${apps.length}</span>
                </h3>
            </div>
            <div class="p-4 space-y-4 overflow-y-auto flex-grow kanban-column" style="max-height: 60vh;">
                ${cardsHtml || '<p class="text-sm text-slate-500 p-4 text-center">No applications here.</p>'}
            </div>
        `;
        dashboardContainer.appendChild(columnEl);
    });
}

/**
 * Simulates fetching and processing emails.
 */
function processEmails() {
    const processedApps = new Map();

    mockEmails.forEach(email => {
        const appData = parseEmailForApplication(email);
        if (appData) {
            // If we find a new status for an existing application, update it.
            // This ensures we only show the latest status.
            const key = `${appData.company}-${appData.role}`;
            if (!processedApps.has(key) || (processedApps.has(key) && Object.values(KANBAN_COLUMNS).indexOf(appData.status) > Object.values(KANBAN_COLUMNS).indexOf(processedApps.get(key).status))) {
                 processedApps.set(key, appData);
            }
        }
    });

    renderDashboard(Array.from(processedApps.values()));
}

// --- EVENT LISTENERS ---
connectBtn.addEventListener('click', () => {
    // 1. Switch to loading view
    authScreen.classList.add('hidden');
    loadingScreen.classList.remove('hidden');
    loadingScreen.classList.add('flex');

    // 2. Simulate API call and processing
    setTimeout(() => {
        processEmails();

        // 3. Switch to dashboard view
        loadingScreen.classList.add('hidden');
        loadingScreen.classList.remove('flex');
        dashboard.classList.remove('hidden');

    }, 2500); // 2.5 second delay for effect
});
