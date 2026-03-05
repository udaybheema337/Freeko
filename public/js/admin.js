import { auth, db } from "./config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, onSnapshot, orderBy, query, doc, updateDoc, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- AUTH CHECK ---
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "admin_login.html";
});

// --- TABS LOGIC ---
window.showTab = (tabName) => {
    ['orders', 'team', 'analysis', 'products'].forEach(t => {
        document.getElementById(`tab-${t}`).classList.add('hidden');
        document.getElementById(`btn-${t}`).classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    document.getElementById(`btn-${tabName}`).classList.add('active');
};

// --- GLOBAL STATE ---
let ordersByDate = {}; 
let allAgents = []; 
let selectedOrders = new Set(); // Store IDs of checked orders

// ==========================================
// 1. FETCH AGENTS (For Dropdown & Team Tab)
// ==========================================
onSnapshot(collection(db, "delivery_agents"), (snap) => {
    const teamDiv = document.getElementById("team-list");
    const bulkSelect = document.getElementById("bulk-driver-select"); // Bulk Select Dropdown
    
    teamDiv.innerHTML = "";
    if(bulkSelect) bulkSelect.innerHTML = '<option value="">Select Partner...</option>';

    allAgents = [];

    snap.forEach(docSnap => {
        const a = docSnap.data();
        allAgents.push({ id: docSnap.id, ...a });
        
        // Render in Team Tab
        teamDiv.innerHTML += `
            <div class="list-item">
                <div><strong>${a.name}</strong><br><small>📞 ${a.phone} | PIN: ${a.pin}</small></div>
                <button onclick="deleteAgent('${docSnap.id}')" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:4px;">🗑️</button>
            </div>
        `;

        // Add to Bulk Dropdown
        if(bulkSelect) bulkSelect.innerHTML += `<option value="${a.phone}">${a.name}</option>`;
    });
});

// ==========================================
// 2. ORDERS LOGIC (With Checkboxes & Address)
// ==========================================
const q = query(collection(db, "orders"), orderBy("timestamp", "desc"));

onSnapshot(q, (snapshot) => {
    const ordersDiv = document.getElementById("orders-list");
    const analysisDiv = document.getElementById("analysis-list");
    
    ordersDiv.innerHTML = "";
    analysisDiv.innerHTML = "";
    ordersByDate = {}; 
    let itemTotals = {};

    if (snapshot.empty) {
        ordersDiv.innerHTML = "<p>No orders found.</p>";
        analysisDiv.innerHTML = "<p>Nothing to pack.</p>";
        return;
    }

    snapshot.forEach(docSnap => {
        const o = docSnap.data();
        const dateObj = o.timestamp ? o.timestamp.toDate() : new Date();
        const dateKey = dateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
        
        if (!ordersByDate[dateKey]) ordersByDate[dateKey] = [];
        ordersByDate[dateKey].push({ id: docSnap.id, ...o });

        if (o.status !== 'Delivered' && o.status !== 'Cancelled') {
            o.cart.forEach(item => itemTotals[item.name] = (itemTotals[item.name] || 0) + item.qty);
        }
    });

    // RENDER ORDERS BY DATE
    for (const [date, orders] of Object.entries(ordersByDate)) {
        let html = `<div class="date-header"><span>📅 ${date}</span><button class="btn-delete-day" onclick="deleteDay('${date}')">🗑️ Delete All</button></div>`;
        
        orders.forEach(o => {
            // Generate Agent Dropdown Options for individual assign
            let agentOptions = `<option value="">-- Select --</option>`;
            allAgents.forEach(a => {
                const selected = o.deliveryBoyPhone === a.phone ? "selected" : "";
                agentOptions += `<option value="${a.phone}" ${selected}>${a.name}</option>`;
            });

            // 🎨 COLOR & STATUS LOGIC
            let cardBg = 'white';
            let statusBg = '#eee';
            
            if (o.status === 'Assigned') {
                cardBg = '#fff3cd'; // Yellow
                statusBg = '#f39c12';
            } else if (o.status === 'Delivered') {
                cardBg = '#d1e7dd'; // Green
                statusBg = '#198754';
            }

            // Address Handling
            const address = o.address || "❌ No Address Provided";

            // Checkbox Logic (Only show if not delivered)
            const showCheckbox = o.status !== "Delivered";
            const checkboxHtml = showCheckbox 
                ? `<input type="checkbox" class="order-checkbox" value="${o.id}" onchange="toggleOrder('${o.id}')" style="margin-right:10px; transform:scale(1.2);">` 
                : ``;

            // Assign Box Logic
            const assignBoxDisplay = o.status === 'Delivered' ? 'none' : 'block';

            html += `
                <div class="order-card" style="background-color: ${cardBg};">
                    <div style="display:flex; align-items:flex-start;">
                        ${checkboxHtml}
                        <div style="flex:1;">
                            <div style="display:flex; justify-content:space-between;">
                                <strong>${o.customerName}</strong>
                                <span style="background:${statusBg}; color:${o.status==='Delivered'?'white':'black'}; padding:2px 6px; font-size:12px; border-radius:4px;">${o.status}</span>
                            </div>
                            
                            <div style="font-size:13px; color:#444; margin:5px 0; background:rgba(0,0,0,0.03); padding:5px; border-radius:4px;">
                                📍 ${address}
                            </div>

                            <p style="font-weight:bold; margin-top:5px;">₹${o.total} <small style="font-weight:normal;">(${o.paymentMethod})</small></p>
                            <small style="color:#555;">${o.cart.map(i => `${i.name} (${i.qty})`).join(', ')}</small>
                            
                            <div class="assign-box" style="display:${assignBoxDisplay}">
                                <small>🚚 Assign to:</small>
                                <div style="display:flex; gap:5px; margin-top:5px;">
                                    <select id="sel-${o.id}" style="flex:1; padding:5px; border:1px solid #ddd; border-radius:4px;">${agentOptions}</select>
                                    <button onclick="assignOrder('${o.id}')" style="background:#27ae60; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Assign</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        ordersDiv.innerHTML += html;
    }

    // RENDER ANALYSIS
    if (Object.keys(itemTotals).length === 0) analysisDiv.innerHTML = "<p>All caught up!</p>";
    else for (const [name, qty] of Object.entries(itemTotals)) analysisDiv.innerHTML += `<div class="list-item" style="background:#e8f5e9;"><span>${name}</span><strong>x ${qty}</strong></div>`;
});

// ==========================================
// 3. BULK ASSIGNMENT LOGIC
// ==========================================
window.toggleOrder = (orderId) => {
    if (selectedOrders.has(orderId)) {
        selectedOrders.delete(orderId);
    } else {
        selectedOrders.add(orderId);
    }
    updateBulkBar();
};

function updateBulkBar() {
    const bar = document.getElementById("bulk-bar");
    const countSpan = document.getElementById("selected-count");
    
    if(countSpan) countSpan.innerText = selectedOrders.size;

    if (bar) {
        if (selectedOrders.size > 0) bar.classList.add("active");
        else bar.classList.remove("active");
    }
}

window.assignBulk = async () => {
    const phone = document.getElementById("bulk-driver-select").value;
    if (!phone) return alert("Please select a delivery partner!");
    if (selectedOrders.size === 0) return alert("No orders selected!");

    if (!confirm(`Assign ${selectedOrders.size} orders to this partner?`)) return;

    const batch = writeBatch(db);

    selectedOrders.forEach(orderId => {
        const ref = doc(db, "orders", orderId);
        batch.update(ref, {
            deliveryBoyPhone: phone,
            status: "Assigned"
        });
    });

    await batch.commit();
    
    // Reset UI
    selectedOrders.clear();
    updateBulkBar();
    document.querySelectorAll('.order-checkbox').forEach(cb => cb.checked = false);
    alert("Orders Assigned Successfully!");
};

// ==========================================
// 4. INDIVIDUAL ACTIONS
// ==========================================
window.assignOrder = async (orderId) => {
    const select = document.getElementById(`sel-${orderId}`);
    const phone = select.value;
    if(!phone) return alert("Please select a delivery partner first.");

    await updateDoc(doc(db, "orders", orderId), {
        deliveryBoyPhone: phone,
        status: "Assigned"
    });
};

window.addAgent = async () => {
    const name = document.getElementById("dName").value;
    const phone = document.getElementById("dPhone").value;
    const pin = document.getElementById("dPin").value;
    if(!name || !phone || !pin) return alert("Fill all fields");

    await addDoc(collection(db, "delivery_agents"), { name, phone, pin });
    document.getElementById("dName").value = "";
    document.getElementById("dPhone").value = "";
    document.getElementById("dPin").value = "";
    alert("Partner Added!");
};

window.deleteAgent = async (id) => {
    if(confirm("Remove this partner?")) await deleteDoc(doc(db, "delivery_agents", id));
};

window.deleteDay = async (dateKey) => {
    const orders = ordersByDate[dateKey];
    if (!orders) return;
    if (confirm(`Delete ALL ${orders.length} orders from ${dateKey}?`)) {
        const batch = writeBatch(db);
        orders.forEach(o => batch.delete(doc(db, "orders", o.id)));
        await batch.commit();
    }
};

// ==========================================
// 5. PRODUCT LOGIC
// ==========================================
onSnapshot(collection(db, "products"), (snap) => {
    const div = document.getElementById("products-list");
    div.innerHTML = "";
    snap.forEach(docSnap => {
        const p = docSnap.data();
        const badge = p.inStock !== false ? '<span class="stock-badge in">In Stock</span>' : '<span class="stock-badge out">Out</span>';
        div.innerHTML += `
            <div class="list-item">
                <div style="display:flex; align-items:center;">
                    <img src="${p.img}" style="width:40px; height:40px; border-radius:4px; margin-right:10px; object-fit:cover;">
                    <div><strong>${p.name}</strong> (${badge})<br>₹${p.price}</div>
                </div>
                <div>
                    <button onclick="editProduct('${docSnap.id}', '${p.name}', '${p.price}', '${p.img}', ${p.inStock}, '${p.category}')" style="background:#f39c12; border:none; color:white; padding:5px; border-radius:4px;">✏️</button>
                    <button onclick="deleteProduct('${docSnap.id}')" style="background:#e74c3c; border:none; color:white; padding:5px; border-radius:4px;">🗑️</button>
                </div>
            </div>`;
    });
});

window.saveProduct = async () => {
    const id = document.getElementById("prodId").value;
    const name = document.getElementById("pName").value;
    const price = Number(document.getElementById("pPrice").value);
    const img = document.getElementById("pImg").value;
    const category = document.getElementById("pCat").value;
    const inStock = document.getElementById("pStock").checked;
    if (!name || !price) return alert("Enter Name and Price");
    
    const data = { name, price, img, category, inStock };

    if (id) await updateDoc(doc(db, "products", id), data);
    else await addDoc(collection(db, "products"), { ...data, id: Date.now() });
    resetForm();
};

window.editProduct = (id, name, price, img, inStock, category) => {
    document.getElementById("prodId").value = id;
    document.getElementById("pName").value = name;
    document.getElementById("pPrice").value = price;
    document.getElementById("pImg").value = img;
    document.getElementById("pCat").value = category || "Vegetables";
    document.getElementById("pStock").checked = inStock !== false;
    document.getElementById("form-title").innerText = "✏️ Edit Product";
    document.getElementById("saveBtn").innerText = "Update";
    document.getElementById("cancelBtn").style.display = "block";
    window.scrollTo(0,0);
};

window.resetForm = () => {
    document.getElementById("prodId").value = "";
    document.getElementById("pName").value = "";
    document.getElementById("pPrice").value = "";
    document.getElementById("pImg").value = "";
    document.getElementById("pStock").checked = true;
    document.getElementById("form-title").innerText = "➕ Add Product";
    document.getElementById("saveBtn").innerText = "Save";
    document.getElementById("cancelBtn").style.display = "none";
};

window.deleteProduct = async (id) => {
    if(confirm("Delete this product?")) await deleteDoc(doc(db, "products", id));
};

window.logout = async () => {
    await signOut(auth);
    window.location.href = "admin_login.html";
};