// auth.js
import { auth } from './firebase.js'
import {
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js'

const form = document.getElementById('auth-form')
const toggle = document.getElementById('toggle')
let isLogin = true

onAuthStateChanged(auth, u => {
	if (u) window.location.href = 'index.html'
})

toggle.onclick = () => {
	isLogin = !isLogin
	toggle.innerText = isLogin
		? 'Need an account? Register'
		: 'Have an account? Login'
	form.querySelector('button').innerText = isLogin ? 'Log In' : 'Register'
}

form.onsubmit = async e => {
	e.preventDefault()
	const email = document.getElementById('email').value
	const pass = document.getElementById('pass').value
	try {
		if (isLogin) await signInWithEmailAndPassword(auth, email, pass)
		else await createUserWithEmailAndPassword(auth, email, pass)
	} catch (err) {
		alert(err.message)
	}
}
