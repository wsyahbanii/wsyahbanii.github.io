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
