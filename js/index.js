// Semua kode akan dijalankan setelah HTML selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
    
    /* =========================================
       1. AUTO HOVER FADE (GENERIC SYSTEM)
       Berlaku untuk SEMUA .image-frame yang memiliki 2 gambar
       ========================================= */
    const allFrames = document.querySelectorAll('.image-frame');

    allFrames.forEach(frame => {
        const images = frame.querySelectorAll('img');

        if (images.length >= 2) {
            const imgBase = images[0]; // Gambar bawah (Hitam Putih)
            const imgHover = images[1]; // Gambar atas (Berwarna)

            // Saat Mouse Masuk
            frame.addEventListener('mouseenter', () => {
                imgBase.style.filter = 'grayscale(100%) blur(5px)'; 
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

    /* =========================================
       3. CUSTOM CURSOR
       ========================================= */
    const cursor = document.querySelector('.custom-cursor');
    
    if (cursor) {
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });

        // Efek membesar saat hover link, gambar, atau tombol cookie
        document.querySelectorAll('a, .image-frame, button').forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('cursor-hover'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('cursor-hover'));
        });
    }

    /* =========================================
       4. COOKIE CONSENT BANNER (GOT IT ONLY)
       ========================================= */
    const banner = document.getElementById('cookie-banner');
    const btnGotIt = document.getElementById('got-it-cookie');

    if (banner) {
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

        // Aksi tombol GOT IT
        if (btnGotIt) {
            btnGotIt.addEventListener('click', () => {
                setCookie("void_cookie_consent", "accepted", 30);
                banner.classList.remove('show');

                // --- KODE PELACAK GOOGLE ANALYTICS ---
                if (typeof gtag === 'function') {
                    gtag('event', 'cookie_accepted', {
                        'event_category': 'Engagement',
                        'event_label': 'Cookie Banner - Got It'
                    });
                    console.log("Analytics: Pengunjung menekan GOT IT");
                }
            });
        }
    }
}); // <-- Penutup UTAMA document.addEventListener
