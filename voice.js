import {
	collection,
	addDoc,
	onSnapshot,
	query,
	where,
	deleteDoc,
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js'
import { db } from './firebase.js'

const config = { iceServers: [{ urls: 'stun:stun1.l.google.com:19302' }] }

// Make sure 'export' is written here!
export class VoiceManager {
	constructor(roomId, userId) {
		this.roomId = roomId
		this.userId = userId
		this.localStream = null
		this.peers = {}
		this.signalsRef = collection(db, 'rooms', roomId, 'signals')
	}

	async init() {
		// 1. Get Mic
		try {
			this.localStream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			})
		} catch (err) {
			console.error('Error accessing microphone:', err)
			alert("Microphone access denied. Voice chat won't work.")
			return
		}

		// 2. Listen for signals
		const q = query(this.signalsRef, where('to', '==', this.userId))
		onSnapshot(q, snapshot => {
			snapshot.docChanges().forEach(async change => {
				if (change.type === 'added') {
					const data = change.doc.data()
					await this.handleSignal(data)
					deleteDoc(change.doc.ref) // Cleanup
				}
			})
		})

		// 3. Announce arrival
		this.sendSignal('ALL', { type: 'join' })

		this.setupVisuals()
	}

	async handleSignal(data) {
		const from = data.from
		const payload = data.payload

		if (!this.peers[from]) {
			this.peers[from] = this.createPeer(from)
		}
		const pc = this.peers[from]

		if (payload.type === 'join') {
			const offer = await pc.createOffer()
			await pc.setLocalDescription(offer)
			this.sendSignal(from, { type: 'offer', sdp: offer })
		} else if (payload.type === 'offer') {
			await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
			const answer = await pc.createAnswer()
			await pc.setLocalDescription(answer)
			this.sendSignal(from, { type: 'answer', sdp: answer })
		} else if (payload.type === 'answer') {
			await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
		} else if (payload.type === 'candidate') {
			if (payload.candidate)
				await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
		}
	}

	createPeer(targetId) {
		const pc = new RTCPeerConnection(config)
		this.localStream
			.getTracks()
			.forEach(track => pc.addTrack(track, this.localStream))

		pc.onicecandidate = e => {
			if (e.candidate)
				this.sendSignal(targetId, { type: 'candidate', candidate: e.candidate })
		}

		pc.ontrack = e => {
			const audio = new Audio()
			audio.srcObject = e.streams[0]
			audio.autoplay = true
		}

		return pc
	}

	async sendSignal(to, payload) {
		await addDoc(this.signalsRef, {
			to: to,
			from: this.userId,
			payload: payload,
		})
	}

	toggleMute() {
		if (!this.localStream) return false
		const track = this.localStream.getAudioTracks()[0]
		track.enabled = !track.enabled
		return !track.enabled // Return true if muted
	}

	setupVisuals() {
		// Optional visualizer hook
	}
}
