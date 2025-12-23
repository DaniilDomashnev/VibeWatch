import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { 
    doc, getDoc, updateDoc, onSnapshot, collection, addDoc, 
    query, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// DOM Elements
const video = document.getElementById('main-video');
const hostControls = document.getElementById('host-controls');
const videoInput = document.getElementById('video-url-input');
const loadVideoBtn = document.getElementById('load-video-btn');
const chatBox = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const roomIdDisplay = document.getElementById('room-id-display');

// State
let roomId = new URLSearchParams(window.location.search).get('id');
let isHost = false;
let unsubscribeRoom = null;
let unsubscribeChat = null;
let currentUser = null;
let ignoreNextUpdate = false; // Prevents loops

if (!roomId) window.location.href = 'index.html';
roomIdDisplay.innerText = roomId;

// 1. Auth Check
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    currentUser = user;
    await initRoom();
});

// 2. Initialize Room
async function initRoom() {
    const roomRef = doc(db, "rooms", roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
        alert("Room not found!");
        window.location.href = 'index.html';
        return;
    }

    const roomData = roomSnap.data();
    isHost = roomData.hostId === currentUser.uid;

    // Initial Video Load
    if (roomData.videoUrl) {
        video.src = roomData.videoUrl;
    }

    // Setup UI for Host/Viewer
    if (isHost) {
        hostControls.classList.remove('hidden');
        setupHostListeners(roomRef);
    } else {
        // Hide native controls for viewers to force sync (optional, keeping visible for UX)
        // video.controls = false; 
    }

    // Listen for Room Updates (Sync Logic)
    unsubscribeRoom = onSnapshot(roomRef, (doc) => {
        if (!doc.exists()) return;
        const data = doc.data();

        // Sync Video Source
        if (video.src !== data.videoUrl) {
            video.src = data.videoUrl;
        }

        // SYNC PLAYBACK (Viewer Only Logic - Host is source of truth)
        if (!isHost) {
            syncPlayback(data);
        }
    });

    // Listen for Chat
    setupChat();
}

// 3. Synchronization Logic (The Core)
const SYNC_THRESHOLD = 1.5; // seconds

function syncPlayback(data) {
    // Sync Play/Pause
    if (data.isPlaying && video.paused) {
        video.play().catch(e => console.log("Autoplay blocked", e));
    } else if (!data.isPlaying && !video.paused) {
        video.pause();
    }

    // Sync Time (Drift Correction)
    const timeDiff = Math.abs(video.currentTime - data.currentTime);
    if (timeDiff > SYNC_THRESHOLD) {
        video.currentTime = data.currentTime;
    }
}

// 4. Host Listeners (Host writes to DB)
function setupHostListeners(roomRef) {
    // Update URL
    loadVideoBtn.addEventListener('click', async () => {
        const url = videoInput.value.trim();
        if (url) {
            await updateDoc(roomRef, { videoUrl: url, currentTime: 0, isPlaying: false });
        }
    });

    // Video Events
    video.addEventListener('play', () => {
        updateDoc(roomRef, { isPlaying: true, currentTime: video.currentTime });
    });

    video.addEventListener('pause', () => {
        updateDoc(roomRef, { isPlaying: false, currentTime: video.currentTime });
    });

    video.addEventListener('seeked', () => {
        updateDoc(roomRef, { currentTime: video.currentTime });
    });
    
    // Periodic sync to keep late-joiners updated
    setInterval(() => {
        if (!video.paused) {
            updateDoc(roomRef, { currentTime: video.currentTime });
        }
    }, 2000);
}

// 5. Chat System
function setupChat() {
    const messagesRef = collection(db, "rooms", roomId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    unsubscribeChat = onSnapshot(q, (snapshot) => {
        chatBox.innerHTML = '';
        snapshot.forEach((doc) => {
            const msg = doc.data();
            const div = document.createElement('div');
            div.className = 'message';
            div.innerHTML = `<span class="sender">${msg.sender}</span>${msg.text}`;
            chatBox.appendChild(div);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    });

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;

        await addDoc(messagesRef, {
            text: text,
            sender: currentUser.email.split('@')[0], // Use email prefix as name
            createdAt: serverTimestamp()
        });
        chatInput.value = '';
    });
}

// Leave Room
document.getElementById('leave-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
});
