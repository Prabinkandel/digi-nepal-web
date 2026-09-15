const router=require('express').Router();
const admin=require('../middleware/adminAuth');
const User=require('../models/User'),Order=require('../models/Order'),Product=require('../models/Product'),Payment=require('../models/Payment'),Audit=require('../models/Audit');
const {z,id,flag,fail,query,page,searchFilter}=require('../utils/validation');
router.use(admin);
router.get('/stats',async(req,res)=>{
 const [totalUsers,totalOrders,pendingOrders,totalProducts,verified,pendingPayments,recentOrders]=await Promise.all([User.countDocuments(),Order.countDocuments(),Order.countDocuments({status:'pending'}),Product.countDocuments({is_active:1}),Payment.aggregate([{$match:{status:'verified'}},{$group:{_id:null,total:{$sum:'$amount'}}}]),Payment.countDocuments({status:'pending'}),Order.find().sort({created_at:-1}).limit(5).select('-_id -__v').lean()]);
 const settings=await require('../utils/settings').getSettings();
 res.json({totalUsers,totalOrders,pendingOrders,totalProducts,revenue:verified[0]?.total||0,pendingPayments,recentOrders,setup:{email:require('../utils/mailer').configured(),payment_qr:!!settings.payment_qr_url,policies:!!(settings.terms&&settings.privacy&&settings.refunds),mfa:req.user.mfa_enabled}});
});
router.get('/audit',async(req,res)=>{
 const q=query(req);res.json(await page(Audit,{...searchFilter(q.search,['actor_id','action','target'])},q));
});
router.get('/',async(req,res)=>{
 const q=query(req),filter={...searchFilter(q.search,['name','email'])};
 if(q.status)filter.is_active=q.status==='active'?1:0;
 res.json(await page(User,filter,q,'id name email role is_active mfa_enabled created_at'));
});
router.put('/:id',async(req,res)=>{
 const data=z.object({role:z.enum(['user','editor','admin']).optional(),is_active:flag.optional()}).strict().parse(req.body);
 const userId=id.parse(req.params.id);
 const user=await User.findOne({id:userId});
 if(!user)fail(404,'Account not found.');
 if(user.id===req.user.id)fail(403,'You cannot change your own role or disable your own account.');
 // Other administrator accounts are intentionally protected from demotion/disable.
 if(user.role==='admin'&&(data.role&&data.role!=='admin'||data.is_active===0))fail(403,'Administrator recovery requires the server operator.');
 const result=await User.findOneAndUpdate({id:userId},{$set:data,$inc:{auth_version:1}},{new:true}).select('id name email role is_active mfa_enabled');
 res.json(result);
});
module.exports=router;
