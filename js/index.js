document.addEventListener('DOMContentLoaded', function() {
    
    /* =========================================
       1. AUTO HOVER FADE (GENERIC SYSTEM)
       Berlaku untuk SEMUA .image-frame yang memiliki 2 gambar
       ========================================= */
    
    // Ambil semua elemen dengan class 'image-frame'
    const allFrames = document.querySelectorAll('.image-frame');

    allFrames.forEach(frame => {
        // Cari semua tag <img> di dalam frame tersebut
        const images = frame.querySelectorAll('img');

        // Jika ada 2 gambar atau lebih, terapkan efek
        if (images.length >= 2) {
            const imgBase = images[0]; // Gambar bawah (Hitam Putih)
            const imgHover = images[1]; // Gambar atas (Berwarna)

// Saat Mouse Masuk
            frame.addEventListener('mouseenter', () => {
                imgBase.style.filter = 'grayscale(100%) blur(5px)'; // Tambah blur pada gambar dasar
                imgBase.style.opacity = '0.3'; 
                imgHover.style.opacity = '1';
                imgHover.style.transform = 'scale(1.05)';
            });

// Saat Mouse Keluar
            frame.addEventListener('mouseleave', () => {
                imgBase.style.filter = 'grayscale(100%) blur(0px)';
                imgBase.style.opacity = '1';
                imgHover.style.opacity = '0';
                imgHover.style.transform = 'scale(1)';
            });
        }
    });


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

    const artCards = document.querySelectorAll('.art-card');
    artCards.forEach(card => {
        observer.observe(card);
    });
    
});

        const cursor = document.querySelector('.custom-cursor');

        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });

        // Efek membesar saat hover link atau gambar
        document.querySelectorAll('a, .image-frame').forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('cursor-hover'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('cursor-hover'));
        });

        document.addEventListener('DOMContentLoaded', () => {
            const banner = document.getElementById('cookie-banner');
            const btnAccept = document.getElementById('accept-cookie');
            const btnDecline = document.getElementById('decline-cookie');

    // Pastikan banner ada di HTML
    if (!banner) return; 

    // Fungsi Membaca Cookie
    function getCookie(nama) {
        let match = document.cookie.match(new RegExp('(^| )' + nama + '=([^;]+)'));
        if (match) return match[2];
        return "";
    }

    // Fungsi Membuat Cookie
    function setCookie(nama, nilai, hari) {
        let d = new Date();
        d.setTime(d.getTime() + (hari * 24 * 60 * 60 * 1000));
        document.cookie = nama + "=" + nilai + ";expires=" + d.toUTCString() + ";path=/";
    }

    // Cek apakah pengunjung sudah pernah klik
    let consentStatus = getCookie("void_cookie_consent");

    if (!consentStatus) {
        // Jika belum ada cookie, PUNCULKAN BANNER setelah 1 detik
        setTimeout(() => {
            banner.classList.add('show');
        }, 1000);
    }

// Aksi tombol ACCEPT
    if (btnAccept) {
        btnAccept.addEventListener('click', () => {
            setCookie("void_cookie_consent", "accepted", 30);
            banner.classList.remove('show');

            // --- KODE PELACAK GOOGLE ANALYTICS (ACCEPT) ---
            if (typeof gtag === 'function') {
                gtag('event', 'cookie_accepted', {
                    'event_category': 'Engagement',
                    'event_label': 'Cookie Banner'
                });
                console.log("Analytics: Pengunjung menekan ACCEPT");
            }
        });
    }

    // Aksi tombol DECLINE
    if (btnDecline) {
        btnDecline.addEventListener('click', () => {
            setCookie("void_cookie_consent", "declined", 30);
            banner.classList.remove('show');

            // --- KODE PELACAK GOOGLE ANALYTICS (DECLINE) ---
            if (typeof gtag === 'function') {
                gtag('event', 'cookie_declined', {
                    'event_category': 'Engagement',
                    'event_label': 'Cookie Banner'
                });
                console.log("Analytics: Pengunjung menekan DECLINE");
            }
        });
    }
}); // <-- Ini penutup document.addEventListener yang paling bawah
