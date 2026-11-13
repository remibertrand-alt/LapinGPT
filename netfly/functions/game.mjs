import {clients,json} from "./_shared.mjs";
export default async req=>{
 if(req.method!=="POST")return json({error:"Méthode non autorisée."},405);
 try{
  const {admin,user}=await clients(req);if(!user)return json({error:"Connecte-toi."},401);
  const {action,skinId}=await req.json();
  if(action==="buy"){
   const {data,error}=await admin.rpc("purchase_skin",{p_user_id:user.id,p_skin_id:skinId});
   if(error)throw error;return json({ok:true,message:"Skin acheté !"});
  }
  if(action==="equip"){
   const {data,error}=await admin.rpc("equip_skin",{p_user_id:user.id,p_skin_id:skinId});
   if(error)throw error;return json({ok:true});
  }
  return json({error:"Action inconnue."},400);
 }catch(e){return json({error:e.message||"Action impossible."},400)}
};
