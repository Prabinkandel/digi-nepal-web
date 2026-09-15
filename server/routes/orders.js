const router=require('express').Router();
const {randomUUID}=require('node:crypto');
const auth=require('../middleware/auth'),admin=require('../middleware/adminAuth'),limit=require('../middleware/limits');
const {z,id,text,fail,query,page,searchFilter}=require('../utils/validation');
const Order=require('../models/Order'),Product=require('../models/Product'),User=require('../models/User'),Payment=require('../models/Payment');
const {decorate}=require('../utils/catalog');
router.post('/',auth,limit('orders',20,3600,req=>req.user.id),async(req,res)=>{
 const data=z.object({product_id:id,request_key:z.string().uuid()}).strict().parse(req.body);
 const existing=await Order.findOne({request_key:data.request_key,user_id:req.user.id}).lean();
 if(existing)return res.json(existing);
 const product=await Product.findOne({id:data.product_id,is_active:1}).lean();
 if(!product)fail(404,'This product is unavailable.');
 const current=(await decorate([product]))[0];
 const order=await Order.create({id:randomUUID(),user_id:req.user.id,product_id:product.id,product_name:product.name,price:current.price,status:'pending',request_key:data.request_key});
 res.status(201).json(order);
});
router.get('/my',auth,async(req,res)=>res.json(await page(Order,{user_id:req.user.id},query(req))));
router.get('/all',admin,async(req,res)=>{
 const q=query(req);const filter={...searchFilter(q.search,['product_name','id'])};
 if(q.status)filter.status=z.enum(['pending','verified','rejected','delivered']).parse(q.status);
 const result=await page(Order,filter,q);
 const users=await User.find({id:{$in:result.items.map(o=>o.user_id)}}).select('id name email').lean();
 result.items=result.items.map(o=>({...o,user_name:users.find(u=>u.id===o.user_id)?.name||'Unknown',user_email:users.find(u=>u.id===o.user_id)?.email||''}));
 res.json(result);
});
router.put('/:id/status',admin,async(req,res)=>{
 const data=z.object({status:z.enum(['rejected','delivered']),note:text(1000).default('')}).strict().parse(req.body);
 const orderId=id.parse(req.params.id);
 const order=await require('mongoose').connection.transaction(async session=>{
  const current=await Order.findOne({id:orderId}).session(session);
  if(!current)fail(404,'Order not found.');
  const valid=data.status==='delivered'?current.status==='verified':current.status==='pending';
  if(!valid)fail(409,'This order status changed. Refresh and try again.');
  if(data.status==='rejected'&&await Payment.exists({order_id:current.id,status:'pending'}).session(session))fail(409,'Review the submitted payment before rejecting this order.');
  current.status=data.status;current.note=data.note;await current.save({session});return current;
 });
 res.json(order);
});
module.exports=router;
