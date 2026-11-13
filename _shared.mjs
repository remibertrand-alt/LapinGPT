import { createClient } from "@supabase/supabase-js";
export const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
export function adminOk(body){return !!process.env.CREATOR_PASSWORD && body.password===process.env.CREATOR_PASSWORD;}
export async function clients(req){
 const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key) throw new Error("Supabase serveur n’est pas configuré.");
 const admin=createClient(url,key,{auth:{persistSession:false}});
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token) return {admin,user:null};
 const {data,error}=await admin.auth.getUser(token);
 if(error||!data.user) return {admin,user:null};
 return {admin,user:data.user};
}
