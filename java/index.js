                //tombol show more
                var div1 = document.getElementById("row1");
                var display = 0;
        
                function hideRow(){
                    if (display == 1){
                        div1.style.display="block";
                        display=0;
                    }
                    else {
                        div1.style.display= "none";
                        display=1;
                    }
                }
                var button1 = document.getElementById("tombol1");
                var display = 0;
        
                function hideButton(){
                    if (display == 1){
                        button1.style.display="none";
                        display=0;
                    }
                    else {
                        button1.style.display= "block";
                        display=1;
                    }
                }
                var button2 = document.getElementById("tombol2").style.display="none";
                var display = 0;

                function showButton(){
                    if (display == 1){
                        button2.style.display="none";
                        display=0;
                    }
                    else {
                        button2.style.display= "block";
                        display=1;
                    }
                }
                //tombol show less
                var div1 = document.getElementById("row1");
                var display = 0;

                function fungsi1(){
                    if(display==1){
                        div1.style.display="block"
                        display=0;
                    }
                    else{
                        div1.style.display="none"
                        display=1;
                    }
                }
                var button1 =document.getElementById("tombol1");
                var display=0;

                function fungsi2(){
                    if(display==1){
                        button1.style.display="none"
                        display=0;
                    }
                    else{
                        button1.style.display="block"
                        display=1;
                    }
                }
                var button2=document.getElementById('tombol2');
                var display=0;

                function fungsi3(){
                    if(display==1){
                        button2.style.display="none";
                        display=0;
                    }
                    else{
                        button2.style.display="block";
                        display=1;
                    }
                }
                var div2 = document.getElementById("menu");
                var display = 0;
                function hideButton2(){
                    if (display == 1){
                        div2.style.display="block";
                        display=0;
                    }
                    else {
                        div2.style.display= "none";
                        display=1;
                    }
                }
                function openNav() {
                    document.getElementById("myNav").style.height = "100%";
                  }


                var div2 = document.getElementById("menu");
                var display = 0;

                function showButton2(){
                    if (display == 1){
                        div2.style.display="block";
                        display=0;
                    }   
                    else {
                        div2.style.display= "none";
                        display=1;
                    }
                }
                  
                function closeNav() {
                    document.getElementById("myNav").style.height = "0%";
                  }

// Terjemahan
const translations = {
    id: {
        title: "Wahyu Syahbani",
        intro1: "Saya adalah mahasiswa semester 3 Program Studi Teknik Informatika di Universitas Pamulang yang aktif. Saat ini, saya sedang menjelajahi dunia pemrograman, teknologi, dan desain grafis.",
        intro2: "Dengan latar belakang pendidikan Teknik Komputer dan Jaringan, serta pengalaman kerja di bidang teknisi dan logistik, saya terbiasa bekerja secara teliti, belajar dengan cepat, dan mampu bekerja sama dalam tim.",
        intro3: "Saya membuat website ini sebagai media untuk membagikan karya, dokumentasi pembelajaran, dan tempat berkembang bersama teknologi.",
        showMore: "Tampilkan Lebih Banyak",
        showLess: "Tampilkan Lebih Sedikit"
    },
    en: {
        title: "Wahyu Syahbani",
        intro1: "I am an active 3rd semester student of Informatics Engineering Study Program at Pamulang University. Currently, I am exploring the world of programming, technology, and graphic design.",
        intro2: "An educational background in Computer and Network Engineering, as well as work experience in the field of technicians and logistics, I am accustomed to working carefully, learning quickly, and being able to work together in a team.",
        intro3: "I created this website as a medium to share my work, documentation of learning, and a place to develop with technology.",
        showMore: "Show More",
        showLess: "Show Less"
    }
};

// Fungsi ganti bahasa
function changeLanguage(lang) {
    // Simpan pilihan bahasa
    localStorage.setItem('language', lang);
    
    // Terapkan terjemahan
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (translations[lang] && translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });

    // Ganti teks tombol jika ada
    const btn1 = document.getElementById('tombol1');
    const btn2 = document.getElementById('tombol2');
    if (btn1) btn1.textContent = translations[lang].showMore;
    if (btn2) btn2.textContent = translations[lang].showLess;
}

// Muat bahasa saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('language') || 'en'; // default: Inggris
    changeLanguage(savedLang);
});     