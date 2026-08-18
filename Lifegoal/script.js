// Harga beli Tabungan Emas Pegadaian. Nilai diambil live dan divalidasi dengan histori harian.
   // --- 1. DEKLARASI VARIABEL GLOBAL UNTUK TRANSAKSI ---
    let activityData = [];
    let nextActivityId = 1;
    let nextGoalId = 5; // ID selanjutnya untuk kantong baru

    // Harga beli Tabungan Emas Pegadaian. Nilai diambil live dan divalidasi dengan histori harian.
    let HARGA_EMAS_PER_GRAM = null;
    const GOLD_API = 'https://logam-mulia-api.iamutaki.workers.dev/api/prices/pegadaian';
    const GOLD_HISTORY_API = `${GOLD_API}/history?length=2`;
    const GOLD_CACHE_KEY = 'lifegoal-verified-pegadaian-gold-price-v1';
    const MAX_DAILY_CHANGE = 0.15;

    // --- 2. DATA AWAL (Sudah diperbaiki tanda kutip, emoji, dan penambahan 'id') ---
    // --- DATA KANTONG SESUAI MOCKUP ---
    let goalsData = [
        { id: 1, nama: "Konser Coldplay 2027 🎉", image: "../Lampiran/Coldplay.jpg", imgColor: "#111", icon: "🎵", targetRp: 3500000, terkumpulGram: 1.55, barColor: "green" },
        { id: 2, nama: "iPhone 18 Pro 📱", image: "../Lampiran/Iphone18 Pro.jpg", imgColor: "#333", icon: "📱", targetRp: 18000000, terkumpulGram: 4.22, barColor: "orange" },
        { id: 3, nama: "Liburan ke Jepang ✈️", image: "../Lampiran/Japan.png", imgColor: "#87CEEB", icon: "✈️", targetRp: 15000000, terkumpulGram: 8.79, barColor: "green" },
        { id: 4, nama: "Dana Pendidikan S2 📚", image: "../Lampiran/s2.jpg", imgColor: "#8B7355", icon: "🎓", targetRp: 25000000, terkumpulGram: 1.85, barColor: "green" }
    ];

    // --- FORMATTING UTILS ---
    function formatRp(angka) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka); }
    function formatGram(angka) { return angka.toFixed(2).replace('.', ','); }

    // --- RENDER UI ---
    function updateSummary() {
        let totalGram = goalsData.reduce((sum, goal) => sum + goal.terkumpulGram, 0);
        let totalVal = totalGram * HARGA_EMAS_PER_GRAM;
        
        document.getElementById('totalGramValue').textContent = `${formatGram(totalGram)} gram`;
        document.getElementById('totalRupiah').textContent = `≈ ${formatRp(totalVal)}`;
        document.getElementById('totalValue').textContent = formatRp(totalVal);
    }

    function renderGoals() {
        const container = document.getElementById('goalListContainer');
        container.innerHTML = '';

        goalsData.forEach(goal => {
            const targetGram = goal.targetRp / HARGA_EMAS_PER_GRAM;
            const percentage = Math.min((goal.terkumpulGram / targetGram) * 100, 100);
            const sisaGram = Math.max(targetGram - goal.terkumpulGram, 0);
            
            const colorClass = goal.barColor === 'green' || percentage >= 50 ? 'bg-green' : 'bg-orange';
            const textClass = goal.barColor === 'green' || percentage >= 50 ? 'text-green' : 'text-orange';

            // Menentukan apakah merender gambar atau sekadar warna + icon jika gambar kosong
            const imageElement = goal.image 
                ? `<img src="${goal.image}" alt="${goal.nama}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; border-radius: 12px;">` 
                : `<div style="font-size: 30px;">${goal.icon}</div>`;

            container.innerHTML += `
                <div class="goal-card">
                    <div class="goal-img-wrapper" style="background-color: ${goal.imgColor};">
                        ${imageElement}
                        <div class="goal-icon">${goal.icon}</div>
                    </div>
                    <div class="goal-info">
                        <div class="goal-title-row">
                            <div class="goal-title">${goal.nama}</div>
                            <button class="icon-btn" onclick="toggleMenu(event, ${goal.id})" style="font-size: 16px; font-weight: bold; padding-bottom: 5px;">⋮</button>
                            <div class="dropdown-menu" id="menu-${goal.id}">
                                <div class="dropdown-item" onclick="openModal('edit', ${goal.id})">✎ Edit Kantong</div>
                                <div class="dropdown-item delete" onclick="deleteGoal(event, ${goal.id})">🗑 Hapus</div>
                            </div>
                        </div>
                        <div class="goal-target">Target: ${formatRp(goal.targetRp)} (${formatGram(targetGram)} gr)</div>
                        
                        <div class="goal-bottom-row">
                            <div class="progress-section">
                                <div class="progress-header">
                                    <span class="progress-percentage ${textClass}">${percentage.toFixed(0)}%</span>
                                </div>
                                <div class="progress-bar-bg"><div class="progress-bar-fill ${colorClass}" style="width: ${percentage}%;"></div></div>
                                <div class="progress-stats">
                                    <span>${formatGram(goal.terkumpulGram)} gr terkumpul</span>
                                    <span>${formatGram(sisaGram)} gr lagi</span>
                                </div>
                            </div>
                            <button class="btn-kelola" onclick="openTransactionModal(${goal.id})">
                                <span>💰</span>Kelola
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        updateSummary();
    }

    function openSortModal() {
        document.querySelector(`input[name="sortBy"][value="${sortBy}"]`).checked = true;
        document.querySelector(`input[name="sortDirection"][value="${sortDirection}"]`).checked = true;
        document.getElementById('sortModal').classList.add('active');
    }

    function closeSortModal() {
        document.getElementById('sortModal').classList.remove('active');
    }

    function closeSortOnOverlay(event) {
        if (event.target.id === 'sortModal') closeSortModal();
    }

    function applySort() {
        sortBy = document.querySelector('input[name="sortBy"]:checked').value;
        sortDirection = document.querySelector('input[name="sortDirection"]:checked').value;
        const multiplier = sortDirection === 'asc' ? 1 : -1;
        goalsData.sort((a, b) => {
            const valueA = sortBy === 'nominal'
                ? a.targetRp
                : (a.terkumpulGram / (a.targetRp / HARGA_EMAS_PER_GRAM)) * 100;
            const valueB = sortBy === 'nominal'
                ? b.targetRp
                : (b.terkumpulGram / (b.targetRp / HARGA_EMAS_PER_GRAM)) * 100;
            return (valueA - valueB) * multiplier;
        });
        document.querySelector('.sort-btn').textContent = `${sortBy === 'nominal' ? 'Nominal' : 'Persentase'}: ${sortDirection === 'asc' ? '↑' : '↓'}`;
        renderGoals();
        closeSortModal();
    }

    // Modal Functions
    function openModal() {
        document.getElementById('addModal').classList.add('active');
        document.getElementById('inputNama').value = '';
        document.getElementById('inputTarget').value = '';
        document.getElementById('displayGram').innerText = '0,00 gr';
    }

    function closeModal() {
        document.getElementById('addModal').classList.remove('active');
    }

    // Auto Calculate Gram saat input Rupiah
    function calculateGold() {
        const inputRp = document.getElementById('inputTarget').value;
        if (!HARGA_EMAS_PER_GRAM) {
            document.getElementById('displayGram').innerText = 'Menunggu harga…';
        } else if (inputRp && inputRp > 0) {
            const gram = inputRp / HARGA_EMAS_PER_GRAM;
            document.getElementById('displayGram').innerText = formatGram(gram) + ' gr';
        } else {
            document.getElementById('displayGram').innerText = '0,00 gr';
        }
    }

    // Submit Goal Baru
    // Submit Goal Baru
    function submitNewGoal() {
        const nama = document.getElementById('inputNama').value;
        const targetRp = parseFloat(document.getElementById('inputTarget').value);
        
        if (!nama || !targetRp || targetRp <= 0) {
            alert("Harap lengkapi nama impian dan nominal target yang valid.");
            return;
        }
        
        // Tambahkan ke array (Terkumpul diset 0 gr di awal, dan ID ditambahkan)
        goalsData.unshift({
            id: nextGoalId++, // Memberikan ID unik
            nama: nama,
            imgColor: "#156535", 
            image: "", // Kosongkan atau isi default path
            icon: "🎯",
            targetRp: targetRp,
            terkumpulGram: 0
        });
        
        renderGoals();
        closeModal();
    }

    // Inisialisasi Render Pertama
    window.onload = async () => {
        await refreshGoldPrice();
        renderGoals();
        setInterval(async () => {
            await refreshGoldPrice();
            renderGoals();
        }, 5 * 60 * 1000);
    };