import { auth } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const toggleBtn = document.getElementById('toggle-auth');
const formTitle = document.getElementById('form-title');

let isLogin = true;

// Check if already logged in
onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = 'index.html';
});

toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isLogin = !isLogin;
    formTitle.innerText = isLogin ? 'Welcome Back' : 'Create Account';
    authForm.querySelector('button').innerText = isLogin ? 'Sign In' : 'Register';
    toggleBtn.previousElementSibling.innerText = isLogin ? 'New here?' : 'Already have an account?';
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        if (isLogin) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        alert(error.message);
    }
});
