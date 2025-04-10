// index.js - Updated for Case-Insensitive Key

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js"
import { getDatabase, ref, push, onValue, remove, off } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js" // Added 'off'

// --- Firebase Configuration ---
const appSettings = {
    databaseURL: "https://playground-53ce5-default-rtdb.firebaseio.com/" // !!! REPLACE WITH YOUR ACTUAL URL !!!
}
const app = initializeApp(appSettings);
const database = getDatabase(app);
const baseListsRef = ref(database, "userLists"); // Base reference for all lists

// --- Global State Variables ---
let currentListKey = null;
let currentListRef = null;
let unsubscribeFromList = null; // To store the 'off' function

// --- DOM Elements ---
// Access Screen
const accessScreenEl = document.getElementById("access-screen");
const listKeyInputEl = document.getElementById("list-key-input");
const accessListButtonEl = document.getElementById("access-list-button");
const accessErrorEl = document.getElementById("access-error");
// Added wrapper for form content access
const accessFormContentEl = accessScreenEl.querySelector('.form-content');


// List Screen
const listContainerEl = document.getElementById("list-container");
const listTitleEl = document.getElementById("list-title");
const inputFieldEl = document.getElementById("input-field");
const addButtonEl = document.getElementById("add-button");
const toDoListEl = document.getElementById("shopping-list");
const changeListButtonEl = document.getElementById("change-list-button");
// Added wrapper for list content access
const listContentAreaEl = listContainerEl.querySelector('.list-content-area');


// --- Event Listeners ---

// Access List Button
accessListButtonEl.addEventListener("click", function() {
    // Trim the input value AND convert to lowercase
    const enteredKey = listKeyInputEl.value.trim().toUpperCase(); // <<< MODIFIED HERE
    accessErrorEl.textContent = ""; // Clear previous errors

    if (!enteredKey) {
        accessErrorEl.textContent = "Please enter a List Key.";
        return;
    }

    // Clean the key for Firebase path (basic cleaning, avoid '.', '#', '$', '[', ']')
    // Cleaning happens *after* converting to lowercase
    const cleanedKey = enteredKey.replace(/[.#$[\]]/g, '_');
    if(cleanedKey !== enteredKey) {
         // Check if *original* input (before cleaning) had issues
         const originalInputForCheck = listKeyInputEl.value.trim().toLowerCase();
         if(cleanedKey !== originalInputForCheck){
             accessErrorEl.textContent = "Key contains invalid characters (.#$[]).";
             // Optionally, allow access with cleanedKey or force re-entry
             // return; // Uncomment this to block access if cleaning was needed
         }
    }

    currentListKey = cleanedKey; // Store the cleaned, lowercase key

    // --- Initialize List View ---
    initializeListView(currentListKey); // Pass the cleaned, lowercase key
});

// Add Item Button
addButtonEl.addEventListener("click", function() {
    let inputValue = inputFieldEl.value.trim();

    if (inputValue && currentListRef) { // Check if list ref is valid
        push(currentListRef, inputValue); // Push to the CURRENT list reference
        clearInputFieldEl();
    }
});

// Add item on Enter key press
inputFieldEl.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        addButtonEl.click();
    }
});

// Change List Button
changeListButtonEl.addEventListener("click", function() {
    // Detach the listener for the current list
    if (unsubscribeFromList) {
        unsubscribeFromList(); // This calls the 'off()' function
        unsubscribeFromList = null; // Reset the variable
    }

    // Reset state
    currentListKey = null;
    currentListRef = null;
    listKeyInputEl.value = ""; // Clear the input
    accessErrorEl.textContent = "";

    // Show access screen, hide list container
    accessScreenEl.style.display = "flex"; // Use flex as per recent CSS
    listContainerEl.classList.remove("visible");
    // Body alignment managed by CSS for full screen
});


// --- Functions ---

function initializeListView(listKey) { // listKey is already lowercase and cleaned
    // Update the list reference dynamically
    currentListRef = ref(database, `userLists/${listKey}`);

    // Update UI
    // Display the key as entered by user initially, or the lowercase version?
    // Let's display the consistent (lowercase) key for clarity.
    listTitleEl.textContent = `List: ${listKey}`;
    accessScreenEl.style.display = "none"; // Hide access screen
    listContainerEl.classList.add("visible"); // Show list container
    // Body alignment handled by CSS

    // Clear previous list display
    clearToDoListEl();

    // Detach any previous listener before attaching a new one
    if (unsubscribeFromList) {
        unsubscribeFromList();
    }

    // Attach the listener for the specific list and store the 'off' function
    unsubscribeFromList = onValue(currentListRef, function(snapshot) {
        clearToDoListEl(); // Clear list before repopulating
        if (snapshot.exists()) {
            let itemsArray = Object.entries(snapshot.val());
            for (let i = 0; i < itemsArray.length; i++) {
                appendItemToToDoListEl(itemsArray[i]); // Pass [id, value]
            }
        } else {
            // Ensure empty message uses correct class if list has background/borders
             const emptyLi = document.createElement("li");
             emptyLi.classList.add("empty-message");
             emptyLi.textContent = "No items here... yet";
             toDoListEl.appendChild(emptyLi);
        }
    }, (error) => {
        // Optional: Handle potential database read errors
        console.error("Firebase read error:", error);
        accessErrorEl.textContent = "Error accessing list data.";
        // Optionally, revert to access screen here
    });
}

// Modified to use the currentListKey (which is already lowercase)
function appendItemToToDoListEl(item) {
    let itemID = item[0];
    let itemValue = item[1];

    let newEl = document.createElement("li");
    let textSpan = document.createElement("span");
    textSpan.textContent = itemValue;
    textSpan.classList.add("item-text");

    let removeButton = document.createElement("button");
    removeButton.textContent = "X"; // Or use an icon/SVG
    removeButton.classList.add("remove-button");
    removeButton.setAttribute("aria-label", `Remove ${itemValue}`); // Accessibility


    removeButton.addEventListener("click", function() {
        // Make sure we have the key and ID
        if (currentListKey && itemID) {
            // Construct the exact path using the CURRENT list key (lowercase)
            let exactLocationOfItemInDB = ref(database, `userLists/${currentListKey}/${itemID}`);
            remove(exactLocationOfItemInDB);
        } else {
            console.error("Cannot remove item: Missing list key or item ID.");
        }
    });

    newEl.append(textSpan);
    newEl.append(removeButton);
    toDoListEl.append(newEl);
}

function clearToDoListEl() {
    toDoListEl.innerHTML = "";
}

function clearInputFieldEl() {
    inputFieldEl.value = "";
}

// --- Initial Setup ---
// Ensure the list container is hidden on initial load
listContainerEl.classList.remove("visible");
accessScreenEl.style.display = "flex"; // Use flex as per recent CSS
// Body alignment handled by CSS