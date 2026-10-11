(function(){
  var FORM_ACTION='https://docs.google.com/forms/d/e/1FAIpQLSd8Zk9Rxsg292K8R_ttnRYa5d4uXMBkSFrnlEVTFts6feRx6g/formResponse';
  var ENTRY={company:'entry.1620407772',name:'entry.2140471957',email:'entry.417521654',message:'entry.1952858857'};
  var SOURCE='求人広告代理店メディア 記事内フォーム（saiyo-media.agent-best.net）';
  function ev(name,params){try{if(window.gtag)gtag('event',name,params||{});}catch(e){}}

  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('[data-cta]');
    if(a)ev('cta_click',{cta_location:a.getAttribute('data-cta'),page_path:location.pathname});
  });

  var forms=document.querySelectorAll('form[data-consult]');
  Array.prototype.forEach.call(forms,function(form){
    var box=form.parentNode, thanks=box.querySelector('.consult__thanks');
    var err=form.querySelector('.cf-err'), btn=form.querySelector('.cf-submit'), label=btn.textContent;
    var started=false;
    form.addEventListener('input',function(){if(!started){started=true;ev('form_start',{form_location:'article',page_path:location.pathname});}});
    form.addEventListener('submit',function(e){
      e.preventDefault();
      err.textContent='';
      var v=function(n){return (form.elements[n].value||'').trim();};
      var company=v('company'),name=v('name'),email=v('email'),message=v('message');
      if(!company||!name||!email){err.textContent='会社名・お名前・メールアドレスをご入力ください。';return;}
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){err.textContent='メールアドレスの形式をご確認ください。';return;}
      btn.disabled=true;btn.textContent='送信中...';
      var data=new FormData();
      data.append(ENTRY.company,company);
      data.append(ENTRY.name,name);
      data.append(ENTRY.email,email);
      data.append(ENTRY.message,(message||'（相談内容の記入なし）')
        +'\n\n興味のある媒体：'+form.getAttribute('data-media')
        +'\n読んでいた記事：'+form.getAttribute('data-title')+'\n'+location.origin+location.pathname
        +'\n\n---\nお問い合わせ元：'+SOURCE);
      fetch(FORM_ACTION,{method:'POST',mode:'no-cors',body:data})
        .then(function(){
          form.hidden=true;thanks.hidden=false;
          ev('generate_lead',{form_location:'article',article:form.getAttribute('data-from'),page_path:location.pathname});
          thanks.scrollIntoView({behavior:'smooth',block:'center'});
          var bar=document.querySelector('.sticky-cta');if(bar)bar.hidden=true;
        })
        .catch(function(){
          btn.disabled=false;btn.textContent=label;
          err.textContent='送信に失敗しました。お手数ですが、時間をおいて再度お試しください。';
        });
    });
  });

  /* 下部バー: 少し読み進めたら出し、相談ブロックが見えている間は隠す。閉じたらそのタブでは出さない */
  var bar=document.querySelector('.sticky-cta'), consult=document.getElementById('consult');
  if(bar&&consult){
    var closed=false;
    try{closed=sessionStorage.getItem('sticky-cta-closed')==='1';}catch(e){}
    /* 相談ブロックの上端が画面に入ったら（それ以降も）隠す。フッターにも被せない */
    var update=function(){
      var reached=consult.getBoundingClientRect().top<window.innerHeight;
      bar.hidden=closed||reached||window.scrollY<700;
    };
    window.addEventListener('scroll',update,{passive:true});
    window.addEventListener('resize',update);
    bar.querySelector('.sticky-cta__x').addEventListener('click',function(){
      closed=true;update();try{sessionStorage.setItem('sticky-cta-closed','1');}catch(e){}
    });
    update();
  }
})();
