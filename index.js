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
