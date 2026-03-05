import { auth, db } from "./config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- LOGIN LOGIC ---
window.handleLogin = async () => {
    const email = document.getElementById("loginEmail").value;
    const pass = document.getElementById("loginPass").value;
    const errorMsg = document.getElementById("error-msg");

    if (!email || !pass) {
        errorMsg.innerText = "Please enter email and password.";
        return;
    }

    try {
        errorMsg.innerText = "Logging in...";
        errorMsg.style.color = "blue";

        await signInWithEmailAndPassword(auth, email, pass);
        window.location.href = "index.html"; // Redirect to home on success
    } catch (error) {
        console.error("Login Error:", error);
        errorMsg.style.color = "red";
        errorMsg.innerText = "Invalid Email or Password.";
    }
};

// --- REGISTER LOGIC ---
window.handleRegister = async () => {
    const name = document.getElementById("regName").value;
    const email = document.getElementById("regEmail").value;
    const pass = document.getElementById("regPass").value;
    const phone = document.getElementById("regPhone").value;
    
    // Address Fields
    const building = document.getElementById("regBuilding").value;
    const block = document.getElementById("regBlock").value;
    const floor = document.getElementById("regFloor").value;
    const door = document.getElementById("regDoor").value;
    const area = document.getElementById("regArea").value;
    
    const errorMsg = document.getElementById("error-msg");

    if (!name || !email || !pass || !phone || !door || !area) {
        errorMsg.style.color = "red";
        errorMsg.innerText = "Please fill all required fields!";
        return;
    }

    try {
        errorMsg.innerText = "Creating account...";
        errorMsg.style.color = "blue";

        // 1. Create User
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // 2. Format Address
        const fullAddress = `${door}, ${floor ? floor + ' Floor, ' : ''}${block ? block + ', ' : ''}${building}, ${area}`;

        // 3. Save to Database
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: name,
            email: email,
            phone: phone,
            address: fullAddress,
            createdAt: new Date()
        });

        // 4. Update Profile
        await updateProfile(user, { displayName: name });

        alert("Registration Successful!");
        window.location.href = "index.html"; 

    } catch (error) {
        console.error("Register Error:", error);
        errorMsg.style.color = "red";
        errorMsg.innerText = error.message;
    }
};