import {
	updateDoc,
	serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js'

let player
let isHost = false
let roomRef
let ignoreUpdates = false // Prevent loops

// Initialize YouTube API
window.onYouTubeIframeAPIReady = () => {
	// Player will be created by initPlayer when room is ready
}

export const VideoController = {
	init(domId, _roomRef, _isHost, initialVideoId) {
		roomRef = _roomRef
		isHost = _isHost

		return new Promise(resolve => {
			player = new YT.Player(domId, {
				height: '100%',
				width: '100%',
				videoId: initialVideoId,
				playerVars: { autoplay: 1, controls: isHost ? 1 : 0, rel: 0 },
				events: {
					onReady: () => resolve(),
					onStateChange: onPlayerStateChange,
				},
			})
		})
	},

	loadVideo(videoId) {
		if (player && player.loadVideoById) player.loadVideoById(videoId)
	},

	// Called when Firestore updates
	sync(data) {
		if (ignoreUpdates) return // Don't react to own updates

		// 1. Video ID Sync
		const currentUrl = player.getVideoUrl()
		if (currentUrl && !currentUrl.includes(data.videoId)) {
			player.loadVideoById(data.videoId)
		}

		// 2. Playback State Sync
		const playerState = player.getPlayerState()
		if (data.playerState === 1 && playerState !== 1) {
			player.playVideo()
		} else if (data.playerState === 2 && playerState !== 2) {
			player.pauseVideo()
		}

		// 3. Time Sync (Drift Correction > 1s)
		const diff = Math.abs(player.getCurrentTime() - data.currentTime)
		if (diff > 1.5) {
			player.seekTo(data.currentTime, true)
		}
	},
}

function onPlayerStateChange(event) {
	if (!isHost) return // Only host writes to DB

	const state = event.data
	const time = player.getCurrentTime()

	// Ignore buffering/unstarted for DB writes to prevent jitter
	if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.PAUSED) {
		ignoreUpdates = true // Briefly ignore incoming updates to prevent echo
		updateDoc(roomRef, {
			playerState: state,
			currentTime: time,
			lastUpdated: serverTimestamp(),
		}).then(() => setTimeout(() => (ignoreUpdates = false), 500))
	}
}

// Host Periodic Sync (ensures late joiners get correct time)
setInterval(() => {
	if (isHost && player && player.getPlayerState() === 1) {
		updateDoc(roomRef, { currentTime: player.getCurrentTime() })
	}
}, 3000)
