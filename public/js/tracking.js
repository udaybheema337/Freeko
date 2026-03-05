import { db, auth } from "./config.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function checkStatus() {
    if(!auth.currentUser) return;
    const q = query(collection(db, "orders"), where("userId", "==", auth.currentUser.uid));
    const snapshot = await getDocs(q);
    const container = document.getElementById("status");
    container.innerHTML = "";
    
    snapshot.forEach(doc => {
        const data = doc.data();
        container.innerHTML += `<div class="card"><h3>${data.status}</h3><p>Total: ₹${data.total}</p></div>`;
    });
}
// checkStatus() will be called when auth is ready (add simple timeout or auth listener if needed, but for simplicity:)
setTimeout(checkStatus, 2000);