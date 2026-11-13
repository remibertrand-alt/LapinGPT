import {clients,json,adminOk} from "./_shared.mjs";
export default async req=>{
 if(req.method!=="POST")return json({error:"Méthode non autorisée."},405);
 try{
  const body=await req.json();if(!adminOk(body))return json({error:"Mot de passe créateur incorrect."},401);
  const {admin}=await clients(req);
  if(body.action==="dashboard"){
   const [{data:profiles,error:pErr},{data:authData,error:aErr}]=await Promise.all([
    admin.from("profiles").select("id,username,coins,created_at").order("created_at",{ascending:false}).limit(500),
    admin.auth.admin.listUsers({page:1,perPage:500})
   ]);
   if(pErr)throw pErr;if(aErr)throw aErr;
   const emails=new Map((authData.users||[]).map(u=>[u.id,u.email]));
   return json({users:(profiles||[]).map(p=>({...p,email:emails.get(p.id)||""}))});
  }
  if(body.action==="publish-skin"){
   const s=body.skin||{};
   if(!s.name?.trim()||!["Commun","Légendaire"].includes(s.rarity)||!Number.isInteger(s.price)||s.price<0||s.price>1000000)return json({error:"Informations de skin invalides."},400);
   if(s.rarity==="Commun"&&s.price>200)return json({error:"Un skin commun doit coûter au maximum 200 pièces."},400);
   if(s.rarity==="Légendaire"&&s.price<201)return json({error:"Un skin légendaire doit coûter au minimum 201 pièces."},400);
   const id=crypto.randomUUID();
   const {error}=await admin.from("skins").insert({id,name:s.name.trim().slice(0,40),emoji:String(s.emoji||"🐰").slice(0,8),rarity:s.rarity,price:s.price,description:String(s.description||"").slice(0,160),theme:["base","sunny","royal"].includes(s.theme)?s.theme:"base",published:true});
   if(error)throw error;return json({ok:true});
  }
  if(body.action==="publish-event"){
   if(!body.title?.trim()||!body.body?.trim())return json({error:"Ajoute un titre et une description."},400);
   const {error}=await admin.from("events").insert({title:body.title.trim().slice(0,100),body:body.body.trim().slice(0,2000),published:true});
   if(error)throw error;return json({ok:true});
  }
  return json({error:"Action inconnue."},400);
 }catch(e){return json({error:e.message||"Erreur serveur."},500)}
};