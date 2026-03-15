(function(){
  var signIn=document.getElementById('sign-in-link'),avatarBtn=document.getElementById('avatar-btn'),dropdown=document.getElementById('avatar-dropdown'),loggedIn=false;
  try{if(localStorage.getItem('catalyst_token')){loggedIn=true}else{var s=localStorage.getItem('catalyst_session');if(s){var d=JSON.parse(s);if(d&&d.access_token)loggedIn=true}}}catch(e){}
  if(loggedIn){if(signIn)signIn.style.display='none';if(avatarBtn)avatarBtn.style.display='flex'}
  if(avatarBtn)avatarBtn.addEventListener('click',function(e){e.stopPropagation();dropdown.classList.toggle('open')});
  document.addEventListener('click',function(){dropdown&&dropdown.classList.remove('open')});
  var signOut=document.getElementById('sign-out-btn');
  if(signOut)signOut.addEventListener('click',function(){localStorage.removeItem('catalyst_session');localStorage.removeItem('catalyst_token');localStorage.removeItem('catalyst_refresh_token');window.location.href='/'});
})();
