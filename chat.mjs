import {clients,json} from "./_shared.mjs";
export default async req=>{
 if(req.method!=="POST")return json({error:"Méthode non autorisée."},405);
 if(!process.env.OPENAI_API_KEY)return json({error:"Le service IA n’est pas configuré : ajoute OPENAI_API_KEY dans Netlify."},503);
 try{
  const {admin,user}=await clients(req);if(!user)return json({error:"Connecte-toi pour discuter avec ton lapin."},401);
  const {message,history=[]}=await req.json();
  if(typeof message!=="string"||!message.trim()||message.length>4000)return json({error:"Question invalide."},400);
  const messages=[{role:"system",content:"Tu es Lapin GPT, un adorable lapin sympathique, positif et serviable. Réponds en français par défaut, clairement et naturellement. Tu peux utiliser quelques emojis lapin, sans en abuser."},...history.filter(x=>["user","assistant"].includes(x.role)&&typeof x.content==="string").slice(-8),{role:"user",content:message.trim()}];
  const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-4o-mini",messages,max_tokens:800})});
  const d=await r.json();if(!r.ok)return json({error:d.error?.message||"Erreur du service IA."},502);
  const reply=d.choices?.[0]?.message?.content||"Je n’ai pas trouvé mes mots.";
  const {error:rewardError}=await admin.rpc("award_question_coins",{p_user_id:user.id,p_amount:5});
  if(rewardError)return json({error:"Réponse reçue, mais impossible d’enregistrer les pièces. Contacte le créateur."},500);
  return json({reply,coins_awarded:5});
 }catch(e){return json({error:e.message||"Erreur serveur."},500)}
};