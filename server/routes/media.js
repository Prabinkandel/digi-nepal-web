const router=require('express').Router();
const Media=require('../models/Media'),User=require('../models/User'),Product=require('../models/Product'),Setting=require('../models/Setting');
const access=require('../middleware/access');
const {query,page,searchFilter,id,fail}=require('../utils/validation');
router.get('/',access('admin','editor'),async(req,res)=>{
 const q=query(req);res.json(await page(Media,{purpose:'catalog',is_active:q.status==='archived'?0:1,...searchFilter(q.search,['name'])},q,'-data -_id -__v'));
});
router.get('/:id',async(req,res)=>{
 const mediaId=id.parse(req.params.id);
 const media=await Media.findOne({id:mediaId,is_active:1}).select('+data');
 if(!media)fail(404,'Image not found.');
 if(media.purpose==='receipt'){
  const isPublic=await Product.exists({image_url:{$regex:media.id}})||await Setting.exists({value:{$regex:media.id}});
  if(isPublic){
   media.purpose='catalog';
   await Media.updateOne({id:media.id},{purpose:'catalog'});
  }else{
   if(!req.session.userId)fail(401,'Please sign in to view this receipt.');
   const user=await User.findOne({id:req.session.userId});
   if(!user||user.is_active!==1||(user.auth_version||0)!==req.session.authVersion||Date.now()-req.session.signedInAt>8*60*60*1000)fail(401,'Please sign in again.');
   if(user.id!==media.owner_id){
    if(user.role!=='admin')fail(404,'Image not found.');
    req.user=user;
    const guards=access('admin');
    await new Promise((resolve,reject)=>guards[1](req,res,e=>e?reject(e):resolve()));
    if(res.headersSent)return;
   }
  }
 }
 res.set({'Content-Type':media.mime,'Cache-Control':media.purpose==='receipt'?'private, no-store':'public, max-age=86400, stale-while-revalidate=604800','Content-Disposition':'inline; filename="image.webp"','X-Content-Type-Options':'nosniff'}).send(media.data);
});
router.delete('/:id',access('admin','editor'),async(req,res)=>{
 const media=await Media.findOneAndUpdate({id:id.parse(req.params.id),purpose:'catalog'},{is_active:0});
 if(!media)fail(404,'Image not found.');res.json({message:'Image archived.'});
});
router.post('/:id/restore',access('admin','editor'),async(req,res)=>{
 const media=await Media.findOneAndUpdate({id:id.parse(req.params.id),purpose:'catalog'},{is_active:1});
 if(!media)fail(404,'Image not found.');res.json({message:'Image restored.'});
});
module.exports=router;
