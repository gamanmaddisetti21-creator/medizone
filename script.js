const medicines=[
{id:1,name:"Paracetamol 500 mg",kind:"Pain relief",price:28,desc:"Sample listing · 10 tablets",symbol:"✚"},
{id:2,name:"ORS Sachets",kind:"ORS hydration",price:22,desc:"Sample listing · single sachet",symbol:"＋"},
{id:3,name:"Vitamin C",kind:"Vitamins",price:95,desc:"Sample listing · pack",symbol:"C"},
{id:4,name:"Cetirizine 10 mg",kind:"Allergy",price:35,desc:"Sample listing · 10 tablets",symbol:"✚"},
{id:5,name:"Antacid Tablets",kind:"Digestive care",price:48,desc:"Sample listing · pack",symbol:"＋"},
{id:6,name:"Adhesive Bandages",kind:"First aid",price:30,desc:"Sample listing · pack",symbol:"✚"},
{id:7,name:"Digital Thermometer",kind:"Health devices",price:180,desc:"Sample listing · device",symbol:"°"},
{id:8,name:"Hand Sanitizer",kind:"Personal care",price:65,desc:"Sample listing · bottle",symbol:"+"}
];
const pharmacies=[
{id:1,name:"Apollo Pharmacy – Capital Heights",area:"ITBP Road, Seema Dwar",address:"79, Capital Heights, ITBP Rd, Seema Dwar, Dehradun, Uttarakhand 248171",phone:"7942812663",count:0},
{id:2,name:"Mr. Care Pharmacy – Race Course",area:"Race Course Road",address:"8/7, near Race Course Road, East Rest Camp, Guru Nanak Vihar, Dehradun, Uttarakhand 248001",phone:"9719161918",count:0},
{id:3,name:"Goodness Pharmacy And More",area:"Dilaram Bazaar, Rajpur Road",address:"44, Dilaram Bazaar, Rajpur Road, Dehradun, Uttarakhand 248001",phone:"7710810126",count:0},
{id:4,name:"Chauhan Medical Store",area:"THDC Colony, Patel Nagar",address:"Sai Baba Enclave, THDC Colony, Dehrakhas, Patel Nagar, Dehradun, Uttarakhand 248001",phone:"9927877034",count:0},
{id:5,name:"Mr. Care Pharmacy – Kargi Chowk",area:"Kargi Road",address:"Ground Floor, Pundir Tower, Kargi-Patel Nagar Bypass, Kargi Chowk, Dehradun, Uttarakhand 248001",phone:"9649646252",count:0},
{id:6,name:"Mr. Care Pharmacy – Indra Nagar",area:"Indra Nagar, Vasant Vihar",address:"650, ITBP Road, opposite Uttarakhand Gramin Bank, Indra Nagar Colony, Dehradun, Uttarakhand 248146",phone:"9107076262",count:0},
{id:7,name:"Mr. Care Pharmacy – Ballupur",area:"Ballupur Road",address:"1044, Ballupur Road, near Maruti Nexa, Vijay Park, Dehradun, Uttarakhand 248001",phone:"9107077373",count:0},
{id:8,name:"Dawaa Dost – Railway Station",area:"Railway Station Road",address:"PRS Building, near railway station entry/exit, Govind Nagar, Race Course, Dehradun, Uttarakhand 248001",phone:"9216014652",count:0},
{id:9,name:"Mahadev Pharmacy",area:"Laxman Chowk",address:"16/1, Malviya Road, Laxman Chowk, Dehradun, Uttarakhand 248001",phone:"9675256248",count:0},
{id:10,name:"Singh Pharmacy",area:"DAV College Road, Karanpur",address:"24, DAV College Road, near Shanaya Dental & Medical Care, Karanpur, Dehradun, Uttarakhand 248001",phone:"7701970427",count:0},
{id:11,name:"The City Pharmacy",area:"New Road Chowk",address:"Dwarka Store, 27A New Road Chowk, Dehradun, Uttarakhand 248001",phone:"7351547311",count:0},
{id:12,name:"Shiva Medical Hall",area:"Dilaram Bazaar, Rajpur Road",address:"44/1 Dilaram Bazaar, Rajpur Road, Dehradun, Uttarakhand 248001",phone:"9897255286",count:0},
{id:13,name:"Shri Shyam Medicos",area:"GMS Road, Shakti Enclave",address:"GMS Road, near Saffron Leaf Hotel, Shakti Enclave, Kaonli, Dehradun, Uttarakhand 248001",phone:"8937007646",count:0},
{id:14,name:"Saraswati Medical Store",area:"Kargi Road",address:"No. 92, Singal Mandi-2, Kargi Road, Dehradun, Uttarakhand 248001",phone:"9997256962",count:0},
{id:15,name:"HB Pharmacy",area:"Turner Road, Clement Town",address:"10, Turner Road, Morowala, Clement Town, Dehradun, Uttarakhand 248002",phone:"9258300638",count:0}
];
let cart=JSON.parse(localStorage.getItem("gamanmediDemoCart")||"[]");
const $=id=>document.getElementById(id);
function renderMedicines(query=""){
 const q=query.trim().toLowerCase();
 const filtered=medicines.filter(m=>(m.name+" "+m.kind).toLowerCase().includes(q));
 $("medicineGrid").innerHTML=filtered.map(m=>`<article class="medicine-card"><div class="medicine-art"><span class="med-symbol">${m.symbol}</span><span class="pill-shape"></span></div><h3>${m.name}</h3><p>${m.desc}</p><div class="card-bottom"><span class="price">₹${m.price}<small>Demo price only</small></span><button class="add-button" onclick="addToCart(${m.id})">＋ Save</button></div></article>`).join("");
 $("medicineEmpty").classList.toggle("hidden",filtered.length>0);
}
function renderPharmacies(){
 $("pharmacyGrid").innerHTML=pharmacies.map(p=>`<article class="pharmacy-card"><div class="pharmacy-top"><div class="store-icon">✚</div><div><h3>${p.name}</h3><div class="area">${p.area}</div></div></div><p class="pharmacy-address">${p.address}</p><div class="stock">Public directory listing · Call to confirm hours and stock</div><div class="pharmacy-actions"><a class="pharmacy-call" href="tel:+91${p.phone}">Call ${p.phone}</a><a class="pharmacy-map" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name+" "+p.address)}">Directions ↗</a></div></article>`).join("");
}
function showStore(id){const p=pharmacies.find(x=>x.id===id);showToast(`${p.name}: call the pharmacy to confirm medicine availability.`)}
function addToCart(id){const m=medicines.find(x=>x.id===id);const existing=cart.find(x=>x.id===id);if(existing)existing.qty++;else cart.push({...m,qty:1});saveCart();showToast(`${m.name} saved to your demo list`)}
function saveCart(){localStorage.setItem("gamanmediDemoCart",JSON.stringify(cart));$("cartCount").textContent=cart.reduce((sum,x)=>sum+x.qty,0);renderCart()}
function renderCart(){const el=$("cartItems");if(!cart.length){el.innerHTML='<p class="section-description">Your demo list is empty. Use “Save” on a sample item to add it here.</p>';return}el.innerHTML=cart.map(x=>`<div class="cart-line"><span>${x.name} <b>×${x.qty}</b></span><button onclick="removeItem(${x.id})">Remove</button></div>`).join("")}
function removeItem(id){cart=cart.filter(x=>x.id!==id);saveCart()}
function showToast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.classList.remove("show"),2400)}
$("searchBtn").addEventListener("click",()=>{renderMedicines($("searchInput").value);$("medicines").scrollIntoView({behavior:"smooth"})});
$("searchInput").addEventListener("input",e=>renderMedicines(e.target.value));
$("categoryRow").addEventListener("click",e=>{const b=e.target.closest("button[data-query]");if(!b)return;document.querySelectorAll(".category").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("searchInput").value=b.dataset.query;renderMedicines(b.dataset.query)});
$("openCart").addEventListener("click",()=>{$("cartModal").classList.remove("hidden");renderCart()});
$("closeCart").addEventListener("click",()=>$("cartModal").classList.add("hidden"));
$("cartModal").addEventListener("click",e=>{if(e.target===$("cartModal"))$("cartModal").classList.add("hidden")});
$("clearCart").addEventListener("click",()=>{cart=[];saveCart();showToast("Demo list cleared")});
document.addEventListener("keydown",e=>{if(e.key==="Escape")$("cartModal").classList.add("hidden")});
$("year").textContent=new Date().getFullYear();
renderMedicines();renderPharmacies();saveCart();
