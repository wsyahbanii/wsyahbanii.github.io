document.addEventListener('DOMContentLoaded', () => {

    const loader = document.querySelector('.loader');
    if (loader) {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => { loader.style.display = 'none'; }, 500);
        }, 800);
    }

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

    const observerOptions = { threshold: 0.15 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) { entry.target.classList.add('visible'); }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal-element').forEach(el => observer.observe(el));

    const cursor = document.querySelector('.custom-cursor');
    if (cursor) {
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });

        document.querySelectorAll('a, .image-frame, button, input, textarea, .cover-wrapper').forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('cursor-hover'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('cursor-hover'));
        });
    }

    const contactForm = document.getElementById('contactForm');
    const btnSubmit = document.getElementById('btnSubmit');
    const successPopup = document.getElementById('successPopup');
    const closePopup = document.getElementById('closePopup');

    if (contactForm && btnSubmit) {
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const originalText = btnSubmit.innerText;
            btnSubmit.innerText = "MENGIRIM...";
            btnSubmit.disabled = true;

            emailjs.sendForm('service_3ex2tct', 'template_a7hclel', this)
                .then(() => {
                    if (successPopup) successPopup.classList.add('show');
                    contactForm.reset();
                }, (error) => {
                    alert("TRANSMISSION FAILED: " + JSON.stringify(error));
                })
                .finally(() => {
                    btnSubmit.innerText = originalText;
                    btnSubmit.disabled = false;
                });
        });
    }

    if (closePopup && successPopup) {
        closePopup.addEventListener('click', () => successPopup.classList.remove('show'));
    }
});
