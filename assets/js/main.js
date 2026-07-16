const allFrames = document.querySelectorAll('.frame-image');

(function(){
    var root = document.documentElement;
    var toggleBtn = document.getElementById('themeToggle');
    var themedImages = document.querySelectorAll('#heroFigure, .marquee-img');

    function applyThemeImage(img, theme){
      if (!img) return;
      var target = theme === 'dark' ? img.dataset.dark : img.dataset.light;
      var targetSrcset = theme === 'dark' ? img.dataset.darkSrcset : img.dataset.lightSrcset;
      if (!target || target === img.getAttribute('src')) return;

      var probe = new Image();
      probe.onload = function(){
        img.src = target;
        if (targetSrcset) { img.srcset = targetSrcset; }
      };
      probe.onerror = function(){
        if (theme === 'dark') {
          console.warn('Gambar dark mode belum ditemukan di: ' + target + '. Menampilkan versi light sebagai fallback.');
        }
      };
      probe.src = target;
    }

    function applyThemeImages(theme){
      themedImages.forEach(function(img){ applyThemeImage(img, theme); });
    }

    function setTheme(theme){
      root.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      applyThemeImages(theme);
    }

    applyThemeImages(root.getAttribute('data-theme') || 'light');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', function(){
        var current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        setTheme(current === 'dark' ? 'light' : 'dark');
      });
    }
  })();

allFrames.forEach(frame => {
    const images = frame.querySelectorAll('img');

    if (images.length >= 2) {
        const imgBase = images[0]; 
        const imgHover = images[1];

        imgBase.style.transition = 'opacity 0.3s ease';
        imgHover.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

        frame.addEventListener('mouseenter', () => {
            imgBase.style.opacity = '0'; 
            imgHover.style.opacity = '1';
            
            imgHover.style.transform = 'scale(1.05)'; 
        });

        frame.addEventListener('mouseleave', () => {
            imgBase.style.opacity = '1'; 
            imgHover.style.opacity = '0'; 
            imgHover.style.transform = 'scale(1)'; 
        });
    }
});

  function adjustStickyStack() {
    const sections = document.querySelectorAll('.about, .work, .gallery, .contact');
    const windowHeight = window.innerHeight;

    // READ phase: measure all sections first (no writes in between)
    const heights = Array.from(sections).map(sec => sec.offsetHeight);

    // WRITE phase: apply all style changes after measuring is done
    sections.forEach((sec, i) => {
      const height = heights[i];
      if (height > windowHeight) {
        sec.style.top = `-${height - windowHeight}px`;
      } else {
        sec.style.top = '0px';
      }
    });
  }

  const resizeObserver = new ResizeObserver(adjustStickyStack);
  document.querySelectorAll('.about, .work, .gallery, .contact').forEach(sec => {
    resizeObserver.observe(sec);
  });
  window.addEventListener('resize', adjustStickyStack, { passive: true });

  window.addEventListener('load', adjustStickyStack);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(adjustStickyStack);
  }

  document.querySelectorAll('.nav-links a, .skip-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetSection = document.querySelector(targetId);

      if (targetSection) {
        const targetY = targetSection.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      }
    });
  });

  document.querySelector('.back-to-top').addEventListener('click', function(e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.querySelector('.about').addEventListener('click', function(e) {
    e.preventDefault();
    window.scrollTo({ top: 1, behavior: 'smooth' });
  });

  const navSections = document.querySelectorAll('.about, .work, .gallery, .contact');
  const navLinks = document.querySelectorAll('.nav-links a');

  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.getAttribute('id');
      navLinks.forEach(link => {
        const isActive = link.getAttribute('href') === `#${id}`;
        link.style.opacity = isActive ? '1' : '0.5';
        link.style.fontWeight = isActive ? '700' : '400';
      });
    });
  }, {
    rootMargin: '-45% 0px -45% 0px',
    threshold: 0
  });

  navSections.forEach(sec => navObserver.observe(sec));

  // Contact form -> opens WhatsApp with a pre-filled message.
  // This is a static site (no backend), so this is the delivery method.
  const WHATSAPP_NUMBER = '6282223517367'; // 082223517367 in international format

  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const nameInput = document.getElementById('cf-name');
      const emailInput = document.getElementById('cf-email');
      const messageInput = document.getElementById('cf-message');
      const note = document.getElementById('cf-note');

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const message = messageInput.value.trim();

      if (!name || !email || !message) {
        note.textContent = 'Mohon isi semua field dulu, ya.';
        return;
      }

      const text =
        `Halo Wahyu, perkenalkan saya ${name}.\n` +
        `Email: ${email}\n\n` +
        `Pesan:\n${message}`;

      const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

      note.textContent = 'Membuka WhatsApp...';
      window.open(waUrl, '_blank', 'noopener');
    });
  }