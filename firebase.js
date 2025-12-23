import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js'
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js'
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js'

const firebaseConfig = {
	apiKey: 'AIzaSyBfGi30lJ6t3A7wLCzEF6Z9WSeByRUq1mA',
	authDomain: 'vibewatch-b689b.firebaseapp.com',
	databaseURL: 'https://vibewatch-b689b-default-rtdb.firebaseio.com',
	projectId: 'vibewatch-b689b',
	storageBucket: 'vibewatch-b689b.firebasestorage.app',
	messagingSenderId: '556713978390',
	appId: '1:556713978390:web:33097480afed51fa732337',
	measurementId: 'G-7HPBPXSKN1',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
