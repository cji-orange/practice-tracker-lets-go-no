// Constants
const INSTRUMENTS = [
    'Oboe', 'Flute', 'Clarinet', 'Saxophone', 'Trumpet', 'Trombone',
    'French Horn', 'Violin', 'Viola', 'Cello', 'Bass', 'Piano'
];
const CATEGORIES = ['Warm Ups', 'Band Music', 'Orchestra Music', 'Scales'];

// Supabase variables
let supabase;

// DOM Elements
let app, signUpView, signInView, dashboardView, practiceSessionView;
let signUpForm, signInForm, practiceSessionForm;
let signUpFirstName, signUpLastName, signUpEmail, signUpPassword, signUpInstrumentsDiv;
let signInEmail, signInPassword;
let showSignInBtn, showSignUpBtn, signOutBtn;
let userFirstNameSpan, userEmailSpan, userInstrumentsList, avgPracticeTimeSpan;
let practiceChartCanvas, recentSessionsDiv;
let showCreateSessionBtn, backToDashboardBtn;
let sessionInstrumentSelect, createSubsessionBtn, subsessionsContainer, totalSessionTimeSpan;
let signUpError, signInError, dashboardError, practiceSessionError;
let savePracticeSessionBtn;

// App State
let currentUser = null;
let currentPracticeSession = null;
let currentSubsessions = [];
let practiceChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Practice Tracker App Initializing...');

    // Get DOM Elements
    app = document.getElementById('app');
    signUpView = document.getElementById('signUpView');
    signInView = document.getElementById('signInView');
    dashboardView = document.getElementById('dashboardView');
    practiceSessionView = document.getElementById('practiceSessionView');

    signUpForm = document.getElementById('signUpForm');
    signInForm = document.getElementById('signInForm');
    practiceSessionForm = document.getElementById('practiceSessionForm');

    signUpFirstName = document.getElementById('signUpFirstName');
    signUpLastName = document.getElementById('signUpLastName');
    signUpEmail = document.getElementById('signUpEmail');
    signUpPassword = document.getElementById('signUpPassword');
    signUpInstrumentsDiv = document.getElementById('signUpInstruments');

    signInEmail = document.getElementById('signInEmail');
    signInPassword = document.getElementById('signInPassword');

    showSignInBtn = document.getElementById('showSignInBtn');
    showSignUpBtn = document.getElementById('showSignUpBtn');
    signOutBtn = document.getElementById('signOutBtn');

    userFirstNameSpan = document.getElementById('userFirstName');
    userEmailSpan = document.getElementById('userEmail');
    userInstrumentsList = document.getElementById('userInstrumentsList');
    avgPracticeTimeSpan = document.getElementById('avgPracticeTime');

    practiceChartCanvas = document.getElementById('practiceChart');
    recentSessionsDiv = document.getElementById('recentSessions');

    showCreateSessionBtn = document.getElementById('showCreateSessionBtn');
    backToDashboardBtn = document.getElementById('backToDashboardBtn');

    sessionInstrumentSelect = document.getElementById('sessionInstrument');
    createSubsessionBtn = document.getElementById('createSubsessionBtn');
    subsessionsContainer = document.getElementById('subsessionsContainer');
    totalSessionTimeSpan = document.getElementById('totalSessionTime');

    signUpError = document.getElementById('signUpError');
    signInError = document.getElementById('signInError');
    dashboardError = document.getElementById('dashboardError');
    practiceSessionError = document.getElementById('practiceSessionError');

    // Get the save button
    savePracticeSessionBtn = document.getElementById('savePracticeSessionBtn');

    // Populate Sign Up Instruments
    populateInstrumentsCheckboxes();

    // Setup View Switching Buttons
    showSignInBtn.addEventListener('click', () => showView('signInView'));
    showSignUpBtn.addEventListener('click', () => showView('signUpView'));

    // Initialize Supabase
    try {
        const response = await fetch('/api/get-supabase-config');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const config = await response.json();

        if (!config.supabaseUrl || !config.supabaseAnonKey) {
             throw new Error('Supabase config missing from server response.');
        }

        supabase = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        console.log('Supabase client initialized.');

        // Setup Event Listeners
        setupEventListeners();

        // Setup Auth State Listener
        supabase.auth.onAuthStateChange(handleAuthStateChange);

        // Check initial session
        const { data: { session } } = await supabase.auth.getSession();
        handleAuthStateChange('INITIAL_SESSION', session);

    } catch (error) {
        console.error('Error initializing Supabase:', error);
        app.innerHTML = `<h2>Error Initializing Application</h2><p>Could not connect to the backend services. Please ensure the Supabase URL and Key are correctly configured in your environment variables and the serverless function is working. Error: ${error.message}</p>`;
    }

});

// --- Helper Functions ---

function showView(viewId) {
    // Hide all views first
    document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
    // Show the target view
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
    } else {
        console.error(`View with ID ${viewId} not found.`);
    }
     // Clear any previous errors when switching views
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
        el.classList.add('hidden');
    });
}

function displayError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    } else {
        console.error(`Error element with ID ${elementId} not found.`);
    }
}

function clearError(elementId) {
     const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.add('hidden');
    }
}

function populateInstrumentsCheckboxes() {
    signUpInstrumentsDiv.innerHTML = ''; // Clear existing
    INSTRUMENTS.forEach(instrument => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'instrument';
        checkbox.value = instrument;
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(instrument));
        signUpInstrumentsDiv.appendChild(label);
    });
}

// --- Auth Functions ---

async function handleSignUp(event) {
    event.preventDefault();
    clearError('signUpError');

    const firstName = signUpFirstName.value;
    const lastName = signUpLastName.value;
    const email = signUpEmail.value;
    const password = signUpPassword.value;
    const selectedInstruments = Array.from(signUpInstrumentsDiv.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

    if (selectedInstruments.length === 0) {
        displayError('signUpError', 'Please select at least one instrument.');
        return;
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    instruments: selectedInstruments // Store instruments in metadata
                }
            }
        });

        if (error) {
            // Check for specific error codes if needed, e.g., user already registered
            if (error.message.includes("User already registered")) {
                 displayError('signUpError', 'User already exists, please Sign In.');
            } else {
                throw error;
            }
        } else if (data.user) {
            console.log('Sign up successful, user:', data.user);
            // Auth state change listener will handle showing the dashboard
             // Optional: Show a success message or confirmation needed message if email verification is on
            alert('Sign up successful! Please check your email for verification if enabled.');
            // No need to manually switch view, onAuthStateChange will handle it
        } else {
             displayError('signUpError', 'Sign up failed. Please try again.');
        }
    } catch (error) {
        console.error('Sign up error:', error);
        displayError('signUpError', `Sign up failed: ${error.message}`);
    }
}

async function handleSignIn(event) {
    event.preventDefault();
    clearError('signInError');

    const email = signInEmail.value;
    const password = signInPassword.value;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        console.log('Sign in successful, session:', data.session);
        // Auth state change listener will handle showing the dashboard

    } catch (error) {
        console.error('Sign in error:', error);
        displayError('signInError', `Sign in failed: ${error.message}`);
    }
}

async function handleSignOut() {
     clearError('dashboardError'); // Clear dashboard errors on sign out
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        console.log('Signed out successfully');
        // Auth state change listener handles view change
    } catch (error) {
        console.error('Sign out error:', error);
         displayError('dashboardError', `Sign out failed: ${error.message}`);
    }
}

function handleAuthStateChange(event, session) {
    console.log('Auth state changed:', event, session);
    if (session && session.user) {
        currentUser = session.user;
        console.log('User logged in:', currentUser);
        loadDashboard();
        showView('dashboardView');
    } else {
        currentUser = null;
        console.log('User logged out or no session');
        // Clear dashboard elements if needed
        userFirstNameSpan.textContent = '';
        userEmailSpan.textContent = '';
        userInstrumentsList.innerHTML = '';
        recentSessionsDiv.innerHTML = '';
        if (practiceChartInstance) {
            practiceChartInstance.destroy();
            practiceChartInstance = null;
        }
        avgPracticeTimeSpan.textContent = 'N/A';

        showView('signInView'); // Show sign-in page by default when logged out
    }
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    signUpForm.addEventListener('submit', handleSignUp);
    signInForm.addEventListener('submit', handleSignIn);
    signOutBtn.addEventListener('click', handleSignOut);

    // Add other listeners as needed, e.g., for dashboard buttons
     showCreateSessionBtn.addEventListener('click', () => {
         startNewPracticeSession();
         showView('practiceSessionView');
     });
     backToDashboardBtn.addEventListener('click', () => {
         // Maybe prompt user if they want to discard current session?
         // For now, just go back and potentially lose unsaved subsession data
         clearPracticeSessionView();
         showView('dashboardView');
          loadDashboard(); // Refresh dashboard data
     });

     createSubsessionBtn.addEventListener('click', createSubsessionCard);

     // Add listener for the save practice session button
     savePracticeSessionBtn.addEventListener('click', savePracticeSession);
}

// Placeholder for dashboard loading function
function loadDashboard() {
    if (!currentUser) return;
    console.log('Loading dashboard for user:', currentUser.id);
    // TODO: Implement actual data fetching and UI updates
    userFirstNameSpan.textContent = currentUser.user_metadata?.first_name || 'User';
    userEmailSpan.textContent = currentUser.email;
    displayUserInstruments(currentUser.user_metadata?.instruments || []);
    loadRecentSessions(); // Needs implementation
    loadPracticeChart(); // Needs implementation
}

// Placeholder for displaying instruments
function displayUserInstruments(instruments) {
     userInstrumentsList.innerHTML = '';
     if (instruments.length > 0) {
         instruments.forEach(inst => {
             const li = document.createElement('li');
             li.textContent = inst;
             userInstrumentsList.appendChild(li);
         });
     } else {
         userInstrumentsList.innerHTML = '<li>No instruments added yet.</li>';
     }
}

// Placeholder data loading functions
async function loadRecentSessions() {
    if (!currentUser) return;
    clearError('dashboardError');
    recentSessionsDiv.innerHTML = '<p>Loading recent sessions...</p>';

    try {
        // 1. Fetch the 5 most recent sessions for the user
        const { data: sessions, error: sessionsError } = await supabase
            .from('practice_sessions')
            .select('id, date, instrument, total_minutes')
            .eq('user_id', currentUser.id)
            .order('date', { ascending: false })
            .limit(5);

        if (sessionsError) throw sessionsError;

        if (!sessions || sessions.length === 0) {
            recentSessionsDiv.innerHTML = '<p>No practice sessions recorded yet.</p>';
            return;
        }

        // 2. Fetch subsessions for these specific session IDs
        const sessionIds = sessions.map(s => s.id);
        const { data: subsessions, error: subsessionsError } = await supabase
            .from('practice_subsessions')
            .select('session_id, category, minutes, notes')
            .in('session_id', sessionIds);

        if (subsessionsError) throw subsessionsError;

        // 3. Group subsessions by session_id for easier lookup
        const subsessionsBySessionId = subsessions.reduce((acc, sub) => {
            if (!acc[sub.session_id]) {
                acc[sub.session_id] = [];
            }
            acc[sub.session_id].push(sub);
            return acc;
        }, {});

        // 4. Generate HTML
        let sessionsHtml = '';
        sessions.forEach(session => {
            const sessionSubsessions = subsessionsBySessionId[session.id] || [];
            let subsessionsHtml = '';
            if (sessionSubsessions.length > 0) {
                 subsessionsHtml = '<ul class="subsession-details">';
                sessionSubsessions.forEach(sub => {
                    subsessionsHtml += `<li><strong>${sub.category}:</strong> ${sub.minutes} min ${sub.notes ? '(Notes: ' + escapeHtml(sub.notes) + ')' : ''}</li>`;
                });
                 subsessionsHtml += '</ul>';
            } else {
                 subsessionsHtml = '<p class="subsession-details">No subsession details found.</p>';
            }

            sessionsHtml += `
                <div class="session-card">
                    <h4>${session.instrument} on ${session.date}</h4>
                    <p><strong>Total Time:</strong> ${session.total_minutes} minutes</p>
                    ${subsessionsHtml}
                </div>
            `;
        });

        recentSessionsDiv.innerHTML = sessionsHtml;

    } catch (error) {
        console.error('Error loading recent sessions:', error);
        displayError('dashboardError', `Failed to load recent sessions: ${error.message}`);
        recentSessionsDiv.innerHTML = '<p>Error loading sessions.</p>';
    }
}

async function loadPracticeChart() {
    if (!currentUser) return;
    clearError('dashboardError');
    avgPracticeTimeSpan.textContent = 'Loading...';

    try {
        // 1. Calculate date range (last 7 days including today)
        const today = new Date();
        const endDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const startDateDate = new Date();
        startDateDate.setDate(today.getDate() - 6);
        const startDate = startDateDate.toISOString().split('T')[0]; // YYYY-MM-DD

        // 2. Fetch sessions within the date range
        const { data: sessions, error } = await supabase
            .from('practice_sessions')
            .select('date, total_minutes')
            .eq('user_id', currentUser.id)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

        if (error) throw error;

        // 3. Process data for the chart
        const dailyTotals = {};
        const chartLabels = [];
        const dateCursor = new Date(startDateDate); // Use the Date object for iteration

        // Initialize daily totals and labels for the last 7 days
        for (let i = 0; i < 7; i++) {
            const dateString = dateCursor.toISOString().split('T')[0];
            // Use short day names for labels
            chartLabels.push(dateCursor.toLocaleDateString('en-US', { weekday: 'short' }));
            dailyTotals[dateString] = 0;
            dateCursor.setDate(dateCursor.getDate() + 1);
        }

        // Add practice minutes from fetched sessions
        let totalMinutes7Days = 0;
        sessions.forEach(session => {
            if (dailyTotals.hasOwnProperty(session.date)) {
                dailyTotals[session.date] += session.total_minutes;
            }
             totalMinutes7Days += session.total_minutes;
        });

        // 4. Prepare chart data
        const chartDataPoints = chartLabels.map((_, index) => {
             const date = new Date(startDateDate);
             date.setDate(startDateDate.getDate() + index);
             const dateString = date.toISOString().split('T')[0];
             return dailyTotals[dateString] || 0;
        });

        // 5. Calculate average
        const averageMinutes = totalMinutes7Days / 7;
        avgPracticeTimeSpan.textContent = averageMinutes.toFixed(1);

        // 6. Update Chart.js
        const data = {
            labels: chartLabels,
            datasets: [{
                label: 'Minutes Practiced',
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgb(75, 192, 192)',
                borderWidth: 1,
                data: chartDataPoints,
            }]
        };

        const config = {
            type: 'bar',
            data: data,
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                         title: {
                            display: true,
                            text: 'Minutes'
                         }
                    }
                },
                responsive: true,
                maintainAspectRatio: false
            }
        };

        if (practiceChartInstance) {
            practiceChartInstance.destroy();
        }
        if (practiceChartCanvas) {
             practiceChartInstance = new Chart(practiceChartCanvas.getContext('2d'), config);
        } else {
            console.error("Chart canvas element not found");
        }

    } catch (error) {
        console.error('Error loading practice chart:', error);
        displayError('dashboardError', `Failed to load practice chart: ${error.message}`);
        avgPracticeTimeSpan.textContent = 'Error';
         // Optionally clear/hide the chart canvas on error
         if (practiceChartInstance) {
             practiceChartInstance.destroy();
             practiceChartInstance = null;
         }
         // You might want to clear the canvas content too
         const ctx = practiceChartCanvas?.getContext('2d');
         if (ctx) {
             ctx.clearRect(0, 0, practiceChartCanvas.width, practiceChartCanvas.height);
         }
    }
}

// Placeholder functions for Practice Session View
function startNewPracticeSession() {
    console.log("Starting new practice session setup...");
     clearPracticeSessionView();
     populateSessionInstrumentDropdown(currentUser.user_metadata?.instruments || []);
     // Reset state for the new session
    currentPracticeSession = null; // Will be created when first subsession is saved
    currentSubsessions = [];
    totalSessionTimeSpan.textContent = '0';
}

function clearPracticeSessionView() {
    sessionInstrumentSelect.innerHTML = '<option value="">Select Instrument</option>';
    subsessionsContainer.innerHTML = '';
    totalSessionTimeSpan.textContent = '0';
    clearError('practiceSessionError');
}

function populateSessionInstrumentDropdown(instruments) {
    sessionInstrumentSelect.innerHTML = '<option value="">Select Instrument</option>'; // Clear and add default
    instruments.forEach(inst => {
        const option = document.createElement('option');
        option.value = inst;
        option.textContent = inst;
        sessionInstrumentSelect.appendChild(option);
    });
}

function createSubsessionCard() {
    const cardId = `subsession-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const subsessionCard = document.createElement('div');
    subsessionCard.classList.add('subsession-card');
    subsessionCard.id = cardId;

    // State for this specific card's stopwatch
    let stopwatchInterval = null;
    let stopwatchStartTime = 0;
    let stopwatchElapsedTime = 0; // in seconds
    let stopwatchRunning = false;

    const categoryOptions = CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');

    subsessionCard.innerHTML = `
        <button type="button" class="remove-subsession-btn" style="float: right;" title="Remove Subsession">X</button>
        <h4>New Subsession</h4>
        <label for="${cardId}-category">Category:</label>
        <select id="${cardId}-category" name="category" class="subsession-category">
             <option value="">Select Category</option>
            ${categoryOptions}
        </select>

        <div class="subsession-tabs">
            <button type="button" class="tab-button active" data-target="${cardId}-stopwatch-pane">Stopwatch</button>
            <button type="button" class="tab-button" data-target="${cardId}-manual-pane">Manual Entry</button>
        </div>

        <div id="${cardId}-stopwatch-pane" class="subsession-pane">
            <div class="stopwatch-time" id="${cardId}-time-display">00:00</div>
            <button type="button" class="stopwatch-start-btn">Start</button>
            <button type="button" class="stopwatch-stop-btn" disabled>Stop</button>
            <button type="button" class="stopwatch-reset-btn">Reset</button>
            <br>
            <label for="${cardId}-stopwatch-notes">Notes:</label>
            <textarea id="${cardId}-stopwatch-notes" rows="2" class="subsession-notes"></textarea>
            <button type="button" class="subsession-submit-btn">Submit Subsession</button>
             <span class="subsession-status"></span>
        </div>

        <div id="${cardId}-manual-pane" class="subsession-pane hidden">
            <label for="${cardId}-manual-minutes">Minutes Practiced:</label>
            <input type="number" id="${cardId}-manual-minutes" min="0" step="1" placeholder="e.g., 15" class="subsession-manual-minutes">
            <br>
            <label for="${cardId}-manual-notes">Notes:</label>
            <textarea id="${cardId}-manual-notes" rows="2" class="subsession-notes"></textarea>
            <button type="button" class="subsession-submit-btn">Submit Subsession</button>
             <span class="subsession-status"></span>
        </div>
    `;

    subsessionsContainer.appendChild(subsessionCard);

    // --- Add Event Listeners for this specific card ---
    const categorySelect = subsessionCard.querySelector('.subsession-category');
    const tabButtons = subsessionCard.querySelectorAll('.tab-button');
    const stopwatchPane = subsessionCard.querySelector(`#${cardId}-stopwatch-pane`);
    const manualPane = subsessionCard.querySelector(`#${cardId}-manual-pane`);
    const timeDisplay = subsessionCard.querySelector(`#${cardId}-time-display`);
    const startBtn = subsessionCard.querySelector('.stopwatch-start-btn');
    const stopBtn = subsessionCard.querySelector('.stopwatch-stop-btn');
    const resetBtn = subsessionCard.querySelector('.stopwatch-reset-btn');
    const submitBtns = subsessionCard.querySelectorAll('.subsession-submit-btn');
    // Add listener to remove button
    subsessionCard.querySelector('.remove-subsession-btn').addEventListener('click', () => {
        subsessionCard.remove();
        // Need to also remove associated data if it was saved
        updateTotalSessionTime();
    });
}

function updateTotalSessionTime() {
    // TODO: Calculate total time from currentSubsessions array
     console.log("TODO: Update total session time display");
    // const totalMinutes = currentSubsessions.reduce((sum, sub) => sum + sub.minutes, 0);
    // totalSessionTimeSpan.textContent = totalMinutes;
}

// --- Data Saving Functions ---

// --- TODO: Data Functions ---
// --- TODO: UI Update Functions ---

// Simple HTML escaping function
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// --- Data Management for Subsessions ---
function addOrUpdateLocalSubsession(subsessionData) {
    const index = currentSubsessions.findIndex(sub => sub.id === subsessionData.id);

    if (index !== -1) {
        currentSubsessions[index] = subsessionData;
    } else {
        currentSubsessions.push(subsessionData);
    }
} 