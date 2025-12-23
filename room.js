import { auth, db } from './firebase.js'
import {
	doc,
	getDoc,
	onSnapshot,
	collection,
	addDoc,
	updateDoc,
	serverTimestamp,
	query,
	orderBy,
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js'
import { VideoController } from './video.js'
import { VoiceManager } from './voice.js'

const roomId = new URLSearchParams(window.location.search).get('id')
if (!roomId) window.location.href = 'index.html'

document.getElementById('room-id-display').innerText = roomId

let currentUser
let isHost = false
let voiceManager

auth.onAuthStateChanged(async user => {
	if (!user) window.location.href = 'auth.html'
	currentUser = user

	// 1. Check Room & Host
	const roomRef = doc(db, 'rooms', roomId)
	const roomSnap = await getDoc(roomRef)

	if (!roomSnap.exists()) {
		alert('Room not found')
		window.location.href = 'index.html'
		return
	}

	isHost = roomSnap.data().hostId === currentUser.uid
	if (isHost) document.getElementById('host-controls').style.display = 'flex'

	// 2. Initialize Video
	await VideoController.init('player', roomRef, isHost, roomSnap.data().videoId)

	// 3. Listen for Room Updates (Video Sync)
	onSnapshot(roomRef, doc => {
		if (doc.exists()) VideoController.sync(doc.data())
	})

	// 4. Initialize Voice
	voiceManager = new VoiceManager(roomId, currentUser.uid)
	voiceManager.init()

	// 5. Initialize Chat
	initChat()
})

// UI Handlers
document.getElementById('load-video').onclick = () => {
	const url = document.getElementById('video-url').value
	const videoId = url.split('v=')[1]?.split('&')[0]
	if (videoId && isHost) {
		updateDoc(doc(db, 'rooms', roomId), {
			videoId: videoId,
			playerState: 1,
			currentTime: 0,
		})
	}
}

document.getElementById('mute-btn').onclick = function () {
	const isEnabled = voiceManager.toggleMute()
	this.innerText = isEnabled ? '🎤' : '🔇'
	this.classList.toggle('active', isEnabled)
	// Visual cue
	document.getElementById('my-avatar').style.boxShadow = isEnabled
		? '0 0 0 2px #43b581'
		: 'none'
}

document.getElementById('copy-code').onclick = () => {
	navigator.clipboard.writeText(roomId)
	alert('Room code copied!')
}

document.getElementById('leave-btn').onclick = () => {
	// Ideally cleanup voice signals here
	window.location.href = 'index.html'
}

function initChat() {
	const chatRef = collection(db, 'rooms', roomId, 'messages')
	const q = query(chatRef, orderBy('createdAt'))

	onSnapshot(q, snap => {
		const container = document.getElementById('messages')
		container.innerHTML = ''
		snap.forEach(d => {
			const data = d.data()
			const div = document.createElement('div')
			div.className = 'msg'
			div.innerHTML = `<div class="meta">${data.user}</div><div class="text">${data.text}</div>`
			container.appendChild(div)
		})
		container.scrollTop = container.scrollHeight
	})

	document.getElementById('chat-form').onsubmit = e => {
		e.preventDefault()
		const input = document.getElementById('chat-input')
		if (!input.value.trim()) return

		addDoc(chatRef, {
			text: input.value,
			user: currentUser.email.split('@')[0],
			createdAt: serverTimestamp(),
		})
		input.value = ''
	}
}
