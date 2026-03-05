import { db } from "./config.js";
import { collection, query, where, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Check if already logged in
const savedAgent = JSON.parse(localStorage.getItem("delivery_agent"));

if (savedAgent) {
    showDashboard(savedAgent);
}

// ==========================================
// 1. LOGIN LOGIC
// ==========================================
window.login = async () => {
    const phone = document.getElementById("loginPhone").value;
    const pin = document.getElementById("loginPin").value;

    if (!phone || !pin) return alert("Please enter details");

    // Check Database
    const q = query(collection(db, "delivery_agents"), where("phone", "==", phone), where("pin", "==", pin));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        const agent = snapshot.docs[0].data();
        localStorage.setItem("delivery_agent", JSON.stringify(agent));
        showDashboard(agent);
    } else {
        alert("Invalid Phone or PIN");
    }
};

// ==========================================
// 2. DASHBOARD LOGIC
// ==========================================
function showDashboard(agent) {
    document.getElementById("login-section").style.display = "none";
    document.getElementById("dashboard-section").style.display = "block";
    document.getElementById("logoutBtn").style.display = "block";

    loadOrders(agent.phone);
}

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("delivery_agent");
    window.location.reload();
});

// ==========================================
// 3. FETCH ORDERS & SHOW FULL ADDRESS
// ==========================================
async function loadOrders(phone) {
    const list = document.getElementById("orders-list");
    list.innerHTML = "Loading...";

    // Query: Orders assigned to this phone number AND status is 'Assigned'
    const q = query(
        collection(db, "orders"), 
        where("deliveryBoyPhone", "==", phone), 
        where("status", "==", "Assigned")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        list.innerHTML = `
            <div class="empty-state">
                <h1>✅</h1>
                <p>No pending deliveries.</p>
                <button onclick="window.location.reload()" style="background:none; border:none; color:#0c831f; font-weight:bold; cursor:pointer;">Refresh</button>
            </div>
        `;
        return;
    }

    list.innerHTML = "";

    snapshot.forEach(docSnap => {
        const o = docSnap.data();
        const items = o.cart.map(i => `${i.name} x${i.qty}`).join(", ");
        
        // 📍 Fetch the FULL address from the database
        const fullAddress = o.address || "❌ No address provided";
        
        list.innerHTML += `
            <div class="delivery-card">
                <div class="customer-info">
                    <h3 style="margin-bottom: 2px;">${o.customerName}</h3>
                    <p style="margin-bottom: 10px; color:#555;">📞 ${o.customerPhone}</p>
                    
                    <div style="background:#fff3cd; padding:12px; border-radius:8px; margin:15px 0; border:1px solid #ffeeba; color:#856404;">
                        <div style="font-size: 11px; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; color: #b8860b; letter-spacing: 0.5px;">
                            Deliver To:
                        </div>
                        <div style="font-size: 15px; font-weight: bold; line-height: 1.4;">
                            📍 ${fullAddress}
                        </div>
                    </div>

                    <p style="margin-bottom: 10px;">💰 <strong>Collect: ₹${o.total}</strong> (${o.paymentMethod})</p>
                </div>
                
                <div class="order-items">
                    <strong>Items:</strong> ${items}
                </div>

                <div class="btn-group">
                    <a href="tel:${o.customerPhone}" class="btn-call">📞 Call</a>
                    <button onclick="markDelivered('${docSnap.id}')" class="btn-done">✅ Mark Delivered</button>
                </div>
            </div>
        `;
    });
}

// ==========================================
// 4. ACTION: MARK AS DELIVERED
// ==========================================
window.markDelivered = async (orderId) => {
    if (confirm("Confirm that you have delivered this order?")) {
        await updateDoc(doc(db, "orders", orderId), {
            status: "Delivered",
            paymentStatus: "Paid" // Assume cash collected if COD
        });
        alert("Great job! Order completed.");
        window.location.reload(); // Refresh to remove card
    }
};