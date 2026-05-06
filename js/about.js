document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. PROFILE IMAGE HOVER EFFECT ---
    const profileContainer = document.querySelector('.profile-image');
    
    if (profileContainer) {
        const images = profileContainer.querySelectorAll('img');
        
        // Pastikan ada 2 gambar di dalam container
        if (images.length >= 2) {
            const imgBase = images[0]; // Gambar Bawah
            const imgHover = images[1]; // Gambar Atas

            profileContainer.addEventListener('mouseenter', () => {
                // Munculkan gambar atas (img2)
                imgHover.style.opacity = '1';
                imgHover.style.transform = 'scale(1.05)';
                
                // Gambar bawah sedikit zoom juga biar seragam
                imgBase.style.transform = 'scale(1.05)';
            });

            profileContainer.addEventListener('mouseleave', () => {
                // Sembunyikan gambar atas
                imgHover.style.opacity = '0';
                imgHover.style.transform = 'scale(1)';

                // Kembalikan gambar bawah ke normal
                imgBase.style.transform = 'scale(1)';
            });
        }
    }

    // --- 2. SCROLL REVEAL EFEK ---
    const observerOptions = {
        threshold: 0.15 
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    const elementsToReveal = document.querySelectorAll('.reveal-element');
    elementsToReveal.forEach(el => {
        observer.observe(el);
    });

    console.log("About Page Loaded // System Ready");

    
});
/* =========================================
   CUSTOM CURSOR LOGIC
   ========================================= */
const cursor = document.querySelector('.custom-cursor');

if (cursor) {
    // Kursor mengikuti pergerakan mouse
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });

    // Efek membesar saat hover pada elemen yang bisa diklik
    // Ditambahkan tag button, input, dan textarea agar bereaksi di form Contact Me
    const hoverElements = document.querySelectorAll('a, .image-frame, button, input, textarea, .cover-wrapper');
    
    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('cursor-hover'));
    });
}


/* =========================================
   FORM SUBMISSION (AJAX & POPUP)
   ========================================= */
const contactForm = document.getElementById('contactForm');
const successPopup = document.getElementById('successPopup');
const closePopupBtn = document.getElementById('closePopup');

if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
        // Mencegah halaman pindah/reload bawaan HTML
        e.preventDefault(); 

        const submitBtn = contactForm.querySelector('.submit-btn');
        const originalBtnText = submitBtn.innerText;
        
        // Ubah teks tombol saat loading
        submitBtn.innerText = 'MENGIRIM...';
        submitBtn.disabled = true;

        try {
            const response = await fetch(contactForm.action, {
                method: contactForm.method,
                body: new FormData(contactForm),
                headers: {
                    'Accept': 'application/json' // Meminta Formspree tidak me-redirect
                }
            });

            if (response.ok) {
                // Jika sukses, munculkan Pop-up
                successPopup.classList.add('show');
                contactForm.reset(); // Kosongkan isian form
            } else {
                alert('Gagal mengirim sinyal. Silakan coba lagi.');
            }
        } catch (error) {
            alert('Terjadi kesalahan jaringan/frekuensi.');
        } finally {
            // Kembalikan tombol seperti semula
            submitBtn.innerText = originalBtnText;
            submitBtn.disabled = false;
        }
    });
}

// Logika untuk menutup Pop-up
if (closePopupBtn) {
    closePopupBtn.addEventListener('click', () => {
        successPopup.classList.remove('show');
    });
}

