lucide.createIcons();

// --- DOM ELEMENTS ---
const authScreen = document.getElementById('auth-screen');
const loadingScreen = document.getElementById('loading-screen');
const dashboard = document.getElementById('dashboard');
const userProfile = document.getElementById('user-profile');

const connectBtn = document.getElementById('connect-gmail-btn');
const signoutBtn = document.getElementById('signout-button');
const dashboardContainer = document.querySelector('#dashboard .grid');
const loadingProgress = document.getElementById('loading-progress');


// --- GOOGLE API CONFIG ---
// IMPORTANT: REPLACE WITH YOUR OWN CREDENTIALS
const GMAIL_API_KEY = 'AIzaSyCSw6uqKpIS65W2iG4Fl1m4GUU6qdR4Ims'; // <-- 🚨 PASTE YOUR GMAIL API KEY
const CLIENT_ID = '452415313865-h4go9f9u5qb4he1dsrs0j3lsvg6m9kba.apps.googleusercontent.com'; // <-- 🚨 PASTE YOUR CLIENT ID
const GEMINI_API_KEY = 'AIzaSyAufxI2I2lkBpC9qygrTxkkskPz-teerP0'; // <-- 🚨 PASTE YOUR GEMINI API KEY

const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

let tokenClient;
let gapiInited = false;
let gisInited = false;


// --- KANBAN BOARD CONFIG ---
const KANBAN_COLUMNS = {
    APPLIED: 'Applied',
    ASSESSMENT: 'Assessment',
    INTERVIEW: 'Interview',
    OFFER: 'Offer',
    REJECTED: 'Rejected'
};

// --- GOOGLE API INITIALIZATION ---

/**
 * Callback after GAPI script is loaded.
 */
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

/**
 * Callback after GIS script is loaded.
 */
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    maybeEnableButtons();
}

/**
 * Initializes the GAPI client.
 */
async function initializeGapiClient() {
    // Return early if API key is not set
    if (GMAIL_API_KEY === 'YOUR_GMAIL_API_KEY_HERE') {
        console.error("GMAIL_API_KEY is not set in script.js. Please provide your credentials.");
        return;
    }
    await gapi.client.init({
        apiKey: GMAIL_API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'],
    });
    gapiInited = true;
    maybeEnableButtons();
}

/**
 * Enables user interaction once both API libraries are loaded.
 */
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        connectBtn.disabled = false;
    }
}


// --- AUTHENTICATION LOGIC ---

/**
 * Sign in the user upon button click.
 */
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        updateUI('loading');
        await fetchAndProcessEmails();
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

/**
 * Sign out the user upon button click.
 */
function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        updateUI('signed-out');
    }
}

/**
 * Updates the UI based on authentication status.
 * @param {'signed-in' | 'signed-out' | 'loading'} status
 */
function updateUI(status) {
    authScreen.classList.add('hidden');
    loadingScreen.classList.add('hidden');
    dashboard.classList.add('hidden');
    userProfile.classList.add('hidden');
    userProfile.classList.remove('flex');
    authScreen.classList.remove('flex');
    loadingScreen.classList.remove('flex');


    if (status === 'signed-in') {
        dashboard.classList.remove('hidden');
        userProfile.classList.remove('hidden');
        userProfile.classList.add('flex');
        
        gapi.client.gmail.users.getProfile({ 'userId': 'me' })
            .then(response => {
                const profile = response.result;
                document.getElementById('user-name').textContent = profile.emailAddress;
                document.getElementById('user-avatar').src = `https://placehold.co/40x40/4f46e5/ffffff?text=${profile.emailAddress.charAt(0).toUpperCase()}`;
            });

    } else if (status === 'loading') {
        loadingScreen.classList.remove('hidden');
        loadingScreen.classList.add('flex');
    } else { // 'signed-out' state
        dashboardContainer.innerHTML = ''; // Clear board
        authScreen.classList.remove('hidden');
        authScreen.classList.add('flex');
    }
}


// --- GMAIL API & PARSING LOGIC ---

const delay = ms => new Promise(res => setTimeout(res, ms));

/**
 * Decodes email body from base64url encoding.
 * @param {object} message - The full Gmail message object.
 * @returns {string} The decoded plaintext body.
 */
function getEmailBody(message) {
    let body = '';
    const parts = message.payload.parts;

    // Find the text/plain part of the email
    if (parts) {
        const part = parts.find(p => p.mimeType === 'text/plain');
        if (part && part.body && part.body.data) {
            body = part.body.data;
        }
    } else if (message.payload.body && message.payload.body.data) {
        body = message.payload.body.data;
    }

    // Decode from base64url if body was found
    if (body) {
        const base64 = body.replace(/-/g, '+').replace(/_/g, '/');
        try {
            // Use TextDecoder for robust UTF-8 decoding
            const decodedData = atob(base64);
            const uint8Array = new Uint8Array(decodedData.length);
            for (let i = 0; i < decodedData.length; i++) {
                uint8Array[i] = decodedData.charCodeAt(i);
            }
            return new TextDecoder('utf-8').decode(uint8Array);
        } catch (e) {
            console.error("Error decoding email body:", e);
            return '';
        }
    }
    return '';
}


/**
 * New function to parse a batch of email subjects using a single Gemini API call.
 * @param {Array<object>} emails - An array of email objects from the Gmail API.
 * @returns {Promise<Map<string, object>>} A promise that resolves to a map where keys are email IDs and values are { company, role }.
 */
async function batchParseWithGemini(emails) {
    if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        console.error("GEMINI_API_KEY is not set. Skipping parsing.");
        return new Map();
    }
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

    // Create a text block with each subject prefixed by its email ID for mapping back later.
    const subjectsToParse = emails.map(email => {
        const subjectHeader = email.payload.headers.find(h => h.name === 'Subject');
        return `${email.id}::${subjectHeader ? subjectHeader.value : 'No Subject'}`;
    }).join('\n');
    
    // *** CHANGED: Updated prompt for more accuracy and to spell out acronyms ***
    const prompt = `From the following list of email subjects, extract the company name and job role for each. Each line starts with a unique ID followed by "::".
If a company name is an acronym, please spell it out fully (e.g., "HRT" should be "Hudson River Trading").
Respond with a single JSON object where keys are the unique IDs and values are objects containing the extracted company and role.
The format should be {"unique_id_1": {"company": "COMPANY_NAME", "role": "ROLE_NAME"}, "unique_id_2": ...}.
If a value cannot be found for an entry, use "Unknown". If an entry is clearly not a job application (e.g., from a university course), omit it from the response.

List of subjects:
${subjectsToParse}

JSON:`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            })
        });

        if (!response.ok) {
            console.error("Gemini API Error:", response.status, await response.text());
            return new Map();
        }

        const data = await response.json();
        const jsonString = data.candidates[0].content.parts[0].text;
        const cleanedJson = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedResult = JSON.parse(cleanedJson);

        // Convert the object response into a Map for easier lookup.
        return new Map(Object.entries(parsedResult));

    } catch (error) {
        console.error("Error calling or parsing Gemini API response:", error);
        return new Map();
    }
}

/**
 * Fetches emails from Gmail API and orchestrates parsing and rendering.
 */
async function fetchAndProcessEmails() {
    loadingProgress.textContent = 'Searching for application emails...';

    try {
        const messages = [];
        // *** CHANGED: Added negative keywords to filter out irrelevant emails ***
        const query = 'subject:("application" OR "interview" OR "assessment" OR "offer" OR "challenge") -subject:(gradescope OR academic OR homework OR CSM) newer_than:6m';
        const MAX_MESSAGES = 1000;
        let pageToken = undefined;

        do {
            const response = await gapi.client.gmail.users.messages.list({
                'userId': 'me',
                'q': query,
                'maxResults': 500,
                'pageToken': pageToken,
            });

            const pageMessages = response.result.messages || [];
            messages.push(...pageMessages);
            pageToken = response.result.nextPageToken;
            loadingProgress.textContent = `Found ${messages.length} emails so far...`;

        } while (pageToken && messages.length < MAX_MESSAGES);

        if (messages.length === 0) {
            loadingProgress.textContent = "No relevant emails found.";
            setTimeout(() => updateUI('signed-in'), 2000);
            renderDashboard([]);
            return;
        }
        
        const allEmailsDetails = [];
        const gmailChunkSize = 25;
        for (let i = 0; i < messages.length; i += gmailChunkSize) {
            const chunk = messages.slice(i, i + gmailChunkSize);
            loadingProgress.textContent = `Fetching email details (batch ${Math.ceil(i/gmailChunkSize) + 1})...`;

            const batch = gapi.client.newBatch();
            chunk.forEach(message => {
                batch.add(gapi.client.gmail.users.messages.get({ 'userId': 'me', 'id': message.id, 'format': 'full' }));
            });

            const batchResponse = await batch;
            const emailsInBatch = Object.values(batchResponse.result).map(res => res.result);
            allEmailsDetails.push(...emailsInBatch);
            
            await delay(500);
        }
        
        const validEmails = allEmailsDetails.filter(e => e && e.payload);

        loadingProgress.textContent = 'Parsing email details with AI...';
        // *** CHANGED: Gemini batch size reduced to 25 ***
        const geminiChunkSize = 25; 
        const parsingPromises = [];
        for (let i = 0; i < validEmails.length; i += geminiChunkSize) {
            const chunk = validEmails.slice(i, i + geminiChunkSize);
            parsingPromises.push(batchParseWithGemini(chunk));
        }

        const allLlmResults = await Promise.all(parsingPromises);
        const combinedLlmResults = new Map();
        allLlmResults.forEach(map => {
            for (let [key, value] of map) {
                combinedLlmResults.set(key, value);
            }
        });

        const processedApps = new Map();

        validEmails.forEach(email => {
            const subjectHeader = email.payload.headers.find(h => h.name === 'Subject');
            if (!subjectHeader) return;
            
            // *** CHANGED: Logic to skip emails with unresolved companies ***
            const llmData = combinedLlmResults.get(email.id);
            if (!llmData || !llmData.company || llmData.company.toLowerCase() === 'unknown' || llmData.company.toLowerCase() === 'unknown company') {
                return; // Skip this email entirely if company is not found
            }

            const subject = subjectHeader.value;
            const body = getEmailBody(email);
            const content = subject.toLowerCase() + ' ' + (body ? body.toLowerCase() : email.snippet.toLowerCase());

            let status = null;
            const isRejection = content.includes('not moving forward') || content.includes('other candidates') || content.includes('after consideration') || content.includes('unfortunately');

            if (content.includes('offer') && !isRejection) status = KANBAN_COLUMNS.OFFER;
            else if (isRejection) status = KANBAN_COLUMNS.REJECTED;
            else if (content.includes('interview') || content.includes('schedule a call') || content.includes('phone screen')) status = KANBAN_COLUMNS.INTERVIEW;
            else if (content.includes('assessment') || content.includes('coding challenge') || content.includes('take-home') || content.includes('hackerrank')) status = KANBAN_COLUMNS.ASSESSMENT;
            else if (content.includes('application received') || content.includes('we have received') || subject.toLowerCase().includes('your application for') || content.includes('application confirmation')) status = KANBAN_COLUMNS.APPLIED;

            if (!status) return; 

            const appData = {
                id: email.id,
                company: llmData.company,
                role: llmData.role,
                status: status,
                lastUpdate: new Date(parseInt(email.internalDate)).toLocaleString(),
                internalDate: email.internalDate
            };

            const key = `${appData.company}-${appData.role}`;
            const existingApp = processedApps.get(key);

            if (!existingApp || parseInt(appData.internalDate) > parseInt(existingApp.internalDate)) {
                processedApps.set(key, appData);
            }
        });

        const applications = Array.from(processedApps.values());
        console.log(`%cRENDERING DASHBOARD with ${applications.length} applications.`, 'color: lightgreen; font-weight: bold;');
        
        renderDashboard(applications);
        updateUI('signed-in');

    } catch (err) {
        console.error("Error fetching emails:", err);
        loadingProgress.textContent = 'Error fetching emails. Please check console.';
        setTimeout(() => updateUI('signed-out'), 3000);
    }
}

/**
 * Renders the entire Kanban board from the processed application data.
 * @param {Array<object>} applications - An array of application objects.
 */
function renderDashboard(applications) {
    dashboardContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6';
    dashboardContainer.innerHTML = '';
    
    const columnData = {};
    Object.values(KANBAN_COLUMNS).forEach(col => columnData[col] = []);
    
    applications.forEach(app => { if(columnData[app.status]) columnData[app.status].push(app); });

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

// --- INITIALIZATION & EVENT LISTENERS ---

connectBtn.disabled = true;

connectBtn.addEventListener('click', handleAuthClick);
signoutBtn.addEventListener('click', handleSignoutClick);

updateUI('signed-out');

