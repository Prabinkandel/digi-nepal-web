const router=require('express').Router();
const multer=require('multer'),sharp=require('sharp');
const {randomUUID}=require('node:crypto');
const auth=require('../middleware/auth'),access=require('../middleware/access'),limit=require('../middleware/limits');
const Media=require('../models/Media');
const {fail}=require('../utils/validation');
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:2,parts:3}});
router.post('/',auth,limit('uploads',30,3600,req=>req.user.id),upload.single('image'),async(req,res)=>{
 if(!req.file)fail(400,'Choose a PNG, JPEG, or WebP image up to 5 MB.');
 const purpose=req.body.purpose||'receipt';
 if(!['catalog','receipt'].includes(purpose))fail(400,'Invalid upload purpose.');
 if(purpose==='catalog'){
  const guards=access('admin','editor');
  await new Promise((resolve,reject)=>guards[1](req,res,e=>e?reject(e):resolve()));
  if(res.headersSent)return;
 }
 const file=req.file;
 if(!['image/jpeg','image/png','image/webp'].includes(file.mimetype))fail(400,'Use a PNG, JPEG, or WebP image.');
 let output;
 try{
  const pipeline=sharp(file.buffer,{limitInputPixels:20000000,failOn:'error'});
  const meta=await pipeline.metadata();
  if(!['png','jpeg','webp'].includes(meta.format)||(meta.pages||1)>1)fail(400,'Use a single-frame PNG, JPEG, or WebP image.');
  output=await pipeline.rotate().resize({width:1800,height:1800,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
 }catch{fail(400,'The image could not be read. Choose a valid PNG, JPEG, or WebP file.');}
 if(output.length>2*1024*1024)fail(400,'Image is too detailed. Choose a smaller image.');
 const media=await Media.create({id:randomUUID(),owner_id:req.user.id,purpose,name:String(file.originalname).replace(/[^a-zA-Z0-9 ._-]/g,'').slice(0,100)||'Image',data:output,mime:'image/webp',size:output.length});
 res.status(201).json({id:media.id,url:'/api/media/'+media.id,name:media.name});
});
module.exports=router;
