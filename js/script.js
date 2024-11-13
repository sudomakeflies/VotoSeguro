
//Variaveis de visualizacao da tela para display & none
const votoPara = document.querySelector('.d-1 span');
const cargo = document.querySelector('.d-2 span');
const quadrados = document.querySelector('.d-3');
const descricao = document.querySelector('.d-4')
const mensagem = document.querySelector('.mensagem');
const nomeCandidato = document.querySelector('.nome-candidato');
const partidoPolitico = document.querySelector('.partido-politico');
const nomeVice = document.querySelector('.nome-vice');
const candidato = document.querySelector('.candidato');
const vice = document.querySelector('.candidato.small');
const rodape = document.querySelector('.rodape');

const votos = [];

var numeroDigitado = '';
var etapas = null;
var etapaAtual = 0;
var votoBranco = false;

/*
ajax('util/etapas.json', 'GET', (response) => {

    etapas = JSON.parse(response)
    console.log(etapas);
    comecarVotacao()
  
});*/

function comecarVotacao(){
  if (!localStorage.getItem("votos_personero01")){
    localStorage.setItem("votos_contralor01", 0);
    localStorage.setItem("votos_contralor02", 0);
    localStorage.setItem("votos_contralor03", 0);
    localStorage.setItem("votos_personero01", 0);
    localStorage.setItem("votos_personero02", 0);
    localStorage.setItem("votos_personero03", 0);
    localStorage.setItem("votos_en_blanco_p", 0);
    localStorage.setItem("votos_en_blanco_c", 0);
    localStorage.setItem("votos_invalidos_p", 0);
    localStorage.setItem("votos_invalidos_c", 0);
    }
    
 
    //let etapa = etapas[etapaAtual];

    numeroDigitado = ''
    votoEmBranco = false
  
    quadrados.style.display = 'block'
    quadrados.innerHTML = ''
    votoPara.style.display = 'none'
    candidato.style.display = 'none'
    //vice.style.display = 'none'
    descricao.style.display = 'none'
    mensagem.style.display = 'none'
    //nomeCandidato.style.display = 'none'
    //partidoPolitico.style.display = 'none'
    //nomeVice.style.display = 'none'
    rodape.style.display = 'none'
  
    for (let i = 0; i < 2; i++) {
        let pisca = i == 0 ? ' pisca' : ''
     
     if(i === 0){
        quadrados.innerHTML += `
        <div class="quadrado${pisca}"></div>
      `
     }else{
        quadrados.innerHTML += `
        <div class="quadrado"></div>
      ` 
     }
       
    }

    cargo.innerHTML = "Esperando su voto para personero...";

}

function actualizarInterface(){

    console.log('Numero Digitado', numeroDigitado);
    localStorage.setItem("voto", numeroDigitado);

    let etapa = etapas[etapaAtual]
  let candidato = null

  for (let num in etapa['candidatos']) {
    if (num == numeroDigitado) {
      candidato = etapa['candidatos'][num]
      break
    }
  }

  console.log('Candidato: ' + candidato)
    
}




function clicou(n) {
  console.log("CLICKED...");

    let elNumero = document.querySelector('.pisca')

    if(elNumero !== null){
        elNumero.innerHTML = n;
        numeroDigitado = `${numeroDigitado}${n}`;

        elNumero.classList.remove('pisca');
    
        if(elNumero.nextElementSibling !== null){
            elNumero.nextElementSibling.classList.add('pisca');
        }else{
            actualizarInterface();
        }
      
    }
}

function confirme(){
  let url = window.location.href;
  let aurl = url.split("/"); 
  let fname = aurl[aurl.length-1];
  alert("Su voto ha sido procesado...");
  if (fname == "index.html"){
    switch (localStorage.getItem("voto")) {
      case "01":
        var votos_personero01 = parseInt(localStorage.getItem("votos_personero01"));
        localStorage.setItem("votos_personero01", ++votos_personero01);
        localStorage.setItem("voto", " ");
        break;
      case "02":
        var votos_personero02 = parseInt(localStorage.getItem("votos_personero02"));
        localStorage.setItem("votos_personero02", ++votos_personero02);
        localStorage.setItem("voto", " ");
        break;
      case "03":
        var votos_personero03 = parseInt(localStorage.getItem("votos_personero03"));
        localStorage.setItem("votos_personero03", ++votos_personero03);
        localStorage.setItem("voto", " ");
        break;
      default:
        var votos_invalidos_p = parseInt(localStorage.getItem("votos_invalidos_p"));
        localStorage.setItem("votos_invalidos_p", ++votos_invalidos_p);
        localStorage.setItem("voto", " ");
        break;        
    }
    window.open("index2.html","_self");
  }
    else{
      switch (localStorage.getItem("voto")) {
      case "01":
        var votos_contralor01 = parseInt(localStorage.getItem("votos_contralor01"));
        localStorage.setItem("votos_contralor01", ++votos_contralor01);
        localStorage.setItem("voto", " ");
        break;
      
      case "02":
        var votos_contralor02 = parseInt(localStorage.getItem("votos_contralor02"));
        localStorage.setItem("votos_contralor02", ++votos_contralor02);
        localStorage.setItem("voto", " ");
        break;
      
      case "03":
        var votos_contralor03 = parseInt(localStorage.getItem("votos_contralor03"));
        localStorage.setItem("votos_contralor03", ++votos_contralor03);
        localStorage.setItem("voto", " ");
        break;
      default:
          var votos_invalidos_c = parseInt(localStorage.getItem("votos_invalidos_c"));
          localStorage.setItem("votos_invalidos_c", ++votos_invalidos_c);
          localStorage.setItem("voto", " "); 
          break;        
      }
      window.open("index.html","_self");
    }
  
  /*document.getElementById("personero").style.visibility = "hidden";
  console.log("confirmado...");
  if (document.getElementById("contralor").style.visibility == "visible"){
    location.reload();
  }
  document.getElementById("contralor").style.visibility = "visible";
  document.getElementById("fcontralor").style.display = "block";
  document.getElementById("fpersonero").style.display = "none";*/ 

}

function corrige(){
  console.log("corregir...");
  /*let elNumero = document.getElementsByClassName('quadrado');
  l = elNumero.length;
  for (i=0; i<l; i++){
    elNumero[i].innerHTML = " ";
  }*/
  location.reload();
}

function votoenblanco(){
  let url = window.location.href;
  let aurl = url.split("/"); 
  let fname = aurl[aurl.length-1];
  if (fname == "index.html"){
    var votos_en_blanco_p = parseInt(localStorage.getItem("votos_en_blanco_p"));
    localStorage.setItem("votos_en_blanco_p", ++votos_en_blanco_p);      
    window.open("index2.html","_self");  
  }else{
    var votos_en_blanco_c = parseInt(localStorage.getItem("votos_en_blanco_c"));
    localStorage.setItem("votos_en_blanco_c", ++votos_en_blanco_c);  
    window.open("index.html","_self");      
  }
}

function resultados(){
  alert('Los resultados para personero son:\n Candidato 01: ' 
  + localStorage.getItem("votos_personero01") 
  + '\n Candidato 02: ' + localStorage.getItem("votos_personero02")
  + '\n Candidato 03: ' + localStorage.getItem("votos_personero03")
  + '\n Nulos: ' + localStorage.getItem("votos_invalidos_p")
  + ' En blanco: ' + localStorage.getItem("votos_en_blanco_p")
  + '\n' +
  'Los resultados para contralor son:\n Candidato 01: ' 
  + localStorage.getItem("votos_contralor01") 
  + '\n Candidato 02: ' + localStorage.getItem("votos_contralor02")
  + '\n Candidato 03: ' + localStorage.getItem("votos_contralor03")
  + '\n Nulos: ' + localStorage.getItem("votos_invalidos_c")
  + ' En blanco: ' + localStorage.getItem("votos_en_blanco_c")
  + '\n');
}

function clean_data(){
  //localStorage.clear();
  for (let i = 0; i < localStorage.length; i++) {
    let key = localStorage.key(i);
    localStorage.setItem(key, 0);
  }  
  alert("Se han limpiado los datos previamente guardados...");
}
