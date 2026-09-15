const router=require('express').Router();
const {randomUUID}=require('node:crypto');
const auth=require('../middleware/auth'),admin=require('../middleware/adminAuth'),limit=require('../middleware/limits');
const {z,id,text,fail,query,page,searchFilter}=require('../utils/validation');
const Payment=require('../models/Payment'),Order=require('../models/Order'),Media=require('../models/Media'),User=require('../models/User');
const database=require('mongoose').connection;
const unsupportedTransaction=error=>/Transaction numbers are only allowed|replica set|transactions are not supported/i.test(String(error?.message||''));
async function submitPayment(data,media,userId){
 const fallback=async()=>{const paymentId=randomUUID();const order=await Order.findOneAndUpdate({id:data.order_id,user_id:userId,status:'pending',payment_id:null},{$set:{payment_id:paymentId}},{returnDocument:'after'});if(!order)fail(409,'This order already has a payment or is no longer pending.');try{const [record]=await Payment.create([{...data,id:paymentId,user_id:userId,product_name:order.product_name,amount:order.price,screenshot_url:'/api/media/'+media.id,dedupe_key:data.payment_method.toLowerCase()+':'+data.transaction_id.toLowerCase().replace(/\s+/g,'')}]);return record;}catch(error){await Order.updateOne({id:order.id,payment_id:paymentId},{$set:{payment_id:null}});throw error;}};
 try{return await database.transaction(async session=>{const order=await Order.findOne({id:data.order_id,user_id:userId}).session(session);if(!order)fail(404,'Order not found.');if(order.status!=='pending'||order.payment_id)fail(409,'This order already has a payment or is no longer pending.');const paymentId=randomUUID();const [record]=await Payment.create([{...data,id:paymentId,user_id:userId,product_name:order.product_name,amount:order.price,screenshot_url:'/api/media/'+media.id,dedupe_key:data.payment_method.toLowerCase()+':'+data.transaction_id.toLowerCase().replace(/\s+/g,'')}],{session});order.payment_id=paymentId;await order.save({session});return record;});}catch(error){if(unsupportedTransaction(error))return fallback();throw error;}
}
router.post('/',auth,limit('payments',15,3600,req=>req.user.id),async(req,res)=>{
 const data=z.object({order_id:id,payer_name:text(100).min(2),transaction_id:text(100).min(3).regex(/^[a-zA-Z0-9 _-]+$/),payment_method:text(40).min(2),phone:text(40).default(''),note:text(1000).default(''),media_id:id}).strict().parse(req.body);
 const settings=await require('../utils/settings').getSettings();
 if(!settings.payment_methods.split(',').map(s=>s.trim()).includes(data.payment_method))fail(400,'Choose an available payment method.');
 const media=await Media.findOne({id:data.media_id,owner_id:req.user.id,purpose:'receipt',is_active:1});
 if(!media)fail(400,'Upload a receipt belonging to your account.');
 const payment=await submitPayment(data,media,req.user.id);
 res.status(201).json({payment_id:payment.id,message:'Receipt saved. Payment is awaiting manual verification.'});
});
router.get('/my',auth,async(req,res)=>res.json(await page(Payment,{user_id:req.user.id},query(req))));
router.get('/all',admin,async(req,res)=>{
 const q=query(req),filter={...searchFilter(q.search,['transaction_id','product_name','payer_name'])};
 if(q.status)filter.status=z.enum(['pending','verified','rejected']).parse(q.status);
 const result=await page(Payment,filter,q);
 const users=await User.find({id:{$in:result.items.map(p=>p.user_id)}}).select('id name email').lean();
 result.items=result.items.map(p=>({...p,user_email:users.find(u=>u.id===p.user_id)?.email||''}));res.json(result);
});
router.put('/:id/status',admin,async(req,res)=>{
 const data=z.object({status:z.enum(['verified','rejected']),admin_note:text(1000).default('')}).strict().parse(req.body);
 const result=await require('mongoose').connection.transaction(async session=>{
  const payment=await Payment.findOne({id:id.parse(req.params.id)}).session(session);
  if(!payment)fail(404,'Payment not found.');
  if(payment.status!=='pending')fail(409,'This payment has already been reviewed.');
  const order=await Order.findOne({id:payment.order_id,user_id:payment.user_id}).session(session);
  if(!order||order.status!=='pending'||payment.amount!==order.price)fail(409,'The payment does not match a pending order. Resolve the legacy record before proceeding.');
  payment.status=data.status;payment.admin_note=data.admin_note;await payment.save({session});
  order.status=data.status==='verified'?'verified':'pending';order.payment_id=data.status==='verified'?payment.id:null;
  await order.save({session});return payment;
 });
 res.json(result);
});
module.exports=router;
