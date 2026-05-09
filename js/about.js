// Semua kode dijalankan setelah HTML selesai dimuat
document.addEventListener('DOMContentLoaded', () => {

    /* =========================================
       0. LOADER LOGIC (Penting biar layar tidak blank)
       ========================================= */
    const loader = document.querySelector('.loader');
    if (loader) {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500); // Waktu transisi fade-out
        }, 800); // Waktu jeda sebelum loader hilang
    }

    /* =========================================
       1. PROFILE IMAGE HOVER EFFECT
       ========================================= */
    const profileContainer = document.querySelector('.profile-image');
    
    if (profileContainer) {
        const images = profileContainer.querySelectorAll('img');
        if (images.length >= 2) {
            const imgBase = images[0]; 
            const imgHover = images[1]; 

            profileContainer.addEventListener('mouseenter', () => {
                imgHover.style.opacity = '1';
                imgHover.style.transform = 'scale(1.05)';
                imgBase.style.transform = 'scale(1.05)';
            });

            profileContainer.addEventListener('mouseleave', () => {
                imgHover.style.opacity = '0';
                imgHover.style.transform = 'scale(1)';
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
                entry.target.classList.add('visible'); // Pastikan di CSS pakai class .visible
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
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });

        const hoverElements = document.querySelectorAll('a, .image-frame, button, input, textarea, .cover-wrapper');
        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('cursor-hover'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('cursor-hover'));
        });
    }

    /* =========================================
       4. FORM SUBMISSION (EMAILJS & POPUP)
       ========================================= */
    const contactForm = document.getElementById('contactForm');
    const btnSubmit = document.getElementById('btnSubmit');
    const successPopup = document.getElementById('successPopup');
    const closePopup = document.getElementById('closePopup');

    if (contactForm && btnSubmit) {
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();

            // Efek Brutalist: Ubah tombol jadi loading state
            const originalText = btnSubmit.innerText;
            btnSubmit.innerText = "MENGIRIM...";
            btnSubmit.disabled = true;

            // Kirim via EmailJS
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
