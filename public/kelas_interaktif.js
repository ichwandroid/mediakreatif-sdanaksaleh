// State
let journalData = [];
let db;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase to be ready
    const checkFirebase = setInterval(() => {
        if (window.firebase && window.firebase.firestore) {
            clearInterval(checkFirebase);
            try {
                db = firebase.firestore();
                loadData();
            } catch (e) {
                console.error("Firebase init error:", e);
                alert("Gagal menghubungkan ke database.");
            }
        }
    }, 100);

    // Set default date/time for new entry
    resetForm();
});

// Load data from Firestore (Realtime)
function loadData() {
    const tbody = document.getElementById('tableBody');
    // Show loading state
    tbody.innerHTML = `
        <tr class="text-center">
            <td colspan="7" class="text-slate-400 py-12">
                <div class="flex flex-col items-center gap-2">
                    <span class="animate-spin text-3xl">⏳</span>
                    <p>Menghubungkan ke server...</p>
                </div>
            </td>
        </tr>
    `;

    db.collection('jurnal_kelas')
        .onSnapshot((snapshot) => {
            journalData = [];
            snapshot.forEach((doc) => {
                journalData.push({ id: doc.id, ...doc.data() });
            });
            renderTable();
        }, (error) => {
            console.error("Error loading data: ", error);
            tbody.innerHTML = `
                <tr class="text-center">
                    <td colspan="7" class="text-red-500 py-8">
                        <p>Gagal memuat data. Pastikan koneksi internet lancar.</p>
                        <p class="text-xs text-slate-400">${error.message}</p>
                    </td>
                </tr>
            `;
        });
}

// Render Table
function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (journalData.length === 0) {
        tbody.innerHTML = `
            <tr class="text-center">
                <td colspan="7" class="text-slate-400 py-8">
                    <div class="flex flex-col items-center gap-2">
                        <span class="text-2xl">📝</span>
                        <p>Belum ada data jurnal.<br>Klik tombol "Catat Baru" untuk memulai.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    // Sort by date/time descending client-side
    journalData.sort((a, b) => {
        const dtA = new Date(`${a.date} ${a.time}`);
        const dtB = new Date(`${b.date} ${b.time}`);
        return dtB - dtA;
    });

    journalData.forEach((entry) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50/80 transition-colors group border-b border-slate-100 last:border-0';

        // Format Date
        let dateStr = entry.date;
        try {
            const dateObj = new Date(entry.date);
            dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) { }

        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="font-bold text-slate-700">${dateStr}</div>
                <div class="text-xs text-slate-400 font-mono">${entry.time}</div>
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                   <div class="w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold text-xs uppercase">
                        ${entry.teacherName ? entry.teacherName.charAt(0) : '?'}
                   </div>
                   <span class="font-medium text-slate-700">${entry.teacherName}</span>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded bg-slate-100 text-slate-600 font-bold text-xs">Kelas ${entry.className}</span>
            </td>
            <td class="px-6 py-4 text-slate-600">${entry.subject}</td>
            <td class="px-6 py-4 text-slate-500 text-sm max-w-xs truncate" title="${entry.topic}">
                ${entry.topic}
            </td>
            <td class="px-6 py-4">
                ${entry.notes ? `<span class="text-slate-400 italic text-xs">${entry.notes}</span>` : '<span class="text-slate-300">-</span>'}
            </td>
            <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="editEntry('${entry.id}')" class="p-2 text-slate-400 hover:text-brand-blue hover:bg-blue-50 rounded-lg transition-all" title="Edit">
                        ✏️
                    </button>
                    <button onclick="deleteEntry('${entry.id}')" class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Hapus">
                        🗑️
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Modal Logic
const modal = document.getElementById('entryModal');
const modalContent = document.getElementById('modalContent');

function openModal() {
    modal.classList.remove('hidden');
    // Force reflow
    void modal.offsetWidth;
    modal.classList.remove('opacity-0');
    modalContent.classList.remove('scale-95');
    modalContent.classList.add('scale-100');
}

function closeModal() {
    modal.classList.add('opacity-0');
    modalContent.classList.remove('scale-100');
    modalContent.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        resetForm();
    }, 300);
}

// Form Handling
function resetForm() {
    document.getElementById('entryId').value = '';

    // Set today's date and time
    const now = new Date();
    // Handling timezone offset for input type=date
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - offset)).toISOString().slice(0, -1);

    document.getElementById('date').value = localISOTime.slice(0, 10);
    document.getElementById('time').value = now.toTimeString().substring(0, 5);

    document.getElementById('teacherName').value = '';
    document.getElementById('className').value = '';
    document.getElementById('subject').value = '';
    document.getElementById('topic').value = '';
    document.getElementById('notes').value = '';
}

function saveEntry() {
    const id = document.getElementById('entryId').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const teacherName = document.getElementById('teacherName').value;
    const className = document.getElementById('className').value;
    const subject = document.getElementById('subject').value;
    const topic = document.getElementById('topic').value;
    const notes = document.getElementById('notes').value;

    // Validation
    if (!date || !time || !teacherName || !className || !subject || !topic) {
        alert('Mohon lengkapi semua field yang wajib diisi.');
        return;
    }

    const entry = {
        date,
        time,
        teacherName,
        className,
        subject,
        topic,
        notes
    };

    const btn = document.querySelector('button[onclick="saveEntry()"]');
    const originalText = btn.innerText;
    btn.innerText = 'Menyimpan...';
    btn.disabled = true;

    if (id) {
        // Update existing
        db.collection('jurnal_kelas').doc(id).update(entry)
            .then(() => {
                closeModal();
            })
            .catch((error) => {
                console.error("Error updating document: ", error);
                alert("Gagal menyimpan perubahan: " + error.message);
            })
            .finally(() => {
                btn.innerText = originalText;
                btn.disabled = false;
            });
    } else {
        // Create new
        db.collection('jurnal_kelas').add(entry)
            .then(() => {
                closeModal();
            })
            .catch((error) => {
                console.error("Error adding document: ", error);
                alert("Gagal menambahkan data: " + error.message);
            })
            .finally(() => {
                btn.innerText = originalText;
                btn.disabled = false;
            });
    }
}

function editEntry(id) {
    const entry = journalData.find(item => item.id === id);
    if (!entry) return;

    document.getElementById('entryId').value = entry.id;
    document.getElementById('date').value = entry.date;
    document.getElementById('time').value = entry.time;
    document.getElementById('teacherName').value = entry.teacherName;
    document.getElementById('className').value = entry.className;
    document.getElementById('subject').value = entry.subject;
    document.getElementById('topic').value = entry.topic;
    document.getElementById('notes').value = entry.notes || '';

    openModal();
}

function deleteEntry(id) {
    if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
        db.collection('jurnal_kelas').doc(id).delete().catch((error) => {
            console.error("Error removing document: ", error);
            alert("Gagal menghapus data: " + error.message);
        });
    }
}

// JSON Handlers
function downloadJSON() {
    // Remove IDs from export if we want clean data, but keeping them is fine for reference
    const dataStr = JSON.stringify(journalData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create link and click it
    const a = document.createElement('a');
    a.href = url;
    a.download = `jurnal_kelas_interaktif_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importJSON(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const json = JSON.parse(e.target.result);
            if (Array.isArray(json)) {
                if (confirm(`Akan mengimpor ${json.length} data. Data akan ditambahkan ke database (tidak menghapus data lama). Lanjutkan?`)) {

                    // Batch write allows max 500 ops. If larger, we need chunks.
                    // For simplicity, we'll do individual adds or small batches.
                    // Check total size
                    let successCount = 0;
                    let errorCount = 0;

                    const batchSize = 400;
                    let chunks = [];
                    for (let i = 0; i < json.length; i += batchSize) {
                        chunks.push(json.slice(i, i + batchSize));
                    }

                    // We process chunks sequentially roughly
                    processChunks(chunks, 0);
                }
            } else {
                alert('Format JSON tidak valid (harus berupa array).');
            }
        } catch (err) {
            alert('Gagal membaca file JSON: ' + err.message);
        }
        // Reset input
        input.value = '';
    };
    reader.readAsText(file);
}

function processChunks(chunks, index) {
    if (index >= chunks.length) {
        alert('Import selesai!');
        return;
    }

    const chunk = chunks[index];
    const batch = db.batch();

    chunk.forEach(item => {
        // Construct clean entry object (exclude existing ID to avoid conflicts, or use it if we want to force restore)
        // Usually import means new entries with new IDs
        const entry = {
            date: item.date,
            time: item.time,
            teacherName: item.teacherName,
            className: item.className,
            subject: item.subject,
            topic: item.topic,
            notes: item.notes || ''
        };
        const docRef = db.collection('jurnal_kelas').doc(); // Auto-ID
        batch.set(docRef, entry);
    });

    batch.commit().then(() => {
        console.log(`Batch ${index + 1} imported.`);
        processChunks(chunks, index + 1);
    }).catch(err => {
        console.error("Batch import error: ", err);
        alert(`Gagal mengimport batch ke-${index + 1}: ` + err.message);
    });
}
