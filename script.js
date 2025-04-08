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
    // Explicitly check if Supabase library is loaded *before* anything else
    console.log('DOMContentLoaded fired. Checking window.supabase...');
    if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
        console.error('CRITICAL: Supabase library (supabase-js) not found on window object immediately after DOMContentLoaded.');
        app.innerHTML = `<h2>Error Initializing Application</h2><p>The Supabase JavaScript library failed to load. Please check your network connection, browser console, and the Supabase CDN link in index.html.</p>`;
        return; // Stop execution if library isn't loaded
    } else {
        console.log('Supabase library found on window object.');
    }

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

    // Call the async initialization function after a tiny delay
    setTimeout(initializeApp, 0);

});

// --- Initialization Function ---
async function initializeApp() {
    console.log('Attempting Supabase initialization inside initializeApp...');
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

        // Assign the initialized client instance to our local variable using the verified global object
        supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

        console.log('Supabase client initialized.');

        // Setup Event Listeners
        setupEventListeners();

        // Setup Auth State Listener
        if (supabase && supabase.auth) {
            supabase.auth.onAuthStateChange(handleAuthStateChange);
        } else {
             throw new Error('Supabase client not available for auth listener setup.');
        }

        // Check initial session
        if (supabase && supabase.auth) {
            const { data: { session } } = await supabase.auth.getSession();
            handleAuthStateChange('INITIAL_SESSION', session);
        } else {
            throw new Error('Supabase client not available for initial session check.');
        }

        // Add new columns to users table
        await addDailyPracticeColumns();

    } catch (error) {
        console.error('Error initializing Supabase:', error);
        app.innerHTML = `<h2>Error Initializing Application</h2><p>Could not initialize the Supabase client. Please check the browser console for details. Make sure the Supabase library loaded correctly and the API configuration is available. Error: ${escapeHtml(error.message)}</p>`;
    }
}

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
            alert('Sign up successful!');
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

const updatePracticeChart = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get user's daily practice times
        const { data: userData, error } = await supabase
            .from('auth.users')
            .select('minutes_practiced_today, minutes_practiced_yesterday, minutes_practiced_2_days_ago, minutes_practiced_3_days_ago, minutes_practiced_4_days_ago, minutes_practiced_5_days_ago, minutes_practiced_6_days_ago')
            .eq('id', user.id)
            .single();

        if (error) throw error;

        // Prepare data for the chart
        const labels = ['6 days ago', '5 days ago', '4 days ago', '3 days ago', '2 days ago', 'Yesterday', 'Today'];
        const data = [
            userData.minutes_practiced_6_days_ago,
            userData.minutes_practiced_5_days_ago,
            userData.minutes_practiced_4_days_ago,
            userData.minutes_practiced_3_days_ago,
            userData.minutes_practiced_2_days_ago,
            userData.minutes_practiced_yesterday,
            userData.minutes_practiced_today
        ];

        // Calculate average
        const totalMinutes = data.reduce((sum, minutes) => sum + minutes, 0);
        const averageMinutes = Math.round(totalMinutes / 7);
        document.getElementById('avgPracticeTime').textContent = averageMinutes;

        // Update or create chart
        const ctx = document.getElementById('practiceChart').getContext('2d');
        if (practiceChartInstance) {
            practiceChartInstance.destroy();
        }

        practiceChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Minutes Practiced',
                    data: data,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Minutes'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error updating practice chart:', error);
    }
};

// Placeholder functions for Practice Session View
function startNewPracticeSession() {
    console.log("Starting new practice session setup...");
     clearPracticeSessionView();
     populateSessionInstrumentDropdown(currentUser.user_metadata?.instruments || []);
     // Reset state for the new session
    currentPracticeSession = null;
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
    sessionInstrumentSelect.innerHTML = '<option value="">Select Instrument</option>';
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
    const timeDisplay = subsessionCard.querySelector(`#${cardId}-time-display`);
    const startBtn = subsessionCard.querySelector('.stopwatch-start-btn');
    const stopBtn = subsessionCard.querySelector('.stopwatch-stop-btn');
    const resetBtn = subsessionCard.querySelector('.stopwatch-reset-btn');
    const submitBtns = subsessionCard.querySelectorAll('.subsession-submit-btn');
    const removeBtn = subsessionCard.querySelector('.remove-subsession-btn');
    const statusSpans = subsessionCard.querySelectorAll('.subsession-status');
    const manualMinutesInput = subsessionCard.querySelector('.subsession-manual-minutes');
    const notesFields = subsessionCard.querySelectorAll('.subsession-notes');
    const stopwatchPane = subsessionCard.querySelector(`#${cardId}-stopwatch-pane`);
    const manualPane = subsessionCard.querySelector(`#${cardId}-manual-pane`);

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            subsessionCard.querySelectorAll('.subsession-pane').forEach(pane => pane.classList.add('hidden'));
            subsessionCard.querySelector(`#${button.dataset.target}`).classList.remove('hidden');
        });
    });

    // Stopwatch controls
    startBtn.addEventListener('click', () => {
        if (!stopwatchRunning) {
            stopwatchRunning = true;
            stopwatchStartTime = Date.now() - (stopwatchElapsedTime * 1000);
            stopwatchInterval = setInterval(() => {
                stopwatchElapsedTime = Math.floor((Date.now() - stopwatchStartTime) / 1000);
                timeDisplay.textContent = formatTime(stopwatchElapsedTime);
            }, 1000);
            startBtn.disabled = true;
            stopBtn.disabled = false;
        }
    });

    stopBtn.addEventListener('click', () => {
        if (stopwatchRunning) {
            stopwatchRunning = false;
            clearInterval(stopwatchInterval);
            stopwatchElapsedTime = Math.floor((Date.now() - stopwatchStartTime) / 1000); // Final capture
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
    });

    resetBtn.addEventListener('click', () => {
        stopwatchRunning = false;
        clearInterval(stopwatchInterval);
        stopwatchElapsedTime = 0;
        stopwatchStartTime = 0;
        timeDisplay.textContent = formatTime(0);
        startBtn.disabled = false;
        stopBtn.disabled = true;
    });

    // Submit buttons
    submitBtns.forEach(button => {
        button.addEventListener('click', () => {
            const isActiveStopwatch = subsessionCard.querySelector('.tab-button.active').dataset.target === `${cardId}-stopwatch-pane`;
            const category = categorySelect.value;
            let minutes = 0;
            let notes = '';

            if (isActiveStopwatch) {
                if (stopwatchRunning) stopBtn.click(); // Stop timer if running
                minutes = Math.round(stopwatchElapsedTime / 60);
                notes = stopwatchPane.querySelector('.subsession-notes').value;
            } else {
                minutes = parseInt(manualMinutesInput.value, 10) || 0;
                notes = manualPane.querySelector('.subsession-notes').value;
            }

            if (!category) {
                alert('Please select a category.');
                return;
            }
            if (minutes <= 0) {
                 alert('Practice time must be greater than 0 minutes.');
                return;
            }

            const subsessionData = {
                id: cardId,
                category: category,
                minutes: minutes,
                notes: notes,
                submitted: false
            };

            categorySelect.disabled = true;
            tabButtons.forEach(btn => btn.disabled = true);
            startBtn.disabled = true;
            stopBtn.disabled = true;
            resetBtn.disabled = true;
            manualMinutesInput.disabled = true;
            notesFields.forEach(field => field.disabled = true);
            submitBtns.forEach(btn => btn.disabled = true);
            statusSpans.forEach(span => span.textContent = ' Submitted');
            removeBtn.disabled = true;

             addOrUpdateLocalSubsession(subsessionData);
        });
    });

    // Remove button
    removeBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to remove this subsession?')) {
            const index = currentSubsessions.findIndex(sub => sub.id === cardId);
            if (index > -1) {
                currentSubsessions.splice(index, 1);
            }
            subsessionCard.remove();
            updateTotalSessionTime();
        }
    });
}

function updateTotalSessionTime() {
    const totalMinutes = currentSubsessions.reduce((sum, sub) => sum + sub.minutes, 0);
    totalSessionTimeSpan.textContent = totalMinutes;
}

// --- Stopwatch Helper ---
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// --- Data Management for Subsessions ---
function addOrUpdateLocalSubsession(subsessionData) {
    const index = currentSubsessions.findIndex(sub => sub.id === subsessionData.id);
    if (index > -1) {
        currentSubsessions[index] = subsessionData;
    } else {
        currentSubsessions.push(subsessionData);
    }
    console.log('Current subsessions:', currentSubsessions);
    updateTotalSessionTime();
}

// --- Data Saving Functions ---
const savePracticeSession = async (sessionData) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Calculate total minutes for the session
        const totalMinutes = sessionData.subsessions.reduce((total, subsession) => {
            return total + (subsession.duration || 0);
        }, 0);

        // Update today's practice time
        const { error: updateError } = await supabase
            .from('auth.users')
            .update({ 
                minutes_practiced_today: supabase.rpc('increment', { 
                    column: 'minutes_practiced_today', 
                    amount: totalMinutes 
                })
            })
            .eq('id', user.id);

        if (updateError) throw updateError;

        // Save the practice session
        const { data, error } = await supabase
            .from('practice_sessions')
            .insert([{
                user_id: user.id,
                instrument: sessionData.instrument,
                total_minutes: totalMinutes,
                subsessions: sessionData.subsessions
            }]);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error saving practice session:', error);
        throw error;
    }
};

// --- Practice Session UI Functions ---
function startNewPracticeSession() {
    console.log("Starting new practice session setup...");
     clearPracticeSessionView();
     populateSessionInstrumentDropdown(currentUser.user_metadata?.instruments || []);
     // Reset state for the new session
    currentPracticeSession = null;
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
    sessionInstrumentSelect.innerHTML = '<option value="">Select Instrument</option>';
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
    const timeDisplay = subsessionCard.querySelector(`#${cardId}-time-display`);
    const startBtn = subsessionCard.querySelector('.stopwatch-start-btn');
    const stopBtn = subsessionCard.querySelector('.stopwatch-stop-btn');
    const resetBtn = subsessionCard.querySelector('.stopwatch-reset-btn');
    const submitBtns = subsessionCard.querySelectorAll('.subsession-submit-btn');
    const removeBtn = subsessionCard.querySelector('.remove-subsession-btn');
    const statusSpans = subsessionCard.querySelectorAll('.subsession-status');
    const manualMinutesInput = subsessionCard.querySelector('.subsession-manual-minutes');
    const notesFields = subsessionCard.querySelectorAll('.subsession-notes');
    const stopwatchPane = subsessionCard.querySelector(`#${cardId}-stopwatch-pane`);
    const manualPane = subsessionCard.querySelector(`#${cardId}-manual-pane`);

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            subsessionCard.querySelectorAll('.subsession-pane').forEach(pane => pane.classList.add('hidden'));
            subsessionCard.querySelector(`#${button.dataset.target}`).classList.remove('hidden');
        });
    });

    // Stopwatch controls
    startBtn.addEventListener('click', () => {
        if (!stopwatchRunning) {
            stopwatchRunning = true;
            stopwatchStartTime = Date.now() - (stopwatchElapsedTime * 1000);
            stopwatchInterval = setInterval(() => {
                stopwatchElapsedTime = Math.floor((Date.now() - stopwatchStartTime) / 1000);
                timeDisplay.textContent = formatTime(stopwatchElapsedTime);
            }, 1000);
            startBtn.disabled = true;
            stopBtn.disabled = false;
        }
    });

    stopBtn.addEventListener('click', () => {
        if (stopwatchRunning) {
            stopwatchRunning = false;
            clearInterval(stopwatchInterval);
            stopwatchElapsedTime = Math.floor((Date.now() - stopwatchStartTime) / 1000); // Final capture
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
    });

    resetBtn.addEventListener('click', () => {
        stopwatchRunning = false;
        clearInterval(stopwatchInterval);
        stopwatchElapsedTime = 0;
        stopwatchStartTime = 0;
        timeDisplay.textContent = formatTime(0);
        startBtn.disabled = false;
        stopBtn.disabled = true;
    });

    // Submit buttons
    submitBtns.forEach(button => {
        button.addEventListener('click', () => {
            const isActiveStopwatch = subsessionCard.querySelector('.tab-button.active').dataset.target === `${cardId}-stopwatch-pane`;
            const category = categorySelect.value;
            let minutes = 0;
            let notes = '';

            if (isActiveStopwatch) {
                if (stopwatchRunning) stopBtn.click(); // Stop timer if running
                minutes = Math.round(stopwatchElapsedTime / 60);
                notes = stopwatchPane.querySelector('.subsession-notes').value;
            } else {
                minutes = parseInt(manualMinutesInput.value, 10) || 0;
                notes = manualPane.querySelector('.subsession-notes').value;
            }

            if (!category) {
                alert('Please select a category.');
                return;
            }
            if (minutes <= 0) {
                 alert('Practice time must be greater than 0 minutes.');
                return;
            }

            const subsessionData = {
                id: cardId,
                category: category,
                minutes: minutes,
                notes: notes,
                submitted: false
            };

            categorySelect.disabled = true;
            tabButtons.forEach(btn => btn.disabled = true);
            startBtn.disabled = true;
            stopBtn.disabled = true;
            resetBtn.disabled = true;
            manualMinutesInput.disabled = true;
            notesFields.forEach(field => field.disabled = true);
            submitBtns.forEach(btn => btn.disabled = true);
            statusSpans.forEach(span => span.textContent = ' Submitted');
            removeBtn.disabled = true;

             addOrUpdateLocalSubsession(subsessionData);
        });
    });

    // Remove button
    removeBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to remove this subsession?')) {
            const index = currentSubsessions.findIndex(sub => sub.id === cardId);
            if (index > -1) {
                currentSubsessions.splice(index, 1);
            }
            subsessionCard.remove();
            updateTotalSessionTime();
        }
    });
}

function updateTotalSessionTime() {
    const totalMinutes = currentSubsessions.reduce((sum, sub) => sum + sub.minutes, 0);
    totalSessionTimeSpan.textContent = totalMinutes;
}

// --- Stopwatch Helper ---
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// --- Data Management for Subsessions ---
function addOrUpdateLocalSubsession(subsessionData) {
    const index = currentSubsessions.findIndex(sub => sub.id === subsessionData.id);
    if (index > -1) {
        currentSubsessions[index] = subsessionData;
    } else {
        currentSubsessions.push(subsessionData);
    }
    console.log('Current subsessions:', currentSubsessions);
    updateTotalSessionTime();
}

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

// Add new columns to users table
const addDailyPracticeColumns = async () => {
    try {
        const { data, error } = await supabase.rpc('add_daily_practice_columns');
        if (error) throw error;
        console.log('Daily practice columns added successfully');
    } catch (error) {
        console.error('Error adding daily practice columns:', error.message);
    }
}; 