const router=require('express').Router();
const Setting=require('../models/Setting');
const admin=require('../middleware/adminAuth');
const {z,fail}=require('../utils/validation');
const {schemas,getSettings}=require('../utils/settings');
router.get('/',async(req,res)=>res.json(await getSettings()));
router.put('/',admin,async(req,res)=>{
 const data=z.record(z.string(),z.string()).parse(req.body);
 if(Object.keys(data).length>30)fail(400,'Too many settings.');
 const updates=[];
 for(const [key,value]of Object.entries(data)){
  if(!schemas[key])fail(400,'Unknown setting: '+key);
  updates.push({key,value:schemas[key].parse(value)});
 }
 await require('mongoose').connection.transaction(async session=>{for(const item of updates)await Setting.findOneAndUpdate({key:item.key},{value:item.value},{upsert:true,session});});
 res.json(await getSettings());
});
router.post('/',admin,async(req,res)=>{
 const {key,value}=z.object({key:z.string(),value:z.string()}).strict().parse(req.body);
 if(!schemas[key])fail(400,'Unknown setting.');
 await Setting.findOneAndUpdate({key},{value:schemas[key].parse(value)},{upsert:true});
 res.json(await getSettings());
});
module.exports=router;
