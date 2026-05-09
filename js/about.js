// Semua kode dijalankan setelah HTML selesai dimuat
document.addEventListener('DOMContentLoaded', () => {

    /* =========================================
       1. PROFILE IMAGE HOVER EFFECT
       ========================================= */
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

    /* =========================================
       2. SCROLL REVEAL EFEK
       ========================================= */
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


    /* =========================================
       3. CUSTOM CURSOR LOGIC
       ========================================= */
    const cursor = document.querySelector('.custom-cursor');

    if (cursor) {
        // Kursor mengikuti pergerakan mouse
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });

        // Efek membesar saat hover pada elemen yang bisa diklik
        const hoverElements = document.querySelectorAll('a, .image-frame, button, input, textarea, .cover-wrapper');
        
        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('cursor-hover'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('cursor-hover'));
        });
    }


    /* =========================================
       4. FORM SUBMISSION (AJAX & POPUP)
       ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    const btnSubmit = document.getElementById('btnSubmit');
    const successPopup = document.getElementById('successPopup');
    const closePopup = document.getElementById('closePopup');

    if (contactForm) {
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();

            // Efek Brutalist: Ubah tombol jadi loading state
            const originalText = btnSubmit.innerText;
            btnSubmit.innerText = "MENGIRIM...";
            btnSubmit.disabled = true;

            // Kirim via EmailJS
            // Ganti 'YOUR_SERVICE_ID' dan 'YOUR_TEMPLATE_ID' sesuai dashboard EmailJS
            emailjs.sendForm('service_3ex2tct', 'template_a7hclel', this)
                .then(() => {
                    // Berhasil: Munculkan popup buatanmu
                    if (successPopup) {
                        successPopup.classList.add('show');
                    }
                    contactForm.reset();
                }, (error) => {
                    // Gagal
                    alert("TRANSMISSION FAILED: " + JSON.stringify(error));
                })
                .finally(() => {
                    // Kembalikan tombol ke semula
                    btnSubmit.innerText = originalText;
                    btnSubmit.disabled = false;
                });
        });
    }

    // Logika tutup popup
    if (closePopup && successPopup) {
        closePopup.addEventListener('click', () => {
            successPopup.classList.remove('show');
        });
    }
});
